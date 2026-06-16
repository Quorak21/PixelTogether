import { registerLobbyHandlers } from './handlers/lobby.handlers.js';
import { registerWaitingRoomHandlers } from './handlers/waitingRoom.handlers.js';
import { registerGameHandlers } from './handlers/game.handlers.js';
import { registerLifecycleHandlers } from './handlers/lifecycle.handlers.js';

import { registerReconnectHandlers } from './handlers/reconnect.handlers.js';

// branche les handlers à chaque nouvelle connexion
export function registerSocketHandlers(io, deps) {
  io.on('connection', (socket) => {
    socket.emit('connected', { socketId: socket.id });
    registerReconnectHandlers(socket, deps);
    registerLobbyHandlers(socket, deps);
    registerWaitingRoomHandlers(socket, deps);
    registerGameHandlers(socket, deps);
    registerLifecycleHandlers(socket, deps);
  });
}
