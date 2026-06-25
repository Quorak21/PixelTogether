import { beginSession } from '../../../services/session/sessionLifecycle.js';
import { scheduleSessionEnd } from '../../../services/session/sessionTimer.js';
import { isManager } from '../../../services/event/participants.js';
import { isCoop, validateStartPlayerCount } from '../../../services/event/gameMode.js';
import { guardAck } from '../socketGuards.js';

export function registerSessionPhaseHandlers(socket, deps) {
  const { io, store, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { emitGameStarted } = lifecycle;

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

    if (event.status !== 'waiting') {
      return callback({ error: 'La partie est déjà lancée.' });
    }
    event.status = 'started';
    if (!event.partyStarted) {
      event.partyStarted = true;
    }

    event.activeVote = null;
    event.coopWrMode = null;
    event.theme = event.themes[event.currentSession - 1];
    beginSession(event, deps);
    if (!isCoop(event)) {
      scheduleSessionEnd(event, io);
    }
    emitGameStarted(io, event);
    callback({ eventId, status: 'started' });
  });
}
