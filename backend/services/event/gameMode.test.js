import test from 'node:test';
import assert from 'node:assert';
import {
  parseGameMode,
  validateSessionCountForMode,
  validateStartPlayerCount,
  validateGuestRegistration,
} from './gameMode.js';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../../config/constants.js';

test('gameMode — règles coop et compétitif', () => {
  assert.strictEqual(parseGameMode('  coop  '), GAME_MODE_COOP);
  assert.strictEqual(parseGameMode('invalid'), null);

  assert.strictEqual(validateSessionCountForMode(GAME_MODE_COOP, 4), null);
  assert.ok(validateSessionCountForMode(GAME_MODE_COOP, 5)?.error);
  assert.strictEqual(validateSessionCountForMode(GAME_MODE_COMPETITIVE, 3), null);
  assert.ok(validateSessionCountForMode(GAME_MODE_COMPETITIVE, 2)?.error);

  const coopEvent = { gameMode: GAME_MODE_COOP, players: [{ socketId: 's1' }] };
  assert.ok(validateStartPlayerCount(coopEvent)?.error);
  coopEvent.players.push({ socketId: 's2' });
  assert.strictEqual(validateStartPlayerCount(coopEvent), null);

  const competitiveEvent = { gameMode: GAME_MODE_COMPETITIVE, players: Array(5).fill({ socketId: 's' }) };
  assert.ok(validateStartPlayerCount(competitiveEvent)?.error);
  competitiveEvent.players.push({ socketId: 's6' });
  assert.strictEqual(validateStartPlayerCount(competitiveEvent), null);

  const cappedEvent = { gameMode: GAME_MODE_COMPETITIVE, players: Array(40).fill({ socketId: 's' }) };
  assert.ok(validateGuestRegistration(cappedEvent)?.error);
});
