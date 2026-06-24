import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTokenData, SessionTokenService } from '../services/session-token.service';
import { sessionGuard } from './session.guard';

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

describe('sessionGuard', () => {
  let sessionToken: SessionTokenService;
  let homeUrl: UrlTree;
  let injector: Injector;

  function runSessionGuard(params: Record<string, string>) {
    return runInInjectionContext(injector, () =>
      sessionGuard(mockRoute(params), {} as never),
    );
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

  it('redirects to / when there is no session', () => {
    expect(runSessionGuard({ eventId: 'EVT1' })).toBe(homeUrl);
  });

  it('redirects to / when eventId does not match', () => {
    sessionToken.save(validSession({ eventId: 'EVT1' }));
    expect(runSessionGuard({ eventId: 'OTHER' })).toBe(homeUrl);
  });

  it('redirects to / when groupCode does not match for a player', () => {
    sessionToken.save(validSession({ groupCode: 'G1' }));
    expect(runSessionGuard({ eventId: 'EVT1', groupCode: 'G2' })).toBe(homeUrl);
  });

  it('allows manager without groupCode when route has groupCode', () => {
    sessionToken.save(
      validSession({
        role: 'manager',
        groupCode: null,
      }),
    );
    expect(runSessionGuard({ eventId: 'EVT1', groupCode: 'G1' })).toBe(true);
  });

  it('allows when session matches route params', () => {
    sessionToken.save(validSession());
    expect(runSessionGuard({ eventId: 'evt1', groupCode: 'G1' })).toBe(true);
  });
});
