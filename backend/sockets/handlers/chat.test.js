import test from 'node:test';
import assert from 'node:assert';
import { registerGameHandlers } from './game.handlers.js';
import { activeEvents } from '../../store/eventStore.js';
import { CHAT_MAX_MESSAGES } from '../../config/constants.js';
import { clearPartyChat } from '../../services/chat/partyChat.js';

test('chat history - circular buffer maximum message count', () => {
  const eventId = 'CHATT1';
  const groupCode = '2222';
  
  // Initialisation de la partie et du groupe de test
  activeEvents[eventId] = {
    id: eventId,
    partyName: 'Test Party',
    name: 'Theme',
    players: [
      { socketId: 's_1', playerId: 'p_1', pseudo: 'Alice', avatarColor: '#ff0000', assignedColors: ['#000000'] }
    ],
    groups: {
      [groupCode]: {
        groupCode,
        groupIndex: 1,
        players: [
          { socketId: 's_1', playerId: 'p_1', pseudo: 'Alice', avatarColor: '#ff0000', assignedColors: ['#000000'] }
        ],
        chatMessages: [],
      }
    }
  };

  // Mock du Socket client
  const registeredHandlers = {};
  const mockSocket = {
    id: 's_1',
    data: { playerId: 'p_1' },
    on(event, handler) {
      registeredHandlers[event] = handler;
    },
    emit() {}
  };

  // Mock des dépendances injectées (deps)
  const mockDeps = {
    io: {
      to() {
        return {
          emit() {}
        };
      }
    },
    store: {
      activeEvents,
      normalizeEventId: (id) => id,
      normalizeGroupCode: (code) => code,
      groupRoomName: (id, code) => `${id}:${code}`,
      getGroup: (event, code) => event?.groups?.[code]
    },
    constants: {
      GRID_SIZE: 75,
      PIXEL_COLOR_REGEX: /^#[0-9a-fA-F]{6}$/,
      MESSAGE_REGEX: /^.{1,300}$/,
      PIXEL_COOLDOWN_MS: 0,
      CHAT_COOLDOWN_MS: 0,
      CHAT_MAX_MESSAGES
    },
    participants: {
      getParticipantPseudo: () => 'Alice',
      isManager: () => false
    },
    payloads: {
      toChatMessage: (event, group, entry) => entry
    },
    preview: {}
  };

  registerGameHandlers(mockSocket, mockDeps);

  const sendMessageHandler = registeredHandlers['sendMessage'];
  assert.ok(sendMessageHandler, 'Le handler sendMessage aurait dû être enregistré.');

  // Envoi de CHAT_MAX_MESSAGES + 5 messages
  for (let i = 1; i <= CHAT_MAX_MESSAGES + 5; i++) {
    sendMessageHandler({
      eventId,
      groupCode,
      message: `Message #${i}`
    });
  }

  const group = activeEvents[eventId].groups[groupCode];
  assert.strictEqual(group.chatMessages.length, CHAT_MAX_MESSAGES, `L'historique de chat ne devrait pas dépasser ${CHAT_MAX_MESSAGES} messages.`);
  
  // Le premier message restant doit être le 6ème (les messages 1 à 5 ayant été décalés et supprimés)
  assert.strictEqual(group.chatMessages[0].message, 'Message #6');
  assert.strictEqual(group.chatMessages[CHAT_MAX_MESSAGES - 1].message, `Message #${CHAT_MAX_MESSAGES + 5}`);

  // Nettoyage global
  delete activeEvents[eventId];
});

