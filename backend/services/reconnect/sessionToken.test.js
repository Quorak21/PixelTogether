import test from 'node:test';
import assert from 'node:assert';
import {
  issueSession,
  validateToken,
  purgePlayerSession,
  purgeEventSessions,
  hasActiveSessionOnOtherEvent,
  playerSessions,
  tokenIndex,
} from './sessionToken.js';

function clearGlobals() {
  for (const k of Object.keys(playerSessions)) delete playerSessions[k];
  for (const k of Object.keys(tokenIndex)) delete tokenIndex[k];
}

test('sessionToken — émission, validation et expiration', () => {
  clearGlobals();
  const event = { id: 'EVT123', sessionCount: 2, sessionDurationMinutes: 5 };
  const { token } = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1', groupCode: 'g_1' });

  const session = validateToken(token);
  assert.strictEqual(session.playerId, 'p_1');
  assert.strictEqual(session.groupCode, 'g_1');
  assert.strictEqual(validateToken('unknown'), null);

  playerSessions['p_1'].expiresAt = Date.now() - 1000;
  assert.strictEqual(validateToken(token), null);
});

test('sessionToken — purge et détection session sur autre event', () => {
  clearGlobals();
  const event = { id: 'EVT1', sessionCount: 2, sessionDurationMinutes: 5, sessionsByToken: {} };
  const { token } = issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
  issueSession(event, { playerId: 'p_2', role: 'player', socketId: 's_2' });

  assert.strictEqual(hasActiveSessionOnOtherEvent(token, 'EVT2'), true);
  assert.strictEqual(hasActiveSessionOnOtherEvent(token, 'EVT1'), false);

  purgePlayerSession('p_1');
  assert.strictEqual(playerSessions['p_1'], undefined);
  assert.strictEqual(tokenIndex[token], undefined);

  issueSession(event, { playerId: 'p_1', role: 'player', socketId: 's_1' });
  purgeEventSessions(event);
  assert.strictEqual(Object.keys(playerSessions).length, 0);
  assert.deepStrictEqual(event.sessionsByToken, {});
});
