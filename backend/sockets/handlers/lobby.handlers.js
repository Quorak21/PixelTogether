import { handleEndSession } from '../../services/session/sessionLifecycle.js';

export function registerLobbyHandlers(socket, deps) {
  const { io, store, constants, payloads, preview } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { LABEL_REGEX, LABEL_MIN, LABEL_MAX } = constants;
  const { toLegacyLobbyRoom, buildEventLobbyPayload } = payloads;
  const { getEventGroupImages } = preview;

  socket.on('getActiveGrids', () => {
    const lobbyGrids = {};
    const images = {};
    for (const eventId in activeEvents) {
      const event = activeEvents[eventId];
      lobbyGrids[eventId] = toLegacyLobbyRoom(event);
      const eventImages = getEventGroupImages(event);
      for (const code in eventImages) {
        images[`${eventId}/${code}`] = eventImages[code];
        if (!images[eventId]) {
          images[eventId] = eventImages[code];
        }
      }
    }
    socket.emit('activeGrids', { activeGrids: lobbyGrids, images });
  });

  socket.on('getEventLobby', (data, callback) => {
    const eventId = normalizeEventId(data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      const error = "La partie n'existe pas.";
      socket.emit('eventLobbyError', { error });
      if (typeof callback === 'function') callback({ error });
      return;
    }

    const payload = buildEventLobbyPayload(event);
    socket.emit('eventLobbyState', payload);
    if (typeof callback === 'function') callback(payload);
  });

  socket.on('newGrid', (data, callback) => {
    const theme = typeof data?.theme === 'string' ? data.theme.trim() : typeof data?.name === 'string' ? data.name.trim() : '';
    const partyName = typeof data?.partyName === 'string' ? data.partyName.trim() : '';

    if (!LABEL_REGEX.test(theme)) {
      return callback({
        error: `Le thème doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
      });
    }

    if (!LABEL_REGEX.test(partyName)) {
      return callback({
        error: `Le nom de partie doit contenir entre ${LABEL_MIN} et ${LABEL_MAX} caractères.`,
      });
    }

    const eventId = store.generateRoomCode();

    activeEvents[eventId] = {
      id: eventId,
      host: socket.id,
      partyName,
      name: theme,
      sessionCount: 1,
      currentSession: 1,
      status: 'waiting',
      hostProfile: null,
      players: [],
      groups: {},
    };

    socket.data.role = 'host';
    socket.data.eventId = eventId;
    socket.join(eventId);

    io.emit('createCanvas', toLegacyLobbyRoom(activeEvents[eventId]));

    callback({ id: eventId, host: socket.id, partyName, theme, name: theme, role: 'host' });
  });

  socket.on('endSession', (data, callback) => {
    handleEndSession(socket, data, callback, deps);
  });
}