test('chat authorization - only members and managers can send/retrieve messages', () => {
  const eventId = 'CHATT2';
  const groupCode = '3333';
  
  // Initialisation de la partie et du groupe de test
  activeEvents[eventId] = {
    id: eventId,
    partyName: 'Test Party',
    name: 'Theme',
    manager: 'manager_socket_id',
    managerPlayerId: 'manager_player_id',
    players: [
      { socketId: 'member_socket_id', playerId: 'member_player_id', pseudo: 'Alice', avatarColor: '#ff0000', assignedColors: ['#000000'] }
    ],
    groups: {
      [groupCode]: {
        groupCode,
        groupIndex: 1,
        players: [
          { socketId: 'member_socket_id', playerId: 'member_player_id', pseudo: 'Alice', avatarColor: '#ff0000', assignedColors: ['#000000'] }
        ],
        chatMessages: [],
      }
    }
  };

  // Mock des dépendances injectées (deps)
  const mockDeps = {
    io: {
      to() {
        return {
          emit() {}
        };
      }
    },
    store: {
      activeEvents,
      normalizeEventId: (id) => id,
      normalizeGroupCode: (code) => code,
      groupRoomName: (id, code) => `${id}:${code}`,
      getGroup: (event, code) => event?.groups?.[code]
    },
    constants: {
      GRID_SIZE: 75,
      PIXEL_COLOR_REGEX: /^#[0-9a-fA-F]{6}$/,
      MESSAGE_REGEX: /^.{1,300}$/,
      PIXEL_COOLDOWN_MS: 0,
      CHAT_COOLDOWN_MS: 0,
      CHAT_MAX_MESSAGES
    },
    participants: {
      getParticipantPseudo: () => 'Alice',
      isManager: (event, socket) => {
        return socket.id === event.manager || socket.data?.playerId === event.managerPlayerId;
      }
    },
    payloads: {
      toChatMessage: (event, group, entry) => entry
    },
    preview: {}
  };

  // 1. Test avec un intrus (non membre, non manager)
  const intruderSocketEmitCalls = [];
  const intruderHandlers = {};
  const intruderSocket = {
    id: 'intruder_socket_id',
    data: { playerId: 'intruder_player_id' },
    on(event, handler) {
      intruderHandlers[event] = handler;
    },
    emit(event, payload) {
      intruderSocketEmitCalls.push({ event, payload });
    }
  };

  registerGameHandlers(intruderSocket, mockDeps);

  // Essai d'envoi de message par l'intrus
  intruderHandlers['sendMessage']({
    eventId,
    groupCode,
    message: 'Hello'
  });

  const group = activeEvents[eventId].groups[groupCode];
  assert.strictEqual(group.chatMessages.length, 0, "L'intrus n'aurait pas dû pouvoir ajouter un message.");

  // Essai de récupération de l'historique par l'intrus
  intruderHandlers['getChatMessages']({
    eventId,
    groupCode
  });
  assert.strictEqual(
    intruderSocketEmitCalls.find(call => call.event === 'chatMessages'),
    undefined,
    "L'intrus n'aurait pas dû recevoir l'historique de chat."
  );

  // 2. Test avec le manager de la partie
  const managerSocketEmitCalls = [];
  const managerHandlers = {};
  const managerSocket = {
    id: 'manager_socket_id',
    data: { playerId: 'manager_player_id' },
    on(event, handler) {
      managerHandlers[event] = handler;
    },
    emit(event, payload) {
      managerSocketEmitCalls.push({ event, payload });
    }
  };

  registerGameHandlers(managerSocket, mockDeps);

  // Envoi de message par le manager
  managerHandlers['sendMessage']({
    eventId,
    groupCode,
    message: 'Hello from manager'
  });
  assert.strictEqual(group.chatMessages.length, 1, "Le manager aurait dû pouvoir envoyer un message.");
  assert.strictEqual(group.chatMessages[0].message, 'Hello from manager');

  // Récupération de l'historique par le manager
  managerHandlers['getChatMessages']({
    eventId,
    groupCode
  });
  const managerChatEmit = managerSocketEmitCalls.find(call => call.event === 'chatMessages');
  assert.ok(managerChatEmit, "Le manager aurait dû pouvoir récupérer l'historique.");
  assert.strictEqual(managerChatEmit.payload.length, 1);

  // 3. Test avec un membre légitime du groupe
  const memberSocketEmitCalls = [];
  const memberHandlers = {};
  const memberSocket = {
    id: 'member_socket_id',
    data: { playerId: 'member_player_id' },
    on(event, handler) {
      memberHandlers[event] = handler;
    },
    emit(event, payload) {
      memberSocketEmitCalls.push({ event, payload });
    }
  };

  registerGameHandlers(memberSocket, mockDeps);

  // Envoi de message par le membre
  memberHandlers['sendMessage']({
    eventId,
    groupCode,
    message: 'Hello from member'
  });
  assert.strictEqual(group.chatMessages.length, 2, "Le membre aurait dû pouvoir envoyer un message.");
  assert.strictEqual(group.chatMessages[1].message, 'Hello from member');

  // Récupération de l'historique par le membre
  memberHandlers['getChatMessages']({
    eventId,
    groupCode
  });
  const memberChatEmit = memberSocketEmitCalls.find(call => call.event === 'chatMessages');
  assert.ok(memberChatEmit, "Le membre aurait dû pouvoir récupérer l'historique.");
  assert.strictEqual(memberChatEmit.payload.length, 2);

  // Nettoyage global
  delete activeEvents[eventId];
});

