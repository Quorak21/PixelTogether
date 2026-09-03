import { isCoop } from '../event/gameMode.js';
import { getPlayerHomeGroup } from '../session/groupAccess.js';

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
  if (event.activeVote?.status === 'tiebreak' || event.activeVote?.status === 'tiebreak_roulette') return 'tieBreak';
  if (event.activeVote?.status === 'closed') return 'voteResult';
  return 'players';
}

/**
 * Phase de reconnexion — inclut game/lobby hors WR.
 * `waiting` = rassemblement ou attente inter-session (`wrMode: players`).
 */
export function resolveReconnectPhase(event, role, playerId = null) {
  if (event.status === 'started') {
    if (isCoop(event)) {
      return 'game';
    }
    if (role === 'manager') return 'lobby';
    const home = getPlayerHomeGroup(event, playerId);
    if (home?.group?.finished) return 'lobby';
    return 'game';
  }

  const wrMode = getWrMode(event);
  if (wrMode === 'players') return 'waiting';
  return wrMode;
}
