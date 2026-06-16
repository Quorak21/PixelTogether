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
