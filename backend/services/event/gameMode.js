import {
  GAME_MODE_COOP,
  GAME_MODE_COMPETITIVE,
  GAME_MODES,
  COOP_GUESTS_MIN,
  COOP_GUESTS_MAX,
  COOP_SESSION_COUNT_MIN,
  COOP_SESSION_COUNT_MAX,
  COMPETITIVE_PLAYERS_MIN,
  COMPETITIVE_SESSION_COUNT_MIN,
  COMPETITIVE_SESSION_COUNT_MAX,
} from '../../config/constants.js';

export function isCoop(event) {
  return event.gameMode === GAME_MODE_COOP;
}

export function isCompetitive(event) {
  return !event.gameMode || event.gameMode === GAME_MODE_COMPETITIVE;
}

export function parseGameMode(raw) {
  const mode = typeof raw === 'string' ? raw.trim() : GAME_MODE_COMPETITIVE;
  return GAME_MODES.includes(mode) ? mode : null;
}

export function validateSessionCountForMode(gameMode, sessionCount) {
  if (gameMode === GAME_MODE_COOP) {
    if (sessionCount < COOP_SESSION_COUNT_MIN || sessionCount > COOP_SESSION_COUNT_MAX) {
      return {
        error: `En coop, le nombre de sessions doit être entre ${COOP_SESSION_COUNT_MIN} et ${COOP_SESSION_COUNT_MAX}.`,
      };
    }
    return null;
  }

  if (sessionCount < COMPETITIVE_SESSION_COUNT_MIN || sessionCount > COMPETITIVE_SESSION_COUNT_MAX) {
    return {
      error: `En compétitif, le nombre de sessions doit être entre ${COMPETITIVE_SESSION_COUNT_MIN} et ${COMPETITIVE_SESSION_COUNT_MAX}.`,
    };
  }
  return null;
}

export function validateStartPlayerCount(event) {
  const count = event.players.length;

  if (isCoop(event)) {
    if (count < COOP_GUESTS_MIN) {
      return { error: `Au moins ${COOP_GUESTS_MIN} invités sont requis pour démarrer (${COOP_GUESTS_MIN + 1} sur la grille avec vous).` };
    }
    if (count > COOP_GUESTS_MAX) {
      return { error: 'Partie complète.' };
    }
    return null;
  }

  if (count < COMPETITIVE_PLAYERS_MIN) {
    return { error: `Au moins ${COMPETITIVE_PLAYERS_MIN} joueurs sont requis pour démarrer.` };
  }
  return null;
}

export function validateGuestRegistration(event) {
  if (!isCoop(event)) return null;

  if (event.players.length >= COOP_GUESTS_MAX) {
    return { error: 'Partie complète.' };
  }
  return null;
}
