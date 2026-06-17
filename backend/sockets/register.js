import { registerLobbyHandlers } from './handlers/lobby.handlers.js';
import { registerWaitingRoomHandlers } from './handlers/waitingRoom.handlers.js';
import { registerGameHandlers } from './handlers/game.handlers.js';
import { registerLifecycleHandlers } from './handlers/lifecycle.handlers.js';

import { registerReconnectHandlers } from './handlers/reconnect.handlers.js';

// branche les handlers à chaque nouvelle connexion
export function registerSocketHandlers(io, deps) {
  io.on('connection', (socket) => {
    socket.emit('connected', { socketId: socket.id });

    // Diffusion initiale de la capacité du serveur au client connecté
    const maxCapReached = Object.keys(deps.store.activeEvents).length >= deps.constants.MAX_ACTIVE_EVENTS;
    socket.emit('serverCapacity', { maxCapReached });

    // Intercepteur d'activité : met à jour lastActivityAt à chaque paquet reçu pour un événement lié
    socket.use((packet, next) => {
      const eventId = socket.data?.eventId;
      if (eventId) {
        const event = deps.store.activeEvents[eventId];
        if (event) {
          event.lastActivityAt = Date.now();
        }
      }
      next();
    });

    registerReconnectHandlers(socket, deps);
    registerLobbyHandlers(socket, deps);
    registerWaitingRoomHandlers(socket, deps);
    registerGameHandlers(socket, deps);
    registerLifecycleHandlers(socket, deps);
  });
}

