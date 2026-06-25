import crypto from 'crypto';
import {
  validateToken,
  issueSession,
  hasActiveSessionOnOtherEvent,
  removePlayerSessionFromEvent,
  setSessionConnected,
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
} from '../../../services/event/participants.js';
import { validateGuestRegistration } from '../../../services/event/gameMode.js';
import { guardAck } from '../socketGuards.js';

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
    if (session && session.eventId === eventId) {
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
  const { buildWaitingRoomState, toPublicPlayer } = payloads;

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

    const state = entry.state;
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

    const state = buildWaitingRoomState(event, socket.id, playerId);
    socket.to(eventId).emit('waitingRoomUpdated', { players: state.players });
    callback({ ...state });
  });

  socket.on('leaveWaitingRoom', (data) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || isManager(event, socket)) {
      return;
    }

    const playerId = socket.data?.playerId ?? resolvePlayerId(event, socket.id);
    const removed = removePlayerFromEvent(event, socket.id, playerId);

    if (playerId) {
      removePlayerSessionFromEvent(event, playerId);
    }

    socket.leave(eventId);
    socket.data.eventId = undefined;
    socket.data.playerId = undefined;

    if (removed && event.status === 'waiting') {
      io.to(eventId).emit('waitingRoomUpdated', {
        players: event.players.map(toPublicPlayer),
      });
    }
  });
}
