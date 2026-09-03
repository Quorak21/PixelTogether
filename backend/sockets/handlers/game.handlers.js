import { getSortedGroups } from '../../store/eventStore.js';
import { isCoop } from '../../services/event/gameMode.js';
import { canAccessPartyChat } from '../../services/chat/partyChat.js';
import { isRateLimited, guardAck } from './socketGuards.js';
import {
  isGroupMember,
  isGroupSpectator,
  resolveSocketPlayerId,
} from '../../services/session/groupAccess.js';
import { markPlayerFinished } from '../../services/session/groupFinish.js';

function upsertGroupVisitor(group, visitor) {
  if (!group.visitors) {
    group.visitors = [];
  }
  const index = group.visitors.findIndex(
    (entry) =>
      entry.socketId === visitor.socketId ||
      (visitor.playerId && entry.playerId === visitor.playerId),
  );
  if (index >= 0) {
    group.visitors[index] = visitor;
    return;
  }
  group.visitors.push(visitor);
}

function removeGroupVisitor(group, socketId, playerId) {
  if (!group.visitors?.length) {
    return;
  }
  group.visitors = group.visitors.filter(
    (entry) =>
      entry.socketId !== socketId && !(playerId && entry.playerId === playerId),
  );
}

function broadcastGroupVisitors(io, store, event, groupCode) {
  const { groupRoomName, getGroup } = store;
  const group = getGroup(event, groupCode);
  if (!group) return;
  const roomName = groupRoomName(event.id, groupCode);
  io.to(roomName).emit('groupVisitorsUpdated', {
    eventId: event.id,
    groupCode,
    visitors: group.visitors ?? [],
  });
}

