import crypto from 'crypto';
import { RECONNECT_MARGIN_MINUTES, MAX_PARTY_DURATION_MINUTES } from '../../config/constants.js';

// Index global : playerId → session ; token → { playerId, eventId }
export const playerSessions = {};
export const tokenIndex = {};

/**
 * Calcule la date d'expiration estimée de la session d'un joueur.
 * Elle est égale à la durée théorique de la partie (nombre de sessions * durée d'une session)
 * à laquelle on ajoute une marge supplémentaire de sécurité (RECONNECT_MARGIN_MINUTES).
 * Si la durée d'une session n'est pas définie (cas du mode coopératif), on utilise par défaut
 * le double de la durée maximale d'une partie (MAX_PARTY_DURATION_MINUTES * 2) pour être large
 * et éviter une accumulation mémoire infinie de jetons.
 */
export function computeExpiresAt(event) {
  const duration = event.sessionDurationMinutes || (MAX_PARTY_DURATION_MINUTES * 2);
  const totalMinutes =
    event.sessionCount * duration + RECONNECT_MARGIN_MINUTES;
  return Date.now() + totalMinutes * 60_000;
}

/** Crée un token opaque et l'enregistre sur l'event + index global. */
export function issueSession(event, { playerId, role, socketId, groupCode = null }) {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = computeExpiresAt(event);

  if (!event.sessionsByToken) {
    event.sessionsByToken = {};
  }

  const session = {
    playerId,
    eventId: event.id,
    role,
    token,
    groupCode,
    expiresAt,
    connected: true,
    socketId,
  };

  playerSessions[playerId] = session;
  event.sessionsByToken[token] = playerId;
  tokenIndex[token] = { playerId, eventId: event.id };

  return { playerId, token, expiresAt };
}

/** Valide un token ; retourne null si absent, expiré ou incohérent. */
export function validateToken(token) {
  if (typeof token !== 'string' || !token) return null;

  const entry = tokenIndex[token];
  if (!entry) return null;

  const session = playerSessions[entry.playerId];
  if (!session || session.token !== token) return null;
  if (Date.now() > session.expiresAt) return null;

  return session;
}

export function getSessionByPlayerId(playerId) {
  const session = playerSessions[playerId];
  if (!session || Date.now() > session.expiresAt) return null;
  return session;
}

export function updateSessionGroupCode(playerId, groupCode) {
  const session = playerSessions[playerId];
  if (session) {
    session.groupCode = groupCode;
  }
}

export function setSessionConnected(playerId, connected, socketId = null) {
  const session = playerSessions[playerId];
  if (!session) return;
  session.connected = connected;
  if (socketId) {
    session.socketId = socketId;
  }
}

/** Retire la session d'un joueur (sortie volontaire). */
export function purgePlayerSession(playerId) {
  const session = playerSessions[playerId];
  if (!session) return;

  delete tokenIndex[session.token];
  delete playerSessions[playerId];
}

/** Purge toutes les sessions liées à un event (closeEvent). */
export function purgeEventSessions(event) {
  if (!event?.sessionsByToken) return;

  for (const playerId of Object.values(event.sessionsByToken)) {
    delete playerSessions[playerId];
  }
  for (const token of Object.keys(event.sessionsByToken)) {
    delete tokenIndex[token];
  }
  event.sessionsByToken = {};
}

/** Retire une session d'un event sans toucher aux autres. */
export function removePlayerSessionFromEvent(event, playerId) {
  const session = playerSessions[playerId];
  if (!session) return;

  if (event.sessionsByToken) {
    delete event.sessionsByToken[session.token];
  }
  delete tokenIndex[session.token];
  delete playerSessions[playerId];
}

/** Token encore valide pour une autre partie ? */
export function hasActiveSessionOnOtherEvent(token, eventId) {
  const session = validateToken(token);
  return Boolean(session && session.eventId !== eventId);
}
