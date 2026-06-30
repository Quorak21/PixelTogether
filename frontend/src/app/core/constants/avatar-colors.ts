import { GAME_PALETTE_16 } from '../config/session-config';

/** Couleurs exclues du choix avatar (trop claires ou brun — grille 6×2). */
const AVATAR_EXCLUSIONS = new Set(['#ffffff', '#f4b41b', '#f7e26b', '#6b4423']);

/** 12 couleurs pixel proposées pour l'avatar. */
export const AVATAR_COLORS = GAME_PALETTE_16.filter((color) => !AVATAR_EXCLUSIONS.has(color));

/** Deux rangées de 6 pour la modale d'onboarding. */
export const AVATAR_COLOR_ROWS = [
  AVATAR_COLORS.slice(0, 6),
  AVATAR_COLORS.slice(6, 12),
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];
