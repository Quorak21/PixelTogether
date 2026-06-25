import { WrMode } from '../../types/entities';

export type WrPhase = 'waiting' | 'transition' | 'final';

export function resolveWrPhase(wrMode: WrMode, partyStarted: boolean): WrPhase {
  if (wrMode === 'podium' || wrMode === 'gallery') return 'final';
  if (wrMode === 'voting' || wrMode === 'tieBreak' || wrMode === 'voteResult' || wrMode === 'sessionResult') {
    return 'transition';
  }
  if (wrMode === 'players' && partyStarted) return 'transition';
  return 'waiting';
}
