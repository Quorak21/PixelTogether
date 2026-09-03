import { handleCastVote, handleCloseVote } from '../../../services/vote/voteLifecycle.js';

export function registerTransitionPhaseHandlers(socket, deps) {
  socket.on('castVote', (data, callback) => {
    handleCastVote(socket, data, callback, deps);
  });

  socket.on('closeVote', (data, callback) => {
    handleCloseVote(socket, data, callback, deps);
  });
}
