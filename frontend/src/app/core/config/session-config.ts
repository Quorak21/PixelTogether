// miroir de backend/config/constants.js — garder sync si tu changes les limites

/** Marge ajoutée au chrono compétitif au lancement (lecture modale transition). */
export const SESSION_TRANSITION_SECONDS = 10;

export const GAME_MODE_COOP = 'coop' as const;
export const GAME_MODE_COMPETITIVE = 'competitive' as const;
export type GameMode = typeof GAME_MODE_COOP | typeof GAME_MODE_COMPETITIVE;

export const SESSION_DURATION_MIN = 1;
export const SESSION_DURATION_MAX = 20;
export const SESSION_DURATION_DEFAULT = 15;

export const COOP_GUESTS_MIN = 2;
export const COOP_GUESTS_MAX = 7;
export const COOP_GRID_MAX = 8;

export const COOP_SESSION_COUNT_MIN = 1;
export const COOP_SESSION_COUNT_MAX = 4;

export const COMPETITIVE_PLAYERS_MIN = 6;
export const COMPETITIVE_SESSION_COUNT_MIN = 3;
export const COMPETITIVE_SESSION_COUNT_MAX = 8;

/** Plafond d'invités inscrits par salon (tous modes) — miroir backend/config/constants.js */
export const EVENT_PLAYERS_MAX = 40;

/** Blanc peint sur la grille (quasi pur) — distinct du fond canvas/export `#ffffff`. */
export const PAINTED_WHITE = '#fefefe';

/** Fond canvas et export PNG. */
export const CANVAS_BG_WHITE = '#ffffff';

/** Blanc peint actuel ou legacy `#ffffff` encore en mémoire. */
export function isPaintedWhite(color: string | null | undefined): boolean {
  if (!color) {
    return false;
  }
  const normalized = color.toLowerCase();
  return normalized === PAINTED_WHITE || normalized === '#ffffff';
}

/** Palette de dessin (16 couleurs) — miroir backend/config/constants.js `GAME_PALETTE_16`. */
export const GAME_PALETTE_16 = [
  '#000000',
  '#6b4423',
  '#38b764',
  '#f4b41b',
  PAINTED_WHITE,
  '#e53b44',
  '#f18d2d',
  '#a3a7c2',
  '#3e8948',
  '#215d5e',
  '#f7e26b',
  '#b13e53',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#ef7d57',
] as const;

export const SESSION_COUNT_DEFAULT = 3;

export function totalPlayDurationMinutes(
  sessionCount: number,
  sessionDurationMinutes: number,
): number {
  return sessionCount * sessionDurationMinutes;
}

/** Occupation grille coop : invités + manager (toujours joueur). */
export function coopGridOccupancy(guestCount: number): number {
  return guestCount + 1;
}
