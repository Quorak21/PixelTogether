import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTokenService } from '../services/session-token.service';
import { sessionGuard } from './session.guard';

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

function mockRoute(params: Record<string, string>): ActivatedRouteSnapshot {
  return { params, paramMap: { get: (key: string) => params[key] ?? null } } as ActivatedRouteSnapshot;
}

describe('sessionGuard', () => {
  let sessionToken: SessionTokenService;
  let homeUrl: UrlTree;
  let injector: Injector;

  beforeEach(() => {
    homeUrl = { toString: () => '/' } as UrlTree;
    injector = Injector.create({
      providers: [
        SessionTokenService,
        { provide: Router, useValue: { parseUrl: () => homeUrl } },
      ],
    });
    sessionToken = injector.get(SessionTokenService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('redirige si session absente ou eventId/groupCode incorrect', () => {
    const run = (params: Record<string, string>) =>
      runInInjectionContext(injector, () => sessionGuard(mockRoute(params), {} as never));

    expect(run({ eventId: 'EVT1' })).toBe(homeUrl);

    sessionToken.save({
      token: 'tok', playerId: 'p1', role: 'player', eventId: 'EVT1', groupCode: 'G1',
      expiresAt: Date.now() + 60_000,
    });
    expect(run({ eventId: 'OTHER', groupCode: 'G1' })).toBe(homeUrl);
    expect(run({ eventId: 'EVT1', groupCode: 'G2' })).toBe(homeUrl);
  });

  it('autorise session valide, spectateur lobby et manager', () => {
    const run = (params: Record<string, string>) =>
      runInInjectionContext(injector, () => sessionGuard(mockRoute(params), {} as never));

    sessionToken.save({
      token: 'tok', playerId: 'p1', role: 'player', eventId: 'EVT1', groupCode: 'G1',
      expiresAt: Date.now() + 60_000,
    });
    expect(run({ eventId: 'evt1', groupCode: 'G1' })).toBe(true);

    sessionToken.save({
      token: 'tok', playerId: 'p1', role: 'player', eventId: 'EVT1', groupCode: null,
      expiresAt: Date.now() + 60_000,
    });
    expect(run({ eventId: 'EVT1', groupCode: 'G2' })).toBe(true);

    sessionToken.save({
      token: 'tok', playerId: 'p1', role: 'manager', eventId: 'EVT1', groupCode: null,
      expiresAt: Date.now() + 60_000,
    });
    expect(run({ eventId: 'EVT1', groupCode: 'G1' })).toBe(true);
  });
});
