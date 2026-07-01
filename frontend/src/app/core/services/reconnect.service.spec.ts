import '@angular/compiler';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReconnectService } from './reconnect.service';
import { SessionTokenService } from './session-token.service';
import { SocketService } from './socket.service';
import { UiStateService } from './ui-state.service';
import { GridStatePayload } from '../../types/entities';

const socketHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

function emitSocketEvent(event: string, ...args: unknown[]): void {
  for (const handler of socketHandlers[event] ?? []) handler(...args);
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ReconnectService', () => {
  let service: ReconnectService;
  let sessionToken: SessionTokenService;
  let emitWithAck: ReturnType<typeof vi.fn>;
  let routerMock: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];

    emitWithAck = vi.fn();
    routerMock = { url: '/game/evt1/grp1', navigateByUrl: vi.fn().mockResolvedValue(true) };

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
            emitWithAck,
            isConnected: () => true,
            id: () => 'sock-1',
          },
        },
      ],
    });

    service = injector.get(ReconnectService);
    sessionToken = injector.get(SessionTokenService);
    sessionToken.save({
      token: 'tok-abc', playerId: 'player-1', role: 'player', eventId: 'EVT1', groupCode: 'GRP1',
      expiresAt: Date.now() + 60_000,
    });
  });

  it('resync la grille après reconnect transport', async () => {
    const gridState: GridStatePayload = {
      eventId: 'EVT1', groupCode: 'GRP1', groupIndex: 1, groupLabel: 'G1',
      partyName: 'Test', theme: 'Theme', name: 'Theme',
      pixels: { '1,1': '#ff0000' }, width: 75, height: 75, colors: ['#ff0000'],
      role: 'player', teammates: [],
    };
    emitWithAck.mockResolvedValue({
      phase: 'game', eventId: 'EVT1', groupCode: 'GRP1', role: 'player',
      playerId: 'player-1', token: 'tok-abc', expiresAt: Date.now() + 60_000, gridState,
    });

    const gridHandler = vi.fn();
    service.setGridResyncHandler(gridHandler);
    emitSocketEvent('disconnect');
    emitSocketEvent('connect');
    await flushAsync();

    expect(emitWithAck).toHaveBeenCalledWith('reconnectSession', { token: 'tok-abc' });
    expect(gridHandler).toHaveBeenCalledWith(gridState);
  });

  it('efface session si partie terminée, la garde sur erreur réseau si demandé', async () => {
    emitWithAck.mockResolvedValueOnce({ error: 'PARTY_GONE' });
    emitSocketEvent('disconnect');
    emitSocketEvent('connect');
    await flushAsync();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
    expect(sessionToken.read()).toBeNull();

    sessionToken.save({
      token: 'tok-abc', playerId: 'player-1', role: 'player', eventId: 'EVT1', groupCode: 'GRP1',
      expiresAt: Date.now() + 60_000,
    });
    emitWithAck.mockRejectedValueOnce(new Error('timeout'));
    await service.reconnect({ keepSessionOnNetworkError: true });
    expect(sessionToken.read()?.token).toBe('tok-abc');
  });
});
