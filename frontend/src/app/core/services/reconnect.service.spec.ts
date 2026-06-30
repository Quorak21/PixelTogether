import '@angular/compiler';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReconnectService } from './reconnect.service';
import { SessionTokenService } from './session-token.service';
import { SocketService } from './socket.service';
import { UiStateService } from './ui-state.service';
import { GridStatePayload } from '../../types/entities';
import { WaitingRoomStatePayload } from '../../types/socket-payloads';

function mockGridState(overrides: Partial<GridStatePayload> = {}): GridStatePayload {
  return {
    eventId: 'EVT1',
    groupCode: 'GRP1',
    groupIndex: 1,
    groupLabel: 'G1',
    partyName: 'Test',
    theme: 'Theme',
    name: 'Theme',
    pixels: { '1,1': '#ff0000' },
    width: 75,
    height: 75,
    colors: ['#ff0000'],
    role: 'player',
    teammates: [],
    ...overrides,
  };
}

function mockWaitingRoomState(
  overrides: Partial<WaitingRoomStatePayload> = {},
): WaitingRoomStatePayload {
  return {
    roomId: 'EVT1',
    eventId: 'EVT1',
    partyName: 'Party',
    theme: 'Theme',
    name: 'Theme',
    themes: ['Theme'],
    gameMode: 'competitive',
    sessionCount: 1,
    currentSession: 1,
    status: 'waiting',
    role: 'player',
    managerProfile: null,
    players: [],
    isRegistered: true,
    wrMode: 'players',
    voteCandidates: [],
    playerId: 'player-1',
    token: 'tok-abc',
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

const socketHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

function emitSocketEvent(event: string, ...args: unknown[]): void {
  for (const handler of socketHandlers[event] ?? []) {
    handler(...args);
  }
}

describe('ReconnectService', () => {
  let service: ReconnectService;
  let sessionToken: SessionTokenService;
  let emitWithAck: ReturnType<typeof vi.fn>;
  let routerMock: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    for (const key of Object.keys(socketHandlers)) {
      delete socketHandlers[key];
    }

    emitWithAck = vi.fn();
    routerMock = {
      url: '/',
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    const injector = Injector.create({
      providers: [
        ReconnectService,
        SessionTokenService,
        UiStateService,
        { provide: Router, useValue: routerMock },
        {
          provide: SocketService,
          useValue: {
            on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
              socketHandlers[event] ??= [];
              socketHandlers[event].push(handler);
            }),
            off: vi.fn(),
            emit: vi.fn(),
            emitWithAck: emitWithAck,
            isConnected: () => true,
            id: () => 'sock-1',
          },
        },
      ],
    });

    service = injector.get(ReconnectService);
    sessionToken = injector.get(SessionTokenService);
  });

  function saveSession(overrides: Partial<Parameters<SessionTokenService['save']>[0]> = {}): void {
    sessionToken.save({
      token: 'tok-abc',
      playerId: 'player-1',
      role: 'player',
      eventId: 'EVT1',
      groupCode: 'GRP1',
      expiresAt: Date.now() + 60_000,
      ...overrides,
    });
  }

  it('should keep session on network error when keepSessionOnNetworkError is true', async () => {
    saveSession();
    emitWithAck.mockRejectedValueOnce(new Error('timeout'));

    const result = await service.reconnect({ keepSessionOnNetworkError: true });

    expect(result).toBeNull();
    expect(sessionToken.read()?.token).toBe('tok-abc');
  });

  it('should clear session on network error by default', async () => {
    saveSession();
    emitWithAck.mockRejectedValueOnce(new Error('timeout'));

    const result = await service.reconnect();

    expect(result).toBeNull();
    expect(sessionToken.read()).toBeNull();
  });

  it('should resync grid in place after transport reconnect on game route', async () => {
    saveSession();
    routerMock.url = '/game/evt1/grp1';

    const gridState = mockGridState();

    emitWithAck.mockResolvedValue({
      phase: 'game',
      eventId: 'EVT1',
      groupCode: 'GRP1',
      role: 'player',
      playerId: 'player-1',
      token: 'tok-abc',
      expiresAt: Date.now() + 60_000,
      gridState,
    });

    const gridHandler = vi.fn();
    service.setGridResyncHandler(gridHandler);

    emitSocketEvent('disconnect');
    emitSocketEvent('connect');

    await vi.waitFor(() => {
      expect(emitWithAck).toHaveBeenCalledWith('reconnectSession', { token: 'tok-abc' });
      expect(gridHandler).toHaveBeenCalledWith(gridState);
    });
  });

  it('should not resync on first connect without prior disconnect', async () => {
    saveSession();
    routerMock.url = '/game/evt1/grp1';

    emitSocketEvent('connect');

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(emitWithAck).not.toHaveBeenCalled();
  });

  it('should navigate to landing when party is gone after transport reconnect', async () => {
    saveSession();
    routerMock.url = '/room/evt1';

    emitWithAck.mockResolvedValue({ error: 'PARTY_GONE' });

    emitSocketEvent('disconnect');
    emitSocketEvent('connect');

    await vi.waitFor(() => {
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
    });
    expect(sessionToken.read()).toBeNull();
  });

  it('should resync waiting room state in place', async () => {
    saveSession({ role: 'player', groupCode: null });
    routerMock.url = '/room/evt1';

    const waitingState = mockWaitingRoomState({ role: 'player' });

    emitWithAck.mockResolvedValue({
      phase: 'waiting',
      eventId: 'EVT1',
      role: 'player',
      playerId: 'player-1',
      token: 'tok-abc',
      expiresAt: Date.now() + 60_000,
      waitingRoomState: waitingState,
    });

    const wrHandler = vi.fn();
    service.setWaitingRoomResyncHandler(wrHandler);

    emitSocketEvent('disconnect');
    emitSocketEvent('connect');

    await vi.waitFor(() => {
      expect(wrHandler).toHaveBeenCalledWith(waitingState);
    });
  });
});
