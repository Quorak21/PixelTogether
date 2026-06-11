import { beginSession } from '../../services/session/sessionLifecycle.js';
import { scheduleSessionEnd } from '../../services/session/sessionTimer.js';
import {
  handleCastVote,
  handleCloseVote,
  handleEndParty,
  handleShowResults,
} from '../../services/vote/voteLifecycle.js';

// entrée WR, inscription, startGame, vote — tout ce qui se passe hors canvas
export function registerWaitingRoomHandlers(socket, deps) {
  const { io, store, constants, participants, payloads, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { LABEL_MIN, LABEL_MAX, PSEUDO_REGEX } = constants;
  const {
    isAvatarColorValid,
    getParticipantRole,
    isRegistered,
    removePlayerFromEvent,
  } = participants;
  const { buildWaitingRoomState, toPublicPlayer } = payloads;
  const { emitGameStarted } = lifecycle;

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

    // enterWaitingRoom bloqué si session en cours — les joueurs restent en jeu
    if (event.status === 'started') {
      const error = 'La partie a déjà commencé.';
      if (typeof callback === 'function') callback({ error });
      socket.emit('waitingRoomError', { error });
      return;
    }

    const role = getParticipantRole(event, socket.id);
    socket.data.role = role;
    socket.data.eventId = eventId;
    socket.join(eventId);

    const state = buildWaitingRoomState(event, socket.id);
    socket.emit('waitingRoomState', state);
    if (typeof callback === 'function') callback({ ...state });
  });

  socket.on('registerPlayer', (data, callback) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (event.status === 'started' || event.partyStarted) {
      return callback({ error: 'La partie a déjà commencé.' });
    }

    if (isRegistered(event, socket.id)) {
      return callback({ error: 'Vous êtes déjà enregistré.' });
    }

    const pseudo = typeof data?.pseudo === 'string' ? data.pseudo.trim() : '';
    if (!PSEUDO_REGEX.test(pseudo)) {
      return callback({
        error: `Le pseudo doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
      });
    }

    const avatarColor = typeof data?.avatarColor === 'string' ? data.avatarColor.toLowerCase() : '';
    if (!isAvatarColorValid(avatarColor)) {
      return callback({ error: 'Couleur avatar invalide.' });
    }

    const role = getParticipantRole(event, socket.id);

    if (role === 'manager') {
      event.managerProfile = { pseudo, avatarColor };
    } else {
      event.players.push({
        socketId: socket.id,
        pseudo,
        avatarColor,
        role: 'player',
      });
    }

    socket.data.role = role;
    socket.data.eventId = eventId;

    const state = buildWaitingRoomState(event, socket.id);
    socket.to(eventId).emit('waitingRoomUpdated', { players: state.players });
    callback({ ...state });
  });

  socket.on('startGame', (data, callback) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (socket.id !== event.manager) {
      return callback({ error: 'Seul le manager peut démarrer la partie.' });
    }

    if (event.status !== 'waiting') {
      return callback({ error: 'La partie est déjà lancée.' });
    }

    if (event.activeVote?.status === 'open') { // vote ouvert = session suivante bloquée
      return callback({ error: 'Clôturez le vote avant de démarrer la session.' });
    }

    if (!event.managerProfile) {
      return callback({ error: 'Le manager doit compléter son profil avant de démarrer.' });
    }

    if (!event.partyStarted && event.players.length < 2) {
      return callback({ error: 'Au moins 2 joueurs sont requis pour démarrer.' });
    }

    event.activeVote = null;
    event.partyStarted = true;
    event.name = event.themes[event.currentSession - 1];
    event.status = 'started';
    beginSession(event, deps);
    scheduleSessionEnd(event, io);
    emitGameStarted(io, event);
    callback({ eventId, status: 'started' });
  });

  socket.on('castVote', (data, callback) => {
    handleCastVote(socket, data, callback, deps);
  });

  socket.on('closeVote', (data, callback) => {
    handleCloseVote(socket, data, callback, deps);
  });

  socket.on('showResults', (data, callback) => {
    handleShowResults(socket, data, callback, deps);
  });

  socket.on('endParty', (data, callback) => {
    handleEndParty(socket, data, callback, deps);
  });

  socket.on('leaveWaitingRoom', (data) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || socket.id === event.manager) {
      return;
    }

    const removed = removePlayerFromEvent(event, socket.id);
    socket.leave(eventId);
    socket.data.eventId = undefined;

    if (removed && event.status === 'waiting') {
      io.to(eventId).emit('waitingRoomUpdated', {
        players: event.players.map(toPublicPlayer),
      });
    }
  });
}
