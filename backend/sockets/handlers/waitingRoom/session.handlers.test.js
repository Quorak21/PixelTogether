import test from 'node:test';
import assert from 'node:assert';
import { generateGroupCode } from '../../../store/eventStore.js';
import { registerSessionPhaseHandlers } from './session.handlers.js';

function buildStartableEvent(eventId, managerSocketId) {
  const players = Array.from({ length: 2 }, (_, i) => ({
    playerId: `player_${i}`,
    socketId: `socket_${i}`,
    pseudo: `Player${i}`,
    avatarColor: '#ff0000',
    role: 'player',
  }));

  return {
    id: eventId,
    status: 'waiting',
    partyStarted: false,
    gameMode: 'coop',
    currentSession: 1,
    sessionCount: 1,
    sessionDurationMinutes: 15,
    themes: ['Theme 1'],
    manager: managerSocketId,
    managerPlayerId: 'manager_player',
    managerProfile: { pseudo: 'Manager', avatarColor: '#00ff00' },
    players,
    groups: {},
    activeVote: null,
    coopWrMode: null,
  };
}

test('startGame rejects a second synchronous call (double-start guard)', () => {
  const eventId = 'AUDIT20';
  const managerSocketId = 'manager_socket';
  const event = buildStartableEvent(eventId, managerSocketId);
  const activeEvents = { [eventId]: event };

  let emitGameStartedCount = 0;

  const deps = {
    io: { to() { return { emit() {} }; } },
    store: {
      activeEvents,
      normalizeEventId: (id) => id,
      generateGroupCode,
    },
    preview: {
      updateGroupPreview() {},
    },
    lifecycle: {
      emitGameStarted() {
        emitGameStartedCount += 1;
      },
    },
  };

  const registered = {};
  const managerSocket = {
    id: managerSocketId,
    data: {},
    on(event, handler) {
      registered[event] = handler;
    },
  };
  registerSessionPhaseHandlers(managerSocket, deps);

  const startGame = registered.startGame;
  assert.ok(startGame, 'startGame handler should be registered');

  let firstResponse = null;
  let secondResponse = null;

  startGame({ roomId: eventId }, (res) => {
    firstResponse = res;
  });
  const groupsAfterFirst = { ...event.groups };

  startGame({ roomId: eventId }, (res) => {
    secondResponse = res;
  });

  assert.ok(firstResponse && !firstResponse.error, 'first startGame should succeed');
  assert.strictEqual(firstResponse.status, 'started');
  assert.ok(Object.keys(groupsAfterFirst).length > 0, 'beginSession should create groups');
  assert.deepStrictEqual(event.groups, groupsAfterFirst, 'groups should not be reshuffled on second call');
  assert.strictEqual(emitGameStartedCount, 1, 'emitGameStarted should run only once');
  assert.strictEqual(secondResponse?.error, 'La partie est déjà lancée.');
  assert.strictEqual(event.status, 'started');
  assert.strictEqual(event.partyStarted, true);
});
