import {
  ROOM_CODE_CHARS,
  GROUP_CODE_CHARS,
  ROOM_CODE_LENGTH,
  GROUP_CODE_LENGTH,
  ROOM_CODE_REGEX,
  GROUP_CODE_REGEX,
} from '../config/constants.js';

// C'est la seule et unique "base de données" en mémoire de notre projet.
// Tout est stocké ici ! Si le serveur redémarre ou qu'on ferme un salon via closeEvent(), tout disparaît.
export const activeEvents = {};

/**
 * Génère un code unique pour créer un salon (Room/Event).
 * Exemple : "AB4XYZ" (basé sur ROOM_CODE_LENGTH dans constants.js).
 * Cette fonction boucle tant qu'elle trouve un code déjà utilisé dans notre activeEvents.
 */
export function generateRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (activeEvents[code]);
  return code;
}

/**
 * Génère un code de groupe unique à 4 chiffres (ex: "4829") spécifique à un événement donné.
 * Il sert à identifier la "sous-partie" ou équipe sur le tableau de dessin.
 * Boucle jusqu'à ce que le code soit libre au sein de event.groups.
 */
export function generateGroupCode(event) {
  let code;
  do {
    code = '';
    for (let i = 0; i < GROUP_CODE_LENGTH; i += 1) {
      code += GROUP_CODE_CHARS[Math.floor(Math.random() * GROUP_CODE_CHARS.length)];
    }
  } while (event.groups[code]);
  return code;
}

/**
 * Nettoie et valide un ID d'événement (code de salon).
 * Retire les espaces inutiles, met en majuscules et vérifie le format via ROOM_CODE_REGEX.
 * Renvoie l'ID nettoyé ou null s'il est invalide.
 */
export function normalizeEventId(eventId) {
  if (typeof eventId !== 'string') return null;
  const normalized = eventId.trim().toUpperCase();
  if (!ROOM_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

/**
 * Nettoie et valide un code de groupe (4 chiffres).
 * Retire les espaces et vérifie le format avec GROUP_CODE_REGEX.
 * Renvoie le code propre ou null si invalide.
 */
export function normalizeGroupCode(groupCode) {
  if (typeof groupCode !== 'string') return null;
  const normalized = groupCode.trim();
  if (!GROUP_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

/**
 * Crée le nom de la "room" Socket.io sous la forme "eventId:groupCode".
 * Cette chaîne sert d'identifiant technique pour diffuser des messages (chat ou pixel dessiné)
 * uniquement aux membres de ce groupe spécifique.
 */
export function groupRoomName(eventId, groupCode) {
  return `${eventId}:${groupCode}`;
}

/**
 * Récupère l'objet Event correspondant à un ID donné depuis la base de données temporaire activeEvents.
 * Utilise normalizeEventId() pour s'assurer que la clé de recherche est propre.
 */
export function getEvent(eventId) {
  const id = normalizeEventId(eventId);
  return id ? activeEvents[id] : null;
}

/**
 * Récupère un groupe spécifique (sous-partie) au sein d'un événement.
 * Utilise normalizeGroupCode() pour valider le code du groupe.
 */
export function getGroup(event, groupCode) {
  const code = normalizeGroupCode(groupCode);
  return code ? event?.groups?.[code] : null;
}

/**
 * Retourne la liste des groupes d'un événement sous forme de tableau trié par index (groupIndex).
 * Pratique pour l'affichage dans le lobby manager ou l'écran des votes pour garder le même ordre.
 */
export function getSortedGroups(event) {
  return Object.entries(event.groups)
    .map(([groupCode, group]) => ({ groupCode, group }))
    .sort((a, b) => a.group.groupIndex - b.group.groupIndex);
}
