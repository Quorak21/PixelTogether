import { getSortedGroups } from '../../store/eventStore.js';
import { isCoop } from '../../services/event/gameMode.js';
import { isRateLimited } from './socketGuards.js';

// rejoint la room socket du groupe et renvoie gridState (pixels + couleurs assignées)
function handleJoinGroup(socket, data, deps) {
  const { store, constants, payloads, participants } = deps;
  const { activeEvents, normalizeEventId, normalizeGroupCode, groupRoomName, getGroup } = store;
  const { GRID_SIZE } = constants;
  const { buildGridStatePayload } = payloads;
  const { findPlayerGroupByPlayerId, isManager } = participants;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const groupCode = normalizeGroupCode(data?.groupCode);

  if (!eventId || !groupCode) {
    socket.emit('joinRoomError', { error: 'Identifiant de sous-partie invalide.' });
    return;
  }

  const event = activeEvents[eventId];
  if (!event) {
    socket.emit('joinRoomError', { error: "La partie n'existe pas" });
    return;
  }

  if (event.status !== 'started') {
    socket.emit('joinRoomError', { error: "La partie n'a pas encore démarré." });
    return;
  }

  const group = getGroup(event, groupCode);
  if (!group) {
    socket.emit('joinRoomError', { error: "Cette sous-partie n'existe pas." });
    return;
  }

  const playerId = socket.data?.playerId;
  const manager = isManager(event, socket);
  const isMember = group.players.some(
    (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
  );

  if (!manager && !isMember) {
    socket.emit('joinRoomError', { error: "Vous n'appartenez pas à ce groupe." });
    return;
  }

  const role = manager ? 'manager' : 'player';
  const roomName = groupRoomName(eventId, groupCode);

  if (manager) {
    socket.data.playerId = event.managerPlayerId;
  }
  socket.data.role = role;
  socket.data.eventId = eventId;
  socket.data.groupCode = groupCode;
  socket.data.playerId = manager ? event.managerPlayerId : (playerId ?? socket.data.playerId);
  socket.join(roomName);

  const gridState = buildGridStatePayload(event, groupCode, socket, GRID_SIZE);
  if (gridState) {
    socket.emit('gridState', gridState);
  }
}

export function registerGameHandlers(socket, deps) {
  const { io, store, constants, participants, payloads, preview } = deps;
  const {
    activeEvents,
    normalizeEventId,
    normalizeGroupCode,
    groupRoomName,
    getGroup,
  } = store;
  const { GRID_SIZE, PIXEL_COLOR_REGEX, MESSAGE_REGEX, PIXEL_COOLDOWN_MS, CHAT_COOLDOWN_MS, CHAT_MAX_MESSAGES } =
    constants;
  const { findPlayerGroup, findPlayerGroupByPlayerId, getParticipantPseudo, isManager } = participants;
  const { toPublicPlayer, toChatMessage } = payloads;
  const { scheduleGroupPreviewUpdate } = preview;

  socket.on('joinGroup', (data) => handleJoinGroup(socket, data, deps));

  socket.on('joinRoom', (data) => { // raccourci joueur : auto-resolve son groupe assigné
    const eventId = normalizeEventId(data?.roomId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      socket.emit('joinRoomError', { error: "La partie n'existe pas" });
      return;
    }

    if (event.status !== 'started') {
      socket.emit('joinRoomError', { error: "La partie n'a pas encore démarré." });
      return;
    }

    if (isManager(event, socket)) {
      if (isCoop(event)) {
        const sorted = getSortedGroups(event);
        const groupCode = sorted[0]?.groupCode;
        if (groupCode) {
          handleJoinGroup(socket, { eventId, groupCode }, deps);
        }
        return;
      }
      socket.emit('joinRoomError', {
        error: 'Utilisez le lobby pour rejoindre une sous-partie.',
      });
      return;
    }

    const playerId = socket.data?.playerId;
    const assignment =
      findPlayerGroupByPlayerId(event, playerId) ?? findPlayerGroup(event, socket.id, playerId);
    if (!assignment) {
      socket.emit('joinRoomError', { error: "Vous n'êtes assigné à aucun groupe." });
      return;
    }

    handleJoinGroup(socket, { eventId, groupCode: assignment.groupCode }, deps);
  });

  socket.on('sendMessage', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);

    if (!event || !group) return;

    // Vérification de sécurité : le socket doit appartenir au groupe ou être le manager de la partie.
    const manager = isManager(event, socket);
    const playerId = socket.data?.playerId;
    const isMember = group.players.some(
      (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
    );

    if (!manager && !isMember) return;

    if (isRateLimited(socket, 'sendMessage', CHAT_COOLDOWN_MS)) return;

    if (!data.message || typeof data.message !== 'string' || !MESSAGE_REGEX.test(data.message)) {
      return;
    }

    const message = data.message.trim();
    const role = socket.data?.role ?? 'player';
    const pseudo = getParticipantPseudo(event, socket.id, group, playerId);
    const entry = { socketId: socket.id, playerId, role, pseudo, message };
    group.chatMessages.push(entry);
    if (group.chatMessages.length > CHAT_MAX_MESSAGES) {
      group.chatMessages.shift();
    }

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('receiveMessage', toChatMessage(event, group, entry));
  });

  socket.on('getChatMessages', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);
    if (!event || !group) return;

    // Vérification de sécurité : le socket doit appartenir au groupe ou être le manager de la partie.
    const manager = isManager(event, socket);
    const playerId = socket.data?.playerId;
    const isMember = group.players.some(
      (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
    );

    if (!manager && !isMember) return;

    socket.emit(
      'chatMessages',
      group.chatMessages.map((entry) => toChatMessage(event, group, entry)),
    );
  });

  socket.on('getPlayersList', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);
    if (!event || !group) return;

    const activePlayers = group.players.map((p) => p.socketId);
    if (event.manager) {
      activePlayers.push(event.manager);
    }

    socket.emit('playersList', {
      activePlayers: [...new Set(activePlayers)],
      managerSocketId: event.manager,
    });
  });

  socket.on('pixelPlaced', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);

    if (!event || !group) return;

    if (isRateLimited(socket, 'pixelPlaced', PIXEL_COOLDOWN_MS)) return;

    if (isManager(event, socket)) {
      const managerCanDraw = isCoop(event) && isManager(event, socket);
      if (!managerCanDraw) {
        return;
      }
    }

    if (!group.players.some((p) => p.socketId === socket.id || p.playerId === socket.data?.playerId)) {
      return;
    }

    if (
      !Number.isInteger(data.x) ||
      !Number.isInteger(data.y) ||
      data.x < 0 ||
      data.y < 0 ||
      data.x >= GRID_SIZE ||
      data.y >= GRID_SIZE ||
      !PIXEL_COLOR_REGEX.test(data.color)
    ) {
      return;
    }

    const player = group.players.find(
      (p) => p.socketId === socket.id || p.playerId === socket.data?.playerId,
    );
    const color = data.color.toLowerCase();
    if (!player?.assignedColors?.includes(color)) {
      return;
    }

    const pixelSpot = `${data.x},${data.y}`; // clé string, pas de tableau 2D
    group.pixels[pixelSpot] = color;

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('drawPixel', { x: data.x, y: data.y, color, eventId, groupCode });
    scheduleGroupPreviewUpdate(io, eventId, groupCode); // preview throttée pour lobby manager
  });

  socket.on('exitGame', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event || isManager(event, socket)) return;

    const roomName = groupCode ? groupRoomName(eventId, groupCode) : null;
    if (roomName) {
      socket.to(roomName).emit('exitGame', { socketId: socket.id });
      socket.leave(roomName);
    }
    socket.data.groupCode = undefined;
  });
}
