function handleJoinGroup(socket, data, deps) {
  const { store, constants, payloads } = deps;
  const { activeEvents, normalizeEventId, normalizeGroupCode, groupRoomName, getGroup } = store;
  const { GRID_SIZE } = constants;
  const { toGroupPlayer } = payloads;

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

  const isHost = socket.id === event.host;
  const isMember = group.players.some((p) => p.socketId === socket.id);

  if (!isHost && !isMember) {
    socket.emit('joinRoomError', { error: "Vous n'appartenez pas à ce groupe." });
    return;
  }

  const role = isHost ? 'host' : 'player';
  const roomName = groupRoomName(eventId, groupCode);
  const member = group.players.find((p) => p.socketId === socket.id);
  const playerColors = member?.assignedColors ?? [];

  socket.data.role = role;
  socket.data.eventId = eventId;
  socket.data.groupCode = groupCode;
  socket.join(roomName);

  socket.emit('gridState', {
    eventId,
    groupCode,
    groupIndex: group.groupIndex,
    groupLabel: `Groupe ${group.groupIndex}`,
    partyName: event.partyName,
    theme: event.name,
    pixels: group.pixels,
    width: GRID_SIZE,
    height: GRID_SIZE,
    name: event.name,
    colors: isHost ? [] : playerColors,
    role,
    teammates: group.players.map(toGroupPlayer),
  });
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
  const { GRID_SIZE, PIXEL_COLOR_REGEX, MESSAGE_REGEX } = constants;
  const { findPlayerGroup, getParticipantPseudo } = participants;
  const { toPublicPlayer, toChatMessage } = payloads;
  const { updateGroupPreview } = preview;

  socket.on('joinGroup', (data) => handleJoinGroup(socket, data, deps));

  socket.on('joinRoom', (data) => {
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

    if (socket.id === event.host) {
      socket.emit('joinRoomError', {
        error: 'Utilisez le lobby pour rejoindre une sous-partie.',
      });
      return;
    }

    const assignment = findPlayerGroup(event, socket.id);
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

    if (!data.message || typeof data.message !== 'string' || !MESSAGE_REGEX.test(data.message)) {
      return;
    }

    const message = data.message.trim();
    const pseudo = getParticipantPseudo(event, socket.id, group);
    const entry = { socketId: socket.id, pseudo, message };
    group.chatMessages.push(entry);

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('receiveMessage', toChatMessage(event, group, entry));
  });

  socket.on('getChatMessages', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);
    if (!group) return;

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
    if (event.host) {
      activePlayers.push(event.host);
    }

    socket.emit('playersList', {
      activePlayers: [...new Set(activePlayers)],
      hostSocketId: event.host,
    });
  });

  socket.on('pixelPlaced', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);

    if (!event || !group) return;

    if (socket.id === event.host) {
      return;
    }

    if (!group.players.some((p) => p.socketId === socket.id)) {
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

    const player = group.players.find((p) => p.socketId === socket.id);
    const color = data.color.toLowerCase();
    if (!player?.assignedColors?.includes(color)) {
      return;
    }

    const pixelSpot = `${data.x},${data.y}`;
    group.pixels[pixelSpot] = color;

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('drawPixel', { x: data.x, y: data.y, color, eventId, groupCode });
    updateGroupPreview(eventId, groupCode);
    io.to(eventId).emit('groupPreviewUpdated', {
      eventId,
      groupCode,
      image: group.image,
    });
  });

  socket.on('exitGame', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event || socket.id === event.host) return;

    const roomName = groupCode ? groupRoomName(eventId, groupCode) : null;
    if (roomName) {
      socket.to(roomName).emit('exitGame', { socketId: socket.id });
      socket.leave(roomName);
    }
    socket.data.groupCode = undefined;
  });
}
