import { handleEndSession } from '../../services/session/sessionLifecycle.js';

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
    MAX_PARTY_DURATION_MINUTES,
    SESSION_COUNT_MIN,
    SESSION_COUNT_MAX,
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

    if (socket.id !== event.manager) {
      const error = 'Seul le manager peut accéder à ce lobby.';
      socket.emit('eventLobbyError', { error });
      if (typeof callback === 'function') callback({ error });
      return;
    }

    const payload = buildEventLobbyPayload(event);
    socket.emit('eventLobbyState', payload);
    if (typeof callback === 'function') callback(payload);
  });

  socket.on('newGrid', (data, callback) => { // nom historique — crée un Event, pas une grille
    const partyName = typeof data?.partyName === 'string' ? data.partyName.trim() : '';

    if (!LABEL_REGEX.test(partyName)) {
      return callback({
        error: `Le nom de partie doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
      });
    }

    const rawDuration = data?.sessionDurationMinutes;
    const parsedDuration =
      typeof rawDuration === 'number' && Number.isInteger(rawDuration)
        ? rawDuration
        : typeof rawDuration === 'string'
          ? Number.parseInt(rawDuration, 10)
          : SESSION_DURATION_DEFAULT;
    const sessionDurationMinutes = Number.isInteger(parsedDuration)
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
    const parsedSessionCount =
      typeof rawSessionCount === 'number' && Number.isInteger(rawSessionCount)
        ? rawSessionCount
        : typeof rawSessionCount === 'string'
          ? Number.parseInt(rawSessionCount, 10)
          : themes.length || 1;
    const sessionCount = Number.isInteger(parsedSessionCount) && parsedSessionCount >= SESSION_COUNT_MIN
      ? parsedSessionCount
      : themes.length || 1;

    if (sessionCount < SESSION_COUNT_MIN) {
      return callback({ error: 'Au moins une session est requise.' });
    }

    if (sessionCount > SESSION_COUNT_MAX) {
      return callback({ error: `Maximum ${SESSION_COUNT_MAX} sessions.` });
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

    const totalDuration = sessionCount * sessionDurationMinutes;
    if (totalDuration > MAX_PARTY_DURATION_MINUTES) {
      return callback({
        error: `La durée totale (${totalDuration} min) dépasse le maximum de ${MAX_PARTY_DURATION_MINUTES} minutes.`,
      });
    }

    const eventId = store.generateRoomCode();
    const firstTheme = themes[0];

    activeEvents[eventId] = {
      id: eventId,
      manager: socket.id,
      partyName,
      name: firstTheme,
      themes,
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
    };

    socket.data.role = 'manager';
    socket.data.eventId = eventId;
    socket.join(eventId);

    callback({
      id: eventId,
      manager: socket.id,
      partyName,
      theme: firstTheme,
      name: firstTheme,
      role: 'manager',
    });
  });

  socket.on('endSession', (data, callback) => {
    handleEndSession(socket, data, callback, deps);
  });
}
