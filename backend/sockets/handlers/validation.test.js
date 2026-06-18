import test from 'node:test';
import assert from 'node:assert';
import { registerSocketHandlers } from '../register.js';
import { registerWaitingRoomHandlers } from './waitingRoom.handlers.js';
import { activeEvents } from '../../store/eventStore.js';

const mockDeps = {
  io: {
    to() { return { emit() {} }; }
  },
  store: {
    activeEvents: {},
    normalizeEventId: (id) => id,
    normalizeGroupCode: (code) => code,
    groupRoomName: (id, code) => `${id}:${code}`,
    getGroup: () => null,
  },
  constants: {
    MAX_ACTIVE_EVENTS: 50,
    LABEL_MIN: 3,
    LABEL_MAX: 30,
    LABEL_REGEX: /^.{3,30}$/s,
    SESSION_DURATION_MIN: 1,
    SESSION_DURATION_MAX: 20,
    SESSION_DURATION_DEFAULT: 15,
    COOP_SESSION_COUNT_MIN: 1,
    COMPETITIVE_SESSION_COUNT_MIN: 3,
    GRID_SIZE: 75,
    PIXEL_COLOR_REGEX: /^#[0-9a-fA-F]{6}$/,
    MESSAGE_REGEX: /^.{1,300}$/,
    PIXEL_COOLDOWN_MS: 0,
    CHAT_COOLDOWN_MS: 0,
    CHAT_MAX_MESSAGES: 750,
    PSEUDO_MIN: 3,
    PSEUDO_MAX: 20,
    PSEUDO_REGEX: /^.{3,20}$/s,
  },
  payloads: {
    buildEventLobbyPayload: () => ({}),
    buildWaitingRoomState: () => ({ players: [] }),
    toPublicPlayer: (p) => p,
    toChatMessage: (e, g, entry) => entry,
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
  }
};

test('validation middleware - rejects non-object or null payloads', () => {
  // Mock du Socket client avec support de la chaîne de middlewares
  const mockSocket = {
    id: 's_test',
    data: {},
    emit() {},
    on(event, handler) {},
    middlewares: [],
    use(middleware) {
      this.middlewares.push(middleware);
    },
    runMiddlewares(packet, onComplete) {
      let index = 0;
      const next = (err) => {
        if (err) return;
        if (index < this.middlewares.length) {
          const middleware = this.middlewares[index++];
          middleware(packet, next);
        } else {
          onComplete();
        }
      };
      next();
    }
  };

  const mockIo = {
    on(event, handler) {
      if (event === 'connection') {
        handler(mockSocket);
      }
    }
  };

  registerSocketHandlers(mockIo, mockDeps);

  // 1. Envoi d'un payload valide (un objet)
  let handlerCalled = false;
  mockSocket.runMiddlewares(['testEvent', { foo: 'bar' }, () => {}], () => {
    handlerCalled = true;
  });
  assert.ok(handlerCalled, 'Le middleware aurait dû laisser passer un objet valide.');

  // 2. Envoi d'un payload invalide (chaîne de caractères)
  let callbackResponse = null;
  let nextCalled = false;
  mockSocket.runMiddlewares(['testEvent', 'not-an-object', (res) => { callbackResponse = res; }], () => {
    nextCalled = true;
  });
  assert.ok(!nextCalled, 'Le middleware n\'aurait pas dû appeler next() pour une chaîne.');
  assert.deepStrictEqual(callbackResponse, { error: 'Format de requête invalide.' });

  // 3. Envoi d'un payload invalide (null)
  callbackResponse = null;
  nextCalled = false;
  mockSocket.runMiddlewares(['testEvent', null, (res) => { callbackResponse = res; }], () => {
    nextCalled = true;
  });
  assert.ok(!nextCalled, 'Le middleware n\'aurait pas dû appeler next() pour null.');
  assert.deepStrictEqual(callbackResponse, { error: 'Format de requête invalide.' });

  // 4. Envoi d'un payload absent (undefined)
  callbackResponse = null;
  nextCalled = false;
  mockSocket.runMiddlewares(['testEvent', undefined, (res) => { callbackResponse = res; }], () => {
    nextCalled = true;
  });
  assert.ok(!nextCalled, 'Le middleware n\'aurait pas dû appeler next() pour undefined.');
  assert.deepStrictEqual(callbackResponse, { error: 'Format de requête invalide.' });
});

test('pseudo length validation - max 20 characters', () => {
  const eventId = 'VALT1';
  
  // Initialisation de la partie
  activeEvents[eventId] = {
    id: eventId,
    status: 'waiting',
    partyStarted: false,
    players: [],
    manager: 'manager_socket_id',
    managerPlayerId: 'manager_player_id',
  };

  const testDeps = {
    ...mockDeps,
    store: {
      ...mockDeps.store,
      activeEvents
    }
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
    }
  };

  registerWaitingRoomHandlers(mockSocket, testDeps);

  const registerPlayerHandler = registeredHandlers['registerPlayer'];
  assert.ok(registerPlayerHandler, 'Le handler registerPlayer aurait dû être enregistré.');

  // 1. Pseudo valide (10 caractères)
  let response = null;
  registerPlayerHandler({
    eventId,
    pseudo: 'ValidName1',
    avatarColor: '#ff0000',
  }, (res) => {
    response = res;
  });
  assert.ok(response && !response.error, 'Un pseudo valide de 10 caractères devrait être accepté.');

  // Nettoyage joueur inscrit pour test suivant
  activeEvents[eventId].players = [];

  // 2. Pseudo trop court (2 caractères)
  response = null;
  registerPlayerHandler({
    eventId,
    pseudo: 'Ab',
    avatarColor: '#ff0000',
  }, (res) => {
    response = res;
  });
  assert.deepStrictEqual(response, { error: 'Le pseudo doit contenir entre 3 et 20 caractères.' });

  // 3. Pseudo trop long (21 caractères)
  response = null;
  registerPlayerHandler({
    eventId,
    pseudo: 'A'.repeat(21),
    avatarColor: '#ff0000',
  }, (res) => {
    response = res;
  });
  assert.deepStrictEqual(response, { error: 'Le pseudo doit contenir entre 3 et 20 caractères.' });

  // 4. Pseudo à la limite supérieure exacte (20 caractères)
  response = null;
  registerPlayerHandler({
    eventId,
    pseudo: 'A'.repeat(20),
    avatarColor: '#ff0000',
  }, (res) => {
    response = res;
  });
  assert.ok(response && !response.error, 'Un pseudo de 20 caractères devrait être accepté.');

  // Nettoyage global
  delete activeEvents[eventId];
});
