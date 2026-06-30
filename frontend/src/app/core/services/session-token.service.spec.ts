import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionTokenService, SessionTokenData } from './session-token.service';

// Mock localStorage for node environment
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
    }
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('SessionTokenService', () => {
  let service: SessionTokenService;

  beforeEach(() => {
    service = new SessionTokenService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and read session data', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    const read = service.read();
    expect(read).toEqual(data);
  });

  it('should return null if no session exists', () => {
    expect(service.read()).toBeNull();
  });

  it('should clear session data', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    service.clear();
    expect(service.read()).toBeNull();
  });

  it('should check if session is expired', () => {
    const activeData: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };
    service.save(activeData);
    expect(service.isExpired()).toBe(false);

    const expiredData: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() - 10000,
    };
    service.save(expiredData);
    expect(service.isExpired()).toBe(true);
  });

  it('should update group code', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    service.updateGroupCode('g_new');
    expect(service.read()?.groupCode).toBe('g_new');
  });

  it('should patch session from server', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: 10000,
    };

    service.save(data);
    
    // patch role and groupCode
    service.patchFromServer({
      role: 'manager',
      groupCode: null,
    });

    const read = service.read();
    expect(read).toEqual({
      token: 'tok123',
      playerId: 'p1',
      role: 'manager',
      eventId: 'evt1',
      groupCode: null,
      expiresAt: 10000,
    });
  });

  it('should set hasSessionSignal to true after save() with a valid session', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    expect(service.hasSessionSignal()).toBe(true);
  });

  it('should set hasSessionSignal to false after clear()', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    service.clear();
    expect(service.hasSessionSignal()).toBe(false);
  });

  it('should set hasSessionSignal to false after save() with an expired session', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'evt1',
      groupCode: 'g1',
      expiresAt: Date.now() - 10000,
    };

    service.save(data);
    expect(service.hasSessionSignal()).toBe(false);
  });

  it('should clear party binding but keep valid token after clearEventBinding()', () => {
    const data: SessionTokenData = {
      token: 'tok123',
      playerId: 'p1',
      role: 'player',
      eventId: 'EVT1',
      groupCode: 'g1',
      expiresAt: Date.now() + 10000,
    };

    service.save(data);
    expect(service.hasPartyBindingSignal()).toBe(true);

    service.clearEventBinding();

    expect(service.hasSessionSignal()).toBe(true);
    expect(service.hasPartyBindingSignal()).toBe(false);
    expect(service.read()?.eventId).toBe('');
    expect(service.read()?.groupCode).toBeNull();
  });
});
