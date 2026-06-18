import { registerLobbyHandlers } from './handlers/lobby.handlers.js';
import { registerWaitingRoomHandlers } from './handlers/waitingRoom.handlers.js';
import { registerGameHandlers } from './handlers/game.handlers.js';
import { registerLifecycleHandlers } from './handlers/lifecycle.handlers.js';
import { registerReconnectHandlers } from './handlers/reconnect.handlers.js';

// branche les handlers à chaque nouvelle connexion

/**
 * Configure et attache les écouteurs d'événements Socket.io à chaque nouvelle connexion d'un client.
 * Émet la capacité du serveur au client connecté.
 * Installe un intercepteur d'activité (middleware socket.use) pour réinitialiser le minuteur 
 * d'inactivité du salon (`lastActivityAt`) dès qu'un message lié à une partie transite.
 * Enregistre enfin l'ensemble des handlers spécifiques à chaque aspect du jeu.
 * 
 * @param {Object} io - L'instance serveur Socket.io globale.
 * @param {Object} deps - Le sac de dépendances partagé (store, constants, etc.).
 *   registerGameHandlers(), registerLifecycleHandlers() pour brancher les messages spécifiques.
 */
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

