import test from 'node:test';
import assert from 'node:assert';
import { getWrMode, resolveReconnectPhase } from '../../../services/event/wrPhase.js';

test('getWrMode and resolveReconnectPhase stay aligned on WR phases', () => {
  const base = {
    status: 'waiting',
    partyStarted: false,
    gameMode: 'competitive',
    showingResults: false,
    activeVote: null,
    coopWrMode: null,
  };

  assert.strictEqual(getWrMode(base), 'players');
  assert.strictEqual(resolveReconnectPhase(base, 'player'), 'waiting');

  const voting = {
    ...base,
    partyStarted: true,
    activeVote: { status: 'open', sessionNumber: 1 },
  };
  assert.strictEqual(getWrMode(voting), 'voting');
  assert.strictEqual(resolveReconnectPhase(voting, 'player'), 'voting');

  const tieBreak = {
    ...base,
    partyStarted: true,
    activeVote: { status: 'tiebreak', sessionNumber: 1 },
  };
  assert.strictEqual(getWrMode(tieBreak), 'tieBreak');
  assert.strictEqual(resolveReconnectPhase(tieBreak, 'player'), 'tieBreak');

  const podium = {
    ...base,
    partyStarted: true,
    showingResults: true,
  };
  assert.strictEqual(getWrMode(podium), 'podium');
  assert.strictEqual(resolveReconnectPhase(podium, 'player'), 'podium');
});

test('registerWaitingRoomHandlers registers all 10 events', async () => {
  const { registerWaitingRoomHandlers } = await import('./register.js');

  const registered = {};
  const mockSocket = {
    on(event, handler) {
      registered[event] = handler;
    },
  };

  registerWaitingRoomHandlers(mockSocket, {
    io: { to() { return { emit() {} }; } },
    store: { activeEvents: {}, normalizeEventId: (id) => id },
    constants: { PSEUDO_MIN: 3, PSEUDO_MAX: 20, PSEUDO_REGEX: /^.{3,20}$/s },
    payloads: { buildWaitingRoomState: () => ({}), toPublicPlayer: (p) => p },
    lifecycle: { emitGameStarted: () => {} },
  });

  const expected = [
    'enterWaitingRoom',
    'registerPlayer',
    'kickPlayer',
    'leaveWaitingRoom',
    'startGame',
    'castVote',
    'closeVote',
    'showResults',
    'endParty',
    'requestExportZip',
  ];

  for (const event of expected) {
    assert.ok(registered[event], `handler manquant: ${event}`);
  }
});
