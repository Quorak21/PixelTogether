import confetti from 'canvas-confetti';
import { GAME_PALETTE_16 } from '../config/session-config';

/**
 * Explosion de paillettes à l'annonce du gagnant de session (voteResult).
 * No-op côté SSR / tests sans `window`.
 */
export function fireVoteWinnerConfetti(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const colors = [...GAME_PALETTE_16];

  const shoot = (options: confetti.Options) =>
    confetti({
      disableForReducedMotion: true,
      colors,
      ...options,
    });

  shoot({
    particleCount: 100,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.55 },
  });

  window.setTimeout(() => {
    shoot({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
    shoot({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
  }, 180);
}
