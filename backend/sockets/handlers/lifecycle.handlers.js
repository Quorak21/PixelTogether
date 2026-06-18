// fermeture volontaire + cleanup déco (manager = grace period 5 min)
import { setSessionConnected } from '../../services/reconnect/sessionToken.js';
import {
  resolvePlayerId,
  scheduleManagerAbsentClose,
  isManager,
} from '../../services/event/participants.js';

/**
 * Enregistre les handlers de gestion du cycle de vie de la connexion socket
 * (fermeture manuelle de salon par le manager ou déconnexion inattendue d'un client).
 */
export function registerLifecycleHandlers(socket, deps) {
  const { io, store, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { closeEvent } = lifecycle;

  // Fermeture manuelle immédiate de la room par le manager
  socket.on('closeRoom', (data) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || !isManager(event, socket)) return;

    closeEvent(io, eventId);
    socket.leave(eventId);
  });

  // Déconnexion inattendue d'un client (perte réseau, fermeture d'onglet)
  socket.on('disconnect', () => {
    for (const eventId in activeEvents) {
      const event = activeEvents[eventId];
      const playerId = resolvePlayerId(event, socket.id);

      if (isManager(event, socket)) {
        setSessionConnected(event.managerPlayerId, false);
        scheduleManagerAbsentClose(io, event, eventId, closeEvent);
        continue;
      }

      const inEvent =
        event.players.some((p) => p.socketId === socket.id || p.playerId === playerId) ||
        Object.values(event.groups).some((g) =>
          g.players.some((p) => p.socketId === socket.id || p.playerId === playerId),
        ) ||
        (playerId &&
          event.sessionsByToken &&
          Object.values(event.sessionsByToken).includes(playerId));

      if (!inEvent) continue;

      if (playerId) {
        setSessionConnected(playerId, false);
      }
    }
  });
}
