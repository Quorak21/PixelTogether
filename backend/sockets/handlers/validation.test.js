import test from 'node:test';
import assert from 'node:assert';
import { registerWaitingRoomHandlers } from './waitingRoom.handlers.js';
import { activeEvents } from '../../store/eventStore.js';

const mockDeps = {
  io: {
    to() { return { emit() {} }; },
  },
  store: {
    activeEvents: {},
    normalizeEventId: (id) => id,
    normalizeGroupCode: (code) => code,
    groupRoomName: (id, code) => `${id}:${code}`,
    getGroup: () => null,
  },
  constants: {
    PSEUDO_MIN: 3,
    PSEUDO_MAX: 20,
    PSEUDO_REGEX: /^.{3,20}$/s,
  },
  payloads: {
    buildWaitingRoomState: () => ({ players: [], pendingPlayers: [] }),
    buildWaitingRoomLists: () => ({ players: [], pendingPlayers: [] }),
    toPublicPlayer: (p) => p,
  },
  participants: {
    findPlayerGroup: () => null,
    findPlayerGroupByPlayerId: () => null,
    getParticipantPseudo: () => '',
    isManager: () => false,
  },
  preview: {
    scheduleGroupPreviewUpdate: () => {},
  },
  lifecycle: {
    emitGameStarted: () => {},
    closeEvent: () => {},
  },
};

test('pseudo length validation — refuse trop court, accepte valide', () => {
  const eventId = 'VALT1';
  activeEvents[eventId] = {
    id: eventId,
    status: 'waiting',
    partyStarted: false,
    players: [],
    manager: 'manager_socket_id',
    managerPlayerId: 'manager_player_id',
  };

  const registeredHandlers = {};
  const mockSocket = {
    id: 's_player',
    data: { playerId: 'p_player' },
    on(event, handler) {
      registeredHandlers[event] = handler;
    },
    emit() {},
    to() {
      return { emit() {} };
    },
  };

  registerWaitingRoomHandlers(mockSocket, {
    ...mockDeps,
    store: { ...mockDeps.store, activeEvents },
  });

  const registerPlayer = registeredHandlers['registerPlayer'];
  assert.ok(registerPlayer);

  let response = null;
  registerPlayer({ eventId, pseudo: 'Ab', avatarColor: '#ff0000' }, (res) => {
    response = res;
  });
  assert.deepStrictEqual(response, { error: 'Le pseudo doit contenir entre 3 et 20 caractères.' });

  response = null;
  registerPlayer({ eventId, pseudo: 'ValidName', avatarColor: '#ff0000' }, (res) => {
    response = res;
  });
  assert.ok(response && !response.error);

  delete activeEvents[eventId];
});
