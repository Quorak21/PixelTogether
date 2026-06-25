import { isCoop } from './gameMode.js';

/**
 * Mode d'affichage WR côté client (`wrMode` dans les payloads).
 */
export function getWrMode(event) {
  if (isCoop(event)) {
    if (!event.partyStarted) return 'players';
    if (event.coopWrMode === 'gallery') return 'gallery';
    if (event.coopWrMode === 'sessionResult') return 'sessionResult';
    return 'players';
  }

  if (event.showingResults) return 'podium';
  if (!event.partyStarted) return 'players';
  if (event.activeVote?.status === 'open') return 'voting';
  if (event.activeVote?.status === 'tiebreak') return 'tieBreak';
  if (event.activeVote?.status === 'closed') return 'voteResult';
  return 'players';
}

/**
 * Phase de reconnexion — inclut game/lobby hors WR.
 * `waiting` = rassemblement ou attente inter-session (`wrMode: players`).
 */
export function resolveReconnectPhase(event, role) {
  if (event.status === 'started') {
    if (isCoop(event)) {
      return 'game';
    }
    return role === 'manager' ? 'lobby' : 'game';
  }

  const wrMode = getWrMode(event);
  if (wrMode === 'players') return 'waiting';
  return wrMode;
}
