import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTokenService } from '../services/session-token.service';
import { roomGuard } from './room.guard';

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

describe('roomGuard', () => {
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

  it('autorise sans session ou eventId correspondant, redirige sinon', () => {
    const run = (roomId: string) =>
      runInInjectionContext(injector, () =>
        roomGuard({ params: { roomId }, paramMap: { get: () => roomId } } as ActivatedRouteSnapshot, {} as never),
      );

    expect(run('EVT1')).toBe(true);

    sessionToken.save({
      token: 'tok', playerId: 'p1', role: 'player', eventId: 'EVT1', groupCode: null,
      expiresAt: Date.now() + 60_000,
    });
    expect(run('evt1')).toBe(true);
    expect(run('OTHER')).toBe(homeUrl);
  });
});
