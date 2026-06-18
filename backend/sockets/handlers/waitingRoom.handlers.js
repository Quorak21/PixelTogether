import { beginSession } from '../../services/session/sessionLifecycle.js';
import { scheduleSessionEnd } from '../../services/session/sessionTimer.js';
import {
  handleCastVote,
  handleCloseVote,
  handleEndParty,
  handleShowResults,
} from '../../services/vote/voteLifecycle.js';
import { handleWaitingRoomEntry } from './reconnect.handlers.js';
import {
  removePlayerSessionFromEvent,
} from '../../services/reconnect/sessionToken.js';
import {
  isAvatarColorValid,
  getParticipantRole,
  isRegistered,
  removePlayerFromEvent,
  isManager,
  resolvePlayerId,
} from '../../services/event/participants.js';
import {
  isCoop,
  validateGuestRegistration,
  validateStartPlayerCount,
} from '../../services/event/gameMode.js';
import { guardAck } from './socketGuards.js';

// entrée WR, inscription, startGame, vote — tout ce qui se passe hors canvas

/**
 * Enregistre tous les handlers relatifs aux interactions dans la salle d'attente (Waiting Room).
 * Gère l'entrée en salle d'attente, l'enregistrement des profils (pseudo, avatar),
 * le démarrage du jeu par le manager, les votes, et le départ des joueurs.
 */
export function registerWaitingRoomHandlers(socket, deps) {
  const { io, store, constants, payloads, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { LABEL_MIN, LABEL_MAX, PSEUDO_REGEX } = constants;
  const { buildWaitingRoomState, toPublicPlayer } = payloads;
  const { emitGameStarted } = lifecycle;

  // Demande d'accès à la salle d'attente
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

    // enterWaitingRoom bloqué si session en cours — utiliser reconnectSession
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

  // Enregistrement final du profil du joueur (pseudo + couleur avatar)
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
        error: `Le pseudo doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
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

  // Démarrage effectif du jeu (manager uniquement)
  socket.on('startGame', (data, callback) => {
    if (!guardAck(callback)) return;
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (!isManager(event, socket)) {
      return callback({ error: 'Seul le manager peut démarrer la partie.' });
    }

    if (event.status !== 'waiting') {
      return callback({ error: 'La partie est déjà lancée.' });
    }

    if (event.activeVote?.status === 'open') {
      return callback({ error: 'Clôturez le vote avant de démarrer la session.' });
    }

    if (!event.managerProfile) {
      return callback({ error: 'Le manager doit compléter son profil avant de démarrer.' });
    }

    if (!event.partyStarted) {
      const playerCountError = validateStartPlayerCount(event);
      if (playerCountError) {
        return callback(playerCountError);
      }
    }

    event.activeVote = null;
    event.coopWrMode = null;
    event.partyStarted = true;
    event.theme = event.themes[event.currentSession - 1];
    event.status = 'started';
    beginSession(event, deps);
    if (!isCoop(event)) {
      scheduleSessionEnd(event, io);
    }
    emitGameStarted(io, event);
    callback({ eventId, status: 'started' });
  });

  // Vote pour une œuvre
  socket.on('castVote', (data, callback) => {
    handleCastVote(socket, data, callback, deps);
  });

  // Clôture des votes
  socket.on('closeVote', (data, callback) => {
    handleCloseVote(socket, data, callback, deps);
  });

  // Affichage du podium final
  socket.on('showResults', (data, callback) => {
    handleShowResults(socket, data, callback, deps);
  });

  // Clôture définitive de l'événement
  socket.on('endParty', (data, callback) => {
    handleEndParty(socket, data, callback, deps);
  });

  // Quitter volontairement la salle d'attente (joueur uniquement)
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
