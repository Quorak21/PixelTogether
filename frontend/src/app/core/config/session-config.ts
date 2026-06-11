// miroir de backend/config/constants.js — garder sync si tu changes les limites

export const GROUP_TRANSITION_SECONDS = 5;

export const GROUP_TRANSITION_MS = GROUP_TRANSITION_SECONDS * 1000;



export const SESSION_DURATION_MIN = 1;

export const SESSION_DURATION_MAX = 60;

export const SESSION_DURATION_DEFAULT = 15;

export const MAX_PARTY_DURATION_MINUTES = 60;

export const SESSION_COUNT_MIN = 1;

export const SESSION_COUNT_MAX = 5;

export const SESSION_COUNT_DEFAULT = 1;



export function totalPlayDurationMinutes(

  sessionCount: number,

  sessionDurationMinutes: number,

): number {

  return sessionCount * sessionDurationMinutes;

}

