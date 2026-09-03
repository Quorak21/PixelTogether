import crypto from 'crypto';
import {
  validateToken,
  issueSession,
  hasActiveSessionOnOtherEvent,
  setSessionConnected,
  getSessionByPlayerId,
  isBannedFromEvent,
  recordRoomKick,
  detachSessionFromEvent,
  reattachSessionToEvent,
} from '../../../services/reconnect/sessionToken.js';
import {
  remapSocket,
  clearManagerDisconnectTimer,
  isAvatarColorValid,
  getParticipantRole,
  isRegistered,
  removePlayerFromEvent,
  isManager,
  resolvePlayerId,
  addPendingPlayer,
  removePendingPlayer,
} from '../../../services/event/participants.js';
import { validateGuestRegistration } from '../../../services/event/gameMode.js';
import { guardAck } from '../socketGuards.js';

const BAN_ERROR = 'Vous avez été exclu de cette partie.';
const KICK_MESSAGE = "Vous avez été retiré de la salle d'attente par le manager.";

function attachSessionFields(state, session) {
  return {
    ...state,
    playerId: session.playerId,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export function handleWaitingRoomEntry(socket, event, eventId, data, deps) {
  const { payloads } = deps;
  const { buildWaitingRoomState } = payloads;
  const token = typeof data?.token === 'string' ? data.token.trim() : '';

  if (token) {
    if (hasActiveSessionOnOtherEvent(token, eventId)) {
      return { error: 'Vous êtes déjà dans une autre partie.' };
    }

    const session = validateToken(token);
    if (session) {
      if (isBannedFromEvent(session, eventId)) {
        return { error: BAN_ERROR };
      }

      if (session.eventId === eventId) {
        remapSocket(event, session.playerId, socket.id);
        setSessionConnected(session.playerId, true, socket.id);
        if (session.role === 'manager') {
          clearManagerDisconnectTimer(event);
        }
        event.lastActivityAt = Date.now();

        socket.data.playerId = session.playerId;
        socket.data.role = session.role;
        socket.data.eventId = eventId;
        socket.join(eventId);

        const state = attachSessionFields(
          buildWaitingRoomState(event, socket.id, session.playerId),
          session,
        );
        return { state };
      }

      if (session.eventId === null) {
        const capacityError = validateGuestRegistration(event);
        if (capacityError) {
          return capacityError;
        }

        reattachSessionToEvent(session, event);
        remapSocket(event, session.playerId, socket.id);
        setSessionConnected(session.playerId, true, socket.id);
        event.lastActivityAt = Date.now();

        socket.data.playerId = session.playerId;
        socket.data.role = session.role;
        socket.data.eventId = eventId;
        socket.join(eventId);

        const state = attachSessionFields(
          buildWaitingRoomState(event, socket.id, session.playerId),
          session,
        );
        return { state };
      }
    }
  }

  if (token && validateToken(token)) {
    return { error: 'Vous êtes déjà dans une autre partie.' };
  }

  const capacityError = validateGuestRegistration(event);
  if (capacityError) {
    return capacityError;
  }

  const playerId = crypto.randomUUID();
  const issued = issueSession(event, {
    playerId,
    role: 'player',
    socketId: socket.id,
  });
  event.lastActivityAt = Date.now();

  socket.data.playerId = playerId;
  socket.data.role = 'player';
  socket.data.eventId = eventId;
  socket.join(eventId);

  const state = {
    ...buildWaitingRoomState(event, socket.id, playerId),
    ...issued,
  };

  return { state };
}

export function registerWaitingPhaseHandlers(socket, deps) {
  const { io, store, constants, payloads } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { PSEUDO_MIN, PSEUDO_MAX, PSEUDO_REGEX } = constants;
  const { buildWaitingRoomState, buildWaitingRoomLists } = payloads;

  socket.on('enterWaitingRoom', (data, callback) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    if (!eventId) {
      const error = 'Code de partie invalide.';
      if (typeof callback === 'function') callback({ error });
      socket.emit('waitingRoomError', { error });
      return;
    }

    const event = activeEvents[eventId];
    if (!event) {
      const error = "La partie n'existe pas.";
      if (typeof callback === 'function') callback({ error });
      socket.emit('waitingRoomError', { error });
      return;
    }

    if (event.status === 'started') {
      const error = 'La partie a déjà commencé.';
      if (typeof callback === 'function') callback({ error });
      socket.emit('waitingRoomError', { error });
      return;
    }

    const entry = handleWaitingRoomEntry(socket, event, eventId, data, deps);
    if (entry.error) {
      if (typeof callback === 'function') callback({ error: entry.error });
      socket.emit('waitingRoomError', { error: entry.error });
      return;
    }

    let state = entry.state;
    const playerId = state.playerId ?? socket.data?.playerId;
    if (
      playerId &&
      !isManager(event, socket) &&
      !isRegistered(event, socket.id, playerId)
    ) {
      addPendingPlayer(event, { playerId, socketId: socket.id });
      const lists = buildWaitingRoomLists(event);
      state = { ...state, ...lists };
      socket.to(eventId).emit('waitingRoomUpdated', lists);
    }

    socket.emit('waitingRoomState', state);
    if (typeof callback === 'function') callback({ ...state });
  });

  socket.on('registerPlayer', (data, callback) => {
    if (!guardAck(callback)) return;
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (event.status === 'started' || event.partyStarted) {
      return callback({ error: 'La partie a déjà commencé.' });
    }

    const playerId = socket.data?.playerId ?? resolvePlayerId(event, socket.id);
    if (!playerId) {
      return callback({ error: 'Session invalide. Rejoignez la salle d\'attente.' });
    }

    const playerSession = getSessionByPlayerId(playerId);
    if (playerSession && isBannedFromEvent(playerSession, eventId)) {
      return callback({ error: BAN_ERROR });
    }

    if (isRegistered(event, socket.id, playerId)) {
      return callback({ error: 'Vous êtes déjà enregistré.' });
    }

    const pseudo = typeof data?.pseudo === 'string' ? data.pseudo.trim() : '';
    if (!PSEUDO_REGEX.test(pseudo)) {
      return callback({
        error: `Le pseudo doit contenir entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères.`,
      });
    }

    const avatarColor = typeof data?.avatarColor === 'string' ? data.avatarColor.toLowerCase() : '';
    if (!isAvatarColorValid(avatarColor)) {
      return callback({ error: 'Couleur avatar invalide.' });
    }

    const role = getParticipantRole(event, socket.id, playerId);

    if (role === 'manager') {
      event.managerProfile = { pseudo, avatarColor };
    } else {
      const guestError = validateGuestRegistration(event);
      if (guestError) {
        return callback(guestError);
      }

      event.players.push({
        playerId,
        socketId: socket.id,
        pseudo,
        avatarColor,
        role: 'player',
      });
    }

    socket.data.role = role;
    socket.data.eventId = eventId;
    socket.data.playerId = playerId;

    removePendingPlayer(event, { playerId });

    const state = buildWaitingRoomState(event, socket.id, playerId);
    socket.to(eventId).emit('waitingRoomUpdated', buildWaitingRoomLists(event));
    callback({ ...state });
  });

  socket.on('kickPlayer', (data, callback) => {
    if (!guardAck(callback)) return;

    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (!isManager(event, socket)) {
      return callback({ error: 'Action réservée au manager.' });
    }

    if (event.status === 'started' || event.partyStarted) {
      return callback({ error: 'La partie a déjà commencé.' });
    }

    const targetPlayerId = typeof data?.playerId === 'string' ? data.playerId.trim() : '';
    if (!targetPlayerId || targetPlayerId === event.managerPlayerId) {
      return callback({ error: 'Joueur introuvable.' });
    }

    const target = event.players.find((player) => player.playerId === targetPlayerId);
    if (!target) {
      return callback({ error: 'Joueur introuvable.' });
    }

    const session = getSessionByPlayerId(targetPlayerId);
    let banned = false;
    if (session) {
      ({ banned } = recordRoomKick(session, eventId));
      detachSessionFromEvent(session, event);
    }

    removePlayerFromEvent(event, target.socketId, targetPlayerId);

    const message = banned ? BAN_ERROR : KICK_MESSAGE;
    const targetSocket = io.sockets.sockets.get(target.socketId);
    if (targetSocket) {
      targetSocket.emit('playerKicked', { roomId: eventId, message, banned });
      targetSocket.leave(eventId);
      targetSocket.data.eventId = undefined;
      targetSocket.data.playerId = undefined;
      targetSocket.data.role = undefined;
    }

    event.lastActivityAt = Date.now();
    io.to(eventId).emit('waitingRoomUpdated', buildWaitingRoomLists(event));
    callback({ ok: true });
  });

  socket.on('leaveWaitingRoom', (data, callback) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || isManager(event, socket)) {
      if (typeof callback === 'function') {
        callback({ error: 'Action non autorisée.' });
      }
      return;
    }

    if (event.partyStarted) {
      if (typeof callback === 'function') {
        callback({ error: 'Utilisez leaveParty pour quitter une partie en cours.' });
      }
      return;
    }

    const playerId = socket.data?.playerId ?? resolvePlayerId(event, socket.id);
    const session = playerId ? getSessionByPlayerId(playerId) : null;
    const removed = removePlayerFromEvent(event, socket.id, playerId);
    const removedPending = removePendingPlayer(event, { playerId, socketId: socket.id });

    if (session) {
      detachSessionFromEvent(session, event);
    }

    socket.leave(eventId);
    socket.data.eventId = undefined;
    socket.data.playerId = undefined;

    if (removed || removedPending) {
      io.to(eventId).emit('waitingRoomUpdated', buildWaitingRoomLists(event));
    }

    if (typeof callback === 'function') {
      callback({ ok: true, soft: true });
    }
  });
}
