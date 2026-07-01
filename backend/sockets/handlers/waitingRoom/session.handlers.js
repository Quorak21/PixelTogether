import { runStartGame } from '../../../services/session/sessionLifecycle.js';
import { isManager } from '../../../services/event/participants.js';
import { isCoop, validateStartPlayerCount } from '../../../services/event/gameMode.js';
import { guardAck } from '../socketGuards.js';

export function registerSessionPhaseHandlers(socket, deps) {
  const { store } = deps;
  const { activeEvents, normalizeEventId } = store;

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

    if (!event.managerProfile) {
      return callback({ error: 'Le manager doit compléter son profil avant de démarrer.' });
    }

    if (!event.partyStarted) {
      const playerCountError = validateStartPlayerCount(event);
      if (playerCountError) {
        return callback(playerCountError);
      }
      if (!isCoop(event)) {
        event.rosterBaselineCount = event.players.length;
      }
    }

    const result = runStartGame(deps.io, event, deps);
    if (result.error) {
      return callback({ error: result.error });
    }

    if (!event.partyStarted) {
      event.partyStarted = true;
    }

    callback({ eventId, status: 'started' });
  });
}
