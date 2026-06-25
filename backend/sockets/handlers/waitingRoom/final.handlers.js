import { handleEndParty, handleShowResults } from '../../../services/vote/voteLifecycle.js';

export function registerFinalPhaseHandlers(socket, deps) {
  socket.on('showResults', (data, callback) => {
    handleShowResults(socket, data, callback, deps);
  });

  socket.on('endParty', (data, callback) => {
    handleEndParty(socket, data, callback, deps);
  });
}
