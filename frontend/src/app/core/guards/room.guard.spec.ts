import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTokenData, SessionTokenService } from '../services/session-token.service';
import { roomGuard } from './room.guard';

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

function mockRoute(params: Record<string, string>): ActivatedRouteSnapshot {
  return {
    params,
    paramMap: {
      get: (key: string) => params[key] ?? null,
    },
  } as ActivatedRouteSnapshot;
}

function validSession(overrides: Partial<SessionTokenData> = {}): SessionTokenData {
  return {
    token: 'tok',
    playerId: 'p1',
    role: 'player',
    eventId: 'EVT1',
    groupCode: 'G1',
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

describe('roomGuard', () => {
  let sessionToken: SessionTokenService;
  let homeUrl: UrlTree;
  let injector: Injector;

  function runRoomGuard(params: Record<string, string>) {
    return runInInjectionContext(injector, () => roomGuard(mockRoute(params), {} as never));
  }

  beforeEach(() => {
    homeUrl = { toString: () => '/' } as UrlTree;
    injector = Injector.create({
      providers: [
        SessionTokenService,
        {
          provide: Router,
          useValue: { parseUrl: () => homeUrl },
        },
      ],
    });
    sessionToken = injector.get(SessionTokenService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('allows first visit without session', () => {
    expect(runRoomGuard({ roomId: 'EVT1' })).toBe(true);
  });

  it('redirects to / when session eventId does not match roomId', () => {
    sessionToken.save(validSession({ eventId: 'EVT1' }));
    expect(runRoomGuard({ roomId: 'OTHER' })).toBe(homeUrl);
  });

  it('allows when session eventId matches roomId', () => {
    sessionToken.save(validSession({ eventId: 'EVT1' }));
    expect(runRoomGuard({ roomId: 'evt1' })).toBe(true);
  });
});