// rejoint la room socket du groupe et renvoie gridState (pixels + couleurs assignées)
function handleJoinGroup(socket, data, deps) {
  const { io, store, constants, payloads, participants } = deps;
  const { activeEvents, normalizeEventId, normalizeGroupCode, groupRoomName, getGroup } = store;
  const { GRID_SIZE, CHAT_MAX_MESSAGES } = constants;
  const { buildGridStatePayload, toChatMessage, toSpectatorPublicPlayer } = payloads;
  const { findPlayerGroupByPlayerId, isManager, getParticipantPseudo } = participants;

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

  const manager = isManager(event, socket);
  let playerId = resolveSocketPlayerId(event, socket);
  if (playerId && !socket.data?.playerId) {
    socket.data.playerId = playerId;
  }
  const isMember = isGroupMember(group, socket, playerId);
  const spectator = isGroupSpectator(event, socket, group);

  if (group.finished) {
    socket.emit('joinRoomError', { error: 'Cette grille est terminée.' });
    return;
  }

  if (!isMember && !spectator) {
    socket.emit('joinRoomError', { error: "Vous n'appartenez pas à ce groupe." });
    return;
  }

  const role = manager ? 'manager' : 'player';
  const roomName = groupRoomName(eventId, groupCode);

  // Si l'utilisateur change de groupe (ex: le manager change de vue supervision)
  const oldGroupCode = socket.data.groupCode;
  if (oldGroupCode && oldGroupCode !== groupCode && socket.data.eventId === eventId) {
    const oldRoomName = groupRoomName(eventId, oldGroupCode);
    socket.leave(oldRoomName);
    const oldGroup = getGroup(event, oldGroupCode);
    if (oldGroup) {
      const wasMember = oldGroup.players.some(
        (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
      );
      if (!wasMember) {
        const oldPseudo = getParticipantPseudo(event, socket.id, oldGroup, playerId);
        const leaveEntry = {
          socketId: 'system',
          playerId: 'system',
          role: 'system',
          systemRole: socket.data.role === 'manager' ? 'manager' : 'player',
          pseudo: oldPseudo,
          message: 'a quitté la discussion.',
        };
        oldGroup.chatMessages.push(leaveEntry);
        if (oldGroup.chatMessages.length > CHAT_MAX_MESSAGES) {
          oldGroup.chatMessages.shift();
        }
        io.to(oldRoomName).emit('receiveMessage', toChatMessage(event, oldGroup, leaveEntry));
        removeGroupVisitor(oldGroup, socket.id, playerId);
        broadcastGroupVisitors(io, store, event, oldGroupCode);
      }
    }
  }

  socket.data.role = role;
  socket.data.eventId = eventId;
  socket.data.groupCode = groupCode;
  socket.data.playerId = manager ? event.managerPlayerId : (playerId ?? socket.data.playerId);
  socket.join(roomName);

  // Annonce système si ce n'est pas un membre du groupe (ex: manager spectateur)
  if (!isMember) {
    const pseudo = getParticipantPseudo(event, socket.id, group, socket.data.playerId);
    const joinEntry = {
      socketId: 'system',
      playerId: 'system',
      role: 'system',
      systemRole: manager ? 'manager' : 'player',
      pseudo,
      message: 'a rejoint la discussion.',
    };
    group.chatMessages.push(joinEntry);
    if (group.chatMessages.length > CHAT_MAX_MESSAGES) {
      group.chatMessages.shift();
    }
    io.to(roomName).emit('receiveMessage', toChatMessage(event, group, joinEntry));
    upsertGroupVisitor(group, toSpectatorPublicPlayer(event, socket, socket.data.playerId));
    broadcastGroupVisitors(io, store, event, groupCode);
  }

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

  function appendPartyMessage(event, entry) {
    if (!event.partyChatMessages) {
      event.partyChatMessages = [];
    }
    event.partyChatMessages.push(entry);
    if (event.partyChatMessages.length > CHAT_MAX_MESSAGES) {
      event.partyChatMessages.shift();
    }
  }

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

  socket.on('markFinished', (data, callback) => {
    if (!guardAck(callback)) return;

    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode ?? socket.data.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);

    if (!event || !group) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (event.status !== 'started') {
      return callback({ error: "La partie n'a pas encore démarré." });
    }

    if (isCoop(event)) {
      return callback({ error: 'Non disponible en mode coopératif.' });
    }

    if (isManager(event, socket)) {
      return callback({ error: 'Réservé aux joueurs.' });
    }

    if (group.finished) {
      return callback({ error: 'Ce groupe a déjà terminé.' });
    }

    const playerId = socket.data?.playerId;
    if (!isGroupMember(group, socket, playerId)) {
      return callback({ error: "Vous n'appartenez pas à ce groupe." });
    }

    const result = markPlayerFinished(io, event, group, playerId);
    if (!result) {
      return callback({ error: 'Impossible de marquer comme terminé.' });
    }

    callback({ ok: true, ...result });
  });

  socket.on('sendMessage', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event) return;

    if (data?.scope === 'party') {
      if (!canAccessPartyChat(event, socket)) return;
      if (isRateLimited(socket, 'sendMessage', CHAT_COOLDOWN_MS)) return;
      if (!data.message || typeof data.message !== 'string' || !MESSAGE_REGEX.test(data.message)) {
        return;
      }

      const playerId = socket.data?.playerId;
      const manager = isManager(event, socket);
      const message = data.message.trim();
      const role = manager ? 'manager' : 'player';
      const pseudo = getParticipantPseudo(event, socket.id, null, playerId);
      const entry = { socketId: socket.id, playerId, role, pseudo, message };
      appendPartyMessage(event, entry);
      io.to(eventId).emit('receiveMessage', toChatMessage(event, null, entry));
      return;
    }

    const groupCode = normalizeGroupCode(data?.groupCode);
    const group = getGroup(event, groupCode);

    if (!group) return;

    // Vérification de sécurité : le socket doit appartenir au groupe ou être le manager de la partie.
    const manager = isManager(event, socket);
    const playerId = socket.data?.playerId;
    const isMember = isGroupMember(group, socket, playerId);
    const spectator = isGroupSpectator(event, socket, group);

    if (!manager && !isMember && !spectator) return;

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

  socket.on('chatTyping', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const groupCode = normalizeGroupCode(data?.groupCode);
    const event = eventId ? activeEvents[eventId] : null;
    const group = getGroup(event, groupCode);

    if (!event || !group) return;

    const manager = isManager(event, socket);
    const playerId = socket.data?.playerId;
    const isMember = isGroupMember(group, socket, playerId);
    const spectator = isGroupSpectator(event, socket, group);

    if (!manager && !isMember && !spectator) return;

    if (isRateLimited(socket, 'chatTyping', 300)) return;

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('playerTyping', {
      socketId: socket.id,
      active: Boolean(data?.active),
    });
  });

  socket.on('getChatMessages', (data) => {
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event) return;

    if (data?.scope === 'party') {
      if (!canAccessPartyChat(event, socket)) return;
      const messages = event.partyChatMessages ?? [];
      socket.emit(
        'chatMessages',
        messages.map((entry) => toChatMessage(event, null, entry)),
      );
      return;
    }

    const groupCode = normalizeGroupCode(data?.groupCode);
    const group = getGroup(event, groupCode);
    if (!group) return;

    // Vérification de sécurité : le socket doit appartenir au groupe ou être le manager de la partie.
    const manager = isManager(event, socket);
    const playerId = socket.data?.playerId;
    const isMember = isGroupMember(group, socket, playerId);
    const spectator = isGroupSpectator(event, socket, group);

    if (!manager && !isMember && !spectator) return;

    if (spectator) {
      socket.emit('chatMessages', []);
      return;
    }

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

    if (group.finished || group.finishedPlayerIds?.includes(socket.data?.playerId)) {
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
    const groupCode = normalizeGroupCode(data?.groupCode ?? socket.data.groupCode);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) return;

    const group = getGroup(event, groupCode);
    const roomName = groupCode ? groupRoomName(eventId, groupCode) : null;

    if (roomName) {
      const playerId = socket.data?.playerId;
      const isMember = group ? group.players.some(
        (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
      ) : false;

      if (group && !isMember) {
        const pseudo = getParticipantPseudo(event, socket.id, group, playerId);
        const leaveEntry = {
          socketId: 'system',
          playerId: 'system',
          role: 'system',
          systemRole: socket.data.role === 'manager' || isManager(event, socket) ? 'manager' : 'player',
          pseudo,
          message: 'a quitté la discussion.',
        };
        group.chatMessages.push(leaveEntry);
        if (group.chatMessages.length > CHAT_MAX_MESSAGES) {
          group.chatMessages.shift();
        }
        io.to(roomName).emit('receiveMessage', toChatMessage(event, group, leaveEntry));
        removeGroupVisitor(group, socket.id, playerId);
        broadcastGroupVisitors(io, store, event, groupCode);
      } else if (isMember) {
        socket.to(roomName).emit('exitGame', { socketId: socket.id });
      }
      socket.leave(roomName);
    }

    if (socket.data.groupCode === groupCode) {
      socket.data.groupCode = undefined;
    }
  });

  socket.on('disconnect', () => {
    const eventId = socket.data?.eventId;
    const groupCode = socket.data?.groupCode;
    if (!eventId || !groupCode) return;

    const event = activeEvents[eventId];
    const group = event ? getGroup(event, groupCode) : null;
    if (!group) return;

    const playerId = socket.data?.playerId;
    const isMember = group.players.some(
      (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
    );

    const roomName = groupRoomName(eventId, groupCode);
    io.to(roomName).emit('playerTyping', { socketId: socket.id, active: false });

    if (!isMember) {
      const pseudo = getParticipantPseudo(event, socket.id, group, playerId);
      const leaveEntry = {
        socketId: 'system',
        playerId: 'system',
        role: 'system',
        systemRole: socket.data.role === 'manager' || isManager(event, socket) ? 'manager' : 'player',
        pseudo,
        message: 'a quitté la discussion.',
      };
      group.chatMessages.push(leaveEntry);
      if (group.chatMessages.length > CHAT_MAX_MESSAGES) {
        group.chatMessages.shift();
      }
      io.to(roomName).emit('receiveMessage', toChatMessage(event, group, leaveEntry));
      removeGroupVisitor(group, socket.id, playerId);
      broadcastGroupVisitors(io, store, event, groupCode);
    }
  });
}