test('party chat - scope party send, retrieve and clear', () => {
  const eventId = 'CHATP1';

  activeEvents[eventId] = {
    id: eventId,
    partyName: 'Test Party',
    name: 'Theme',
    manager: 'manager_socket_id',
    managerPlayerId: 'manager_player_id',
    managerProfile: { pseudo: 'Boss', avatarColor: '#ff0000' },
    players: [
      {
        socketId: 'member_socket_id',
        playerId: 'member_player_id',
        pseudo: 'Alice',
        avatarColor: '#00ff00',
      },
    ],
    partyChatMessages: [],
    groups: {},
  };

  const partyEmitCalls = [];
  const mockDeps = {
    io: {
      to(room) {
        return {
          emit(event, payload) {
            partyEmitCalls.push({ room, event, payload });
          },
        };
      },
    },
    store: {
      activeEvents,
      normalizeEventId: (id) => id,
      normalizeGroupCode: (code) => code,
      groupRoomName: (id, code) => `${id}:${code}`,
      getGroup: (event, code) => event?.groups?.[code],
    },
    constants: {
      GRID_SIZE: 75,
      PIXEL_COLOR_REGEX: /^#[0-9a-fA-F]{6}$/,
      MESSAGE_REGEX: /^.{1,300}$/,
      PIXEL_COOLDOWN_MS: 0,
      CHAT_COOLDOWN_MS: 0,
      CHAT_MAX_MESSAGES,
    },
    participants: {
      getParticipantPseudo: (event, socketId) =>
        socketId === 'manager_socket_id' ? 'Boss' : 'Alice',
      isManager: (event, socket) =>
        socket.id === event.manager || socket.data?.playerId === event.managerPlayerId,
    },
    payloads: {
      toChatMessage: (_event, _group, entry) => entry,
    },
    preview: {},
  };

  const memberHandlers = {};
  const memberEmitCalls = [];
  const memberSocket = {
    id: 'member_socket_id',
    data: { playerId: 'member_player_id', role: 'player' },
    on(event, handler) {
      memberHandlers[event] = handler;
    },
    emit(event, payload) {
      memberEmitCalls.push({ event, payload });
    },
  };

  registerGameHandlers(memberSocket, mockDeps);

  memberHandlers['sendMessage']({
    eventId,
    scope: 'party',
    message: 'Salut tout le monde',
  });

  assert.strictEqual(activeEvents[eventId].partyChatMessages.length, 1);
  assert.strictEqual(activeEvents[eventId].partyChatMessages[0].message, 'Salut tout le monde');
  assert.ok(
    partyEmitCalls.some((call) => call.event === 'receiveMessage'),
    'Le message party aurait dû être diffusé.',
  );

  const intruderHandlers = {};
  const intruderSocket = {
    id: 'intruder_socket_id',
    data: { playerId: 'intruder_player_id' },
    on(event, handler) {
      intruderHandlers[event] = handler;
    },
    emit() {},
  };
  registerGameHandlers(intruderSocket, mockDeps);
  intruderHandlers['sendMessage']({ eventId, scope: 'party', message: 'hack' });
  assert.strictEqual(activeEvents[eventId].partyChatMessages.length, 1);

  memberHandlers['getChatMessages']({ eventId, scope: 'party' });
  const historyEmit = memberEmitCalls.find((call) => call.event === 'chatMessages');
  assert.ok(historyEmit, "L'historique party aurait dû être renvoyé.");
  assert.strictEqual(historyEmit.payload.length, 1);

  clearPartyChat(mockDeps.io, activeEvents[eventId]);
  assert.strictEqual(activeEvents[eventId].partyChatMessages.length, 0);
  assert.ok(
    partyEmitCalls.some((call) => call.event === 'chatMessages' && call.payload.length === 0),
    'Le clear party aurait dû émettre un historique vide.',
  );

  delete activeEvents[eventId];
});
