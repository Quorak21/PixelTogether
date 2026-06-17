import test from 'node:test';
import assert from 'node:assert';
import {
  computeExpiresAt,
  issueSession,
  validateToken,
  getSessionByPlayerId,
  updateSessionGroupCode,
  setSessionConnected,
  purgePlayerSession,
  purgeEventSessions,
  removePlayerSessionFromEvent,
  hasActiveSessionOnOtherEvent,
  playerSessions,
  tokenIndex,
} from './sessionToken.js';
import { RECONNECT_MARGIN_MINUTES } from '../../config/constants.js';

function clearGlobals() {
  for (const k of Object.keys(playerSessions)) delete playerSessions[k];
  for (const k of Object.keys(tokenIndex)) delete tokenIndex[k];
}

test('sessionToken - computeExpiresAt', () => {
  const event = { sessionCount: 3, sessionDurationMinutes: 10 };
  const expiresAt = computeExpiresAt(event);
  const expectedDiff = (3 * 10 + RECONNECT_MARGIN_MINUTES) * 60_000;
  const now = Date.now();
  
  // difference should be very close to expectedDiff (within 100ms)
  const actualDiff = expiresAt - now;
  assert.ok(Math.abs(actualDiff - expectedDiff) < 100);
});

test('sessionToken - issueSession', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  const res = issueSession(event, {
    playerId: 'p_1',
    role: 'player',
    socketId: 's_1',
    groupCode: 'g_1'
  });

  assert.strictEqual(res.playerId, 'p_1');
  assert.ok(typeof res.token === 'string');
  assert.ok(typeof res.expiresAt === 'number');

  // Verify registration in global storage
  assert.ok(playerSessions['p_1']);
  assert.strictEqual(playerSessions['p_1'].eventId, 'EVT123');
  assert.strictEqual(playerSessions['p_1'].role, 'player');
  assert.strictEqual(playerSessions['p_1'].groupCode, 'g_1');
  assert.strictEqual(playerSessions['p_1'].socketId, 's_1');
  assert.strictEqual(playerSessions['p_1'].connected, true);

  assert.ok(tokenIndex[res.token]);
  assert.deepStrictEqual(tokenIndex[res.token], { playerId: 'p_1', eventId: 'EVT123' });

  assert.ok(event.sessionsByToken);
  assert.strictEqual(event.sessionsByToken[res.token], 'p_1');
});

test('sessionToken - validateToken', async (t) => {
  await t.test('validates valid token', () => {
    clearGlobals();
    const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
    const res = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
    
    const session = validateToken(res.token);
    assert.ok(session);
    assert.strictEqual(session.playerId, 'p_1');
  });

  await t.test('returns null for unknown token', () => {
    clearGlobals();
    assert.strictEqual(validateToken('unknown_token'), null);
  });

  await t.test('returns null for expired token', () => {
    clearGlobals();
    const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
    const res = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
    
    // artificially expire the session
    playerSessions['p_1'].expiresAt = Date.now() - 1000;
    
    assert.strictEqual(validateToken(res.token), null);
  });
});

test('sessionToken - getSessionByPlayerId', async (t) => {
  await t.test('returns active session', () => {
    clearGlobals();
    const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
    issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });

    const session = getSessionByPlayerId('p_1');
    assert.ok(session);
    assert.strictEqual(session.playerId, 'p_1');
  });

  await t.test('returns null for expired or missing session', () => {
    clearGlobals();
    assert.strictEqual(getSessionByPlayerId('missing'), null);

    const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
    issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
    playerSessions['p_1'].expiresAt = Date.now() - 1000;

    assert.strictEqual(getSessionByPlayerId('p_1'), null);
  });
});

test('sessionToken - updateSessionGroupCode', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });

  updateSessionGroupCode('p_1', 'new_group');
  assert.strictEqual(playerSessions['p_1'].groupCode, 'new_group');
});

test('sessionToken - setSessionConnected', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });

  setSessionConnected('p_1', false);
  assert.strictEqual(playerSessions['p_1'].connected, false);

  setSessionConnected('p_1', true, 's_new');
  assert.strictEqual(playerSessions['p_1'].connected, true);
  assert.strictEqual(playerSessions['p_1'].socketId, 's_new');
});

test('sessionToken - purgePlayerSession', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  const res = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });

  purgePlayerSession('p_1');
  assert.strictEqual(playerSessions['p_1'], undefined);
  assert.strictEqual(tokenIndex[res.token], undefined);
});

test('sessionToken - purgeEventSessions', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  const res1 = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
  const res2 = issueSession(event, { playerId: 'p_2', role: 'player', socketId: 's_2' });

  purgeEventSessions(event);
  assert.strictEqual(playerSessions['p_1'], undefined);
  assert.strictEqual(playerSessions['p_2'], undefined);
  assert.strictEqual(tokenIndex[res1.token], undefined);
  assert.strictEqual(tokenIndex[res2.token], undefined);
  assert.deepStrictEqual(event.sessionsByToken, {});
});

test('sessionToken - removePlayerSessionFromEvent', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  const res = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });

  removePlayerSessionFromEvent(event, 'p_1');
  assert.strictEqual(playerSessions['p_1'], undefined);
  assert.strictEqual(tokenIndex[res.token], undefined);
  assert.strictEqual(event.sessionsByToken[res.token], undefined);
});

test('sessionToken - hasActiveSessionOnOtherEvent', () => {
  clearGlobals();
  const event1 = { id: 'EVT1', sessionCount: 2, sessionDurationMinutes: 5 };
  const res = issueSession(event1, { playerId: 'p_1', role: 'player', socketId: 's_1' });

  assert.strictEqual(hasActiveSessionOnOtherEvent(res.token, 'EVT1'), false);
  assert.strictEqual(hasActiveSessionOnOtherEvent(res.token, 'EVT2'), true);
  
  // expired token shouldn't count as active on other event
  playerSessions['p_1'].expiresAt = Date.now() - 1000;
  assert.strictEqual(hasActiveSessionOnOtherEvent(res.token, 'EVT2'), false);
});
