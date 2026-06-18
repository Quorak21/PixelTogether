import {
  GAME_MODE_COOP,
  GAME_MODES,
  COOP_GUESTS_MIN,
  COOP_GUESTS_MAX,
  COOP_SESSION_COUNT_MIN,
  COOP_SESSION_COUNT_MAX,
  COMPETITIVE_PLAYERS_MIN,
  COMPETITIVE_SESSION_COUNT_MIN,
  COMPETITIVE_SESSION_COUNT_MAX,
} from '../../config/constants.js';

/**
 * Vérifie si l'événement est configuré en mode coopératif.
 * 
 * @param {Object} event - L'événement (partie) à inspecter.
 * @returns {boolean} true si le mode est coopératif.
 */
export function isCoop(event) {
  return event.gameMode === GAME_MODE_COOP;
}

/**
 * Normalise et valide la chaîne représentant le mode de jeu reçue du client.
 * Si le mode n'est pas reconnu, retourne compétitif par défaut.
 * 
 * @param {any} raw - Donnée brute reçue.
 * @returns {string|null} Le mode normalisé ou null si incorrect.
 */
export function parseGameMode(raw) {
  const mode = typeof raw === 'string' ? raw.trim() : 'competitive';
  return GAME_MODES.includes(mode) ? mode : null;
}

/**
 * Valide le nombre de sessions configuré pour une partie selon le mode de jeu choisi.
 * Le mode coopératif et compétitif ont des limites min/max différentes.
 * 
 * @param {string} gameMode - Le mode de jeu ('coop' ou 'competitive').
 * @param {number} sessionCount - Le nombre de sessions souhaité.
 * @returns {Object|null} Un objet `{ error: string }` en cas d'erreur, sinon `null`.
 */
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

/**
 * Valide le nombre de joueurs requis pour démarrer la partie selon le mode de jeu.
 * Coop requiert un minimum de 2 invités (donc 3 personnes sur la grille avec le manager).
 * Compétitif requiert au moins 6 joueurs.
 * 
 * @param {Object} event - L'événement à démarrer.
 * @returns {Object|null} Un objet d'erreur ou `null` si tout est valide.
 */
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

/**
 * Empêche de nouveaux invités de rejoindre la partie coop si elle est déjà pleine.
 * 
 * @param {Object} event - L'événement.
 * @returns {Object|null} Objet d'erreur ou `null`.
 */
export function validateGuestRegistration(event) {
  if (!isCoop(event)) return null;

  if (event.players.length >= COOP_GUESTS_MAX) {
    return { error: 'Partie complète.' };
  }
  return null;
}
