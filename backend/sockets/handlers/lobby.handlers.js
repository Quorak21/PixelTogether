import { handleEndSession } from '../../services/session/sessionLifecycle.js';
import crypto from 'crypto';
import {
  issueSession,
  validateToken,
  hasActiveSessionOnOtherEvent,
} from '../../services/reconnect/sessionToken.js';
import { isManager } from '../../services/event/participants.js';
import {
  parseGameMode,
  validateSessionCountForMode,
} from '../../services/event/gameMode.js';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../../config/constants.js';
import { guardAck } from './socketGuards.js';

// création partie + vue lobby manager + arrêt session anticipé
export function registerLobbyHandlers(socket, deps) {
  const { io, store, constants, payloads } = deps;
  const { activeEvents, normalizeEventId } = store;
  const {
    LABEL_REGEX,
    LABEL_MIN,
    LABEL_MAX,
    SESSION_DURATION_MIN,
    SESSION_DURATION_MAX,
    SESSION_DURATION_DEFAULT,
    COOP_SESSION_COUNT_MIN,
    COMPETITIVE_SESSION_COUNT_MIN,
  } = constants;
  const { buildEventLobbyPayload } = payloads;

  socket.on('getEventLobby', (data, callback) => {
    const eventId = normalizeEventId(data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      const error = "La partie n'existe pas.";
      socket.emit('eventLobbyError', { error });
      if (typeof callback === 'function') callback({ error });
      return;
    }

    if (!isManager(event, socket)) {
      const error = 'Seul le manager peut accéder à ce lobby.';
      socket.emit('eventLobbyError', { error });
      if (typeof callback === 'function') callback({ error });
      return;
    }

    socket.data.playerId = event.managerPlayerId;
    socket.data.role = 'manager';
    socket.data.eventId = eventId;

    const payload = buildEventLobbyPayload(event);
    socket.emit('eventLobbyState', payload);
    if (typeof callback === 'function') callback(payload);
  });

  socket.on('newGrid', (data, callback) => { // nom historique — crée un Event, pas une grille
    if (!guardAck(callback)) return;
    const existingToken = typeof data?.token === 'string' ? data.token.trim() : '';
    if (existingToken && validateToken(existingToken)) {
      return callback({ error: 'Vous êtes déjà dans une partie.' });
    }

    const partyName = typeof data?.partyName === 'string' ? data.partyName.trim() : '';

    if (!LABEL_REGEX.test(partyName)) {
      return callback({
        error: `Le nom de partie doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
      });
    }

    const gameMode = parseGameMode(data?.gameMode);
    if (!gameMode) {
      return callback({ error: 'Mode de jeu invalide.' });
    }

    const managerParticipates = gameMode === GAME_MODE_COOP;

    let sessionDurationMinutes = null;
    if (gameMode === GAME_MODE_COMPETITIVE) {
      const rawDuration = data?.sessionDurationMinutes;
      const parsedDuration =
        typeof rawDuration === 'number' && Number.isInteger(rawDuration)
          ? rawDuration
          : typeof rawDuration === 'string'
            ? Number.parseInt(rawDuration, 10)
            : SESSION_DURATION_DEFAULT;
      sessionDurationMinutes = Number.isInteger(parsedDuration)
        ? parsedDuration
        : SESSION_DURATION_DEFAULT;

      if (
        sessionDurationMinutes < SESSION_DURATION_MIN ||
        sessionDurationMinutes > SESSION_DURATION_MAX
      ) {
        return callback({
          error: `La durée doit être entre ${SESSION_DURATION_MIN} et ${SESSION_DURATION_MAX} minutes.`,
        });
      }
    }

    let themes = [];
    if (Array.isArray(data?.themes) && data.themes.length > 0) {
      themes = data.themes.map((entry) => (typeof entry === 'string' ? entry.trim() : ''));
    } else {
      const legacyTheme = // rétrocompat ancien payload single-theme
        typeof data?.theme === 'string'
          ? data.theme.trim()
          : typeof data?.name === 'string'
            ? data.name.trim()
            : '';
      themes = legacyTheme ? [legacyTheme] : [];
    }

    const rawSessionCount = data?.sessionCount;
    const defaultSessionCount =
      gameMode === GAME_MODE_COOP ? COOP_SESSION_COUNT_MIN : COMPETITIVE_SESSION_COUNT_MIN;
    const parsedSessionCount =
      typeof rawSessionCount === 'number' && Number.isInteger(rawSessionCount)
        ? rawSessionCount
        : typeof rawSessionCount === 'string'
          ? Number.parseInt(rawSessionCount, 10)
          : themes.length || defaultSessionCount;
    const sessionCount =
      Number.isInteger(parsedSessionCount) && parsedSessionCount >= 1
        ? parsedSessionCount
        : themes.length || defaultSessionCount;

    const sessionCountError = validateSessionCountForMode(gameMode, sessionCount);
    if (sessionCountError) {
      return callback(sessionCountError);
    }

    if (themes.length !== sessionCount) {
      return callback({
        error: `Le nombre de thèmes (${themes.length}) doit correspondre au nombre de sessions (${sessionCount}).`,
      });
    }

    for (let i = 0; i < themes.length; i += 1) {
      if (!LABEL_REGEX.test(themes[i])) {
        return callback({
          error: `Le thème de la session ${i + 1} doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
        });
      }
    }

    const eventId = store.generateRoomCode();
    const firstTheme = themes[0];
    const managerPlayerId = crypto.randomUUID();

    activeEvents[eventId] = {
      id: eventId,
      manager: socket.id,
      managerPlayerId,
      partyName,
      name: firstTheme,
      themes,
      gameMode,
      managerParticipates,
      sessionCount,
      currentSession: 1,
      sessionDurationMinutes,
      sessionEndsAt: null,
      _sessionTimer: null,
      status: 'waiting',
      partyStarted: false,
      managerProfile: null,
      players: [],
      groups: {},
      sessionArchive: [],
      activeVote: null,
      playerVoteTotals: {},
      showingResults: false,
      coopWrMode: null,
      sessionsByToken: {},
    };

    const issued = issueSession(activeEvents[eventId], {
      playerId: managerPlayerId,
      role: 'manager',
      socketId: socket.id,
    });

    socket.data.role = 'manager';
    socket.data.eventId = eventId;
    socket.data.playerId = managerPlayerId;
    socket.join(eventId);

    callback({
      id: eventId,
      manager: socket.id,
      partyName,
      theme: firstTheme,
      name: firstTheme,
      gameMode,
      managerParticipates,
      role: 'manager',
      playerId: managerPlayerId,
      token: issued.token,
      expiresAt: issued.expiresAt,
    });
  });

  socket.on('endSession', (data, callback) => {
    handleEndSession(socket, data, callback, deps);
  });
}
