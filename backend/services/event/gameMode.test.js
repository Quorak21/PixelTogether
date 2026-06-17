import test from 'node:test';
import assert from 'node:assert';
import {
  isCoop,
  isCompetitive,
  parseGameMode,
  validateSessionCountForMode,
  validateStartPlayerCount,
  validateGuestRegistration,
} from './gameMode.js';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../../config/constants.js';

test('gameMode - isCoop & isCompetitive', async (t) => {
  await t.test('detects coop correctly', () => {
    assert.strictEqual(isCoop({ gameMode: GAME_MODE_COOP }), true);
    assert.strictEqual(isCoop({ gameMode: GAME_MODE_COMPETITIVE }), false);
  });

  await t.test('detects competitive correctly', () => {
    assert.strictEqual(isCompetitive({ gameMode: GAME_MODE_COMPETITIVE }), true);
    assert.strictEqual(isCompetitive({ gameMode: GAME_MODE_COOP }), false);
    assert.strictEqual(isCompetitive({}), true); // default is competitive
  });
});

test('gameMode - parseGameMode', async (t) => {
  await t.test('parses valid game modes', () => {
    assert.strictEqual(parseGameMode(GAME_MODE_COOP), GAME_MODE_COOP);
    assert.strictEqual(parseGameMode(GAME_MODE_COMPETITIVE), GAME_MODE_COMPETITIVE);
    assert.strictEqual(parseGameMode('  coop  '), GAME_MODE_COOP);
  });

  await t.test('returns null for invalid game modes or defaults to competitive for non-strings', () => {
    assert.strictEqual(parseGameMode('invalid'), null);
    assert.strictEqual(parseGameMode(123), GAME_MODE_COMPETITIVE);
    assert.strictEqual(parseGameMode(null), GAME_MODE_COMPETITIVE);
  });
});

test('gameMode - validateSessionCountForMode', async (t) => {
  await t.test('validates session count in coop mode', () => {
    // Coop session range is 1 to 4
    assert.strictEqual(validateSessionCountForMode(GAME_MODE_COOP, 1), null);
    assert.strictEqual(validateSessionCountForMode(GAME_MODE_COOP, 4), null);
    
    const lowResult = validateSessionCountForMode(GAME_MODE_COOP, 0);
    assert.ok(lowResult && lowResult.error);
    
    const highResult = validateSessionCountForMode(GAME_MODE_COOP, 5);
    assert.ok(highResult && highResult.error);
  });

  await t.test('validates session count in competitive mode', () => {
    // Competitive session range is 3 to 8
    assert.strictEqual(validateSessionCountForMode(GAME_MODE_COMPETITIVE, 3), null);
    assert.strictEqual(validateSessionCountForMode(GAME_MODE_COMPETITIVE, 8), null);
    
    const lowResult = validateSessionCountForMode(GAME_MODE_COMPETITIVE, 2);
    assert.ok(lowResult && lowResult.error);
    
    const highResult = validateSessionCountForMode(GAME_MODE_COMPETITIVE, 9);
    assert.ok(highResult && highResult.error);
  });
});

test('gameMode - validateStartPlayerCount', async (t) => {
  await t.test('validates player count for starting in coop mode', () => {
    // Coop: 2 to 7 players
    const event = { gameMode: GAME_MODE_COOP, players: [] };
    
    // 0 players -> error
    assert.ok(validateStartPlayerCount(event)?.error);
    
    // 1 player -> error
    event.players = [{ socketId: 's1' }];
    assert.ok(validateStartPlayerCount(event)?.error);
    
    // 2 players -> ok
    event.players = [{ socketId: 's1' }, { socketId: 's2' }];
    assert.strictEqual(validateStartPlayerCount(event), null);

    // 7 players -> ok
    event.players = Array(7).fill({ socketId: 's' });
    assert.strictEqual(validateStartPlayerCount(event), null);

    // 8 players -> error
    event.players = Array(8).fill({ socketId: 's' });
    assert.ok(validateStartPlayerCount(event)?.error);
  });

  await t.test('validates player count for starting in competitive mode', () => {
    // Competitive: min 6 players
    const event = { gameMode: GAME_MODE_COMPETITIVE, players: [] };

    // 5 players -> error
    event.players = Array(5).fill({ socketId: 's' });
    assert.ok(validateStartPlayerCount(event)?.error);

    // 6 players -> ok
    event.players = Array(6).fill({ socketId: 's' });
    assert.strictEqual(validateStartPlayerCount(event), null);
  });
});

test('gameMode - validateGuestRegistration', async (t) => {
  await t.test('prevents registering too many players in coop mode', () => {
    const event = { gameMode: GAME_MODE_COOP, players: Array(6).fill({ socketId: 's' }) };
    assert.strictEqual(validateGuestRegistration(event), null);

    event.players = Array(7).fill({ socketId: 's' });
    assert.ok(validateGuestRegistration(event)?.error);
  });

  await t.test('does not block registration in competitive mode', () => {
    const event = { gameMode: GAME_MODE_COMPETITIVE, players: Array(100).fill({ socketId: 's' }) };
    assert.strictEqual(validateGuestRegistration(event), null);
  });
});
