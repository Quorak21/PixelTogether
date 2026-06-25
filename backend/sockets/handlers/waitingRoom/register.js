import { registerWaitingPhaseHandlers } from './waiting.handlers.js';
import { registerSessionPhaseHandlers } from './session.handlers.js';
import { registerTransitionPhaseHandlers } from './transition.handlers.js';
import { registerFinalPhaseHandlers } from './final.handlers.js';

export function registerWaitingRoomHandlers(socket, deps) {
  registerWaitingPhaseHandlers(socket, deps);
  registerSessionPhaseHandlers(socket, deps);
  registerTransitionPhaseHandlers(socket, deps);
  registerFinalPhaseHandlers(socket, deps);
}
