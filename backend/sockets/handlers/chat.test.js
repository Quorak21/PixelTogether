import test from 'node:test';
import assert from 'node:assert';
import { registerGameHandlers } from './game.handlers.js';
import { activeEvents } from '../../store/eventStore.js';
import { CHAT_MAX_MESSAGES } from '../../config/constants.js';

function buildChatDeps() {
  return {
    io: { to() { return { emit() {} }; } },
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
      getParticipantPseudo: () => 'Alice',
      isManager: (event, socket) =>
        socket.id === event.manager || socket.data?.playerId === event.managerPlayerId,
    },
    payloads: { toChatMessage: (_e, _g, entry) => entry },
    preview: {},
  };
}

test('chat — autorisation membre/manager et rejet intrus', () => {
  const eventId = 'CHATT1';
  const groupCode = '2222';

  activeEvents[eventId] = {
    id: eventId,
    manager: 'manager_socket_id',
    managerPlayerId: 'manager_player_id',
    players: [{ socketId: 'member_socket_id', playerId: 'member_player_id', pseudo: 'Alice', assignedColors: ['#000'] }],
    groups: {
      [groupCode]: {
        groupCode,
        players: [{ socketId: 'member_socket_id', playerId: 'member_player_id', pseudo: 'Alice', assignedColors: ['#000'] }],
        chatMessages: [],
      },
    },
  };

  const deps = buildChatDeps();
  const group = activeEvents[eventId].groups[groupCode];

  const intruderHandlers = {};
  registerGameHandlers({
    id: 'intruder_socket_id',
    data: { playerId: 'intruder' },
    on(event, handler) { intruderHandlers[event] = handler; },
    emit() {},
  }, deps);
  intruderHandlers['sendMessage']({ eventId, groupCode, message: 'hack' });
  assert.strictEqual(group.chatMessages.length, 0);

  const memberHandlers = {};
  registerGameHandlers({
    id: 'member_socket_id',
    data: { playerId: 'member_player_id' },
    on(event, handler) { memberHandlers[event] = handler; },
    emit() {},
  }, deps);
  memberHandlers['sendMessage']({ eventId, groupCode, message: 'Hello' });
  assert.strictEqual(group.chatMessages.length, 1);

  const managerHandlers = {};
  registerGameHandlers({
    id: 'manager_socket_id',
    data: { playerId: 'manager_player_id' },
    on(event, handler) { managerHandlers[event] = handler; },
    emit() {},
  }, deps);
  managerHandlers['sendMessage']({ eventId, groupCode, message: 'Boss here' });
  assert.strictEqual(group.chatMessages.length, 2);

  delete activeEvents[eventId];
});
