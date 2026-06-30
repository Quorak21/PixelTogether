import { isRegistered } from '../event/participants.js';
import { getWrMode } from '../event/wrPhase.js';
import { validateToken } from '../reconnect/sessionToken.js';

const EXPORTABLE_MODES = new Set(['podium', 'gallery']);

/**
 * Vérifie qu'un participant peut télécharger l'export de cette room.
 * Retourne { event, session } ou { error, status }.
 */
export function assertCanDownloadExport({ activeEvents, normalizeEventId, eventId, token }) {
  const normalizedId = normalizeEventId(eventId);
  if (!normalizedId) {
    return { error: 'Partie invalide.', status: 400 };
  }

  const session = validateToken(token);
  if (!session) {
    return { error: 'Session invalide ou expirée.', status: 401 };
  }

  if (session.eventId !== normalizedId) {
    return { error: 'Accès refusé à cette partie.', status: 403 };
  }

  const event = activeEvents[normalizedId];
  if (!event) {
    return { error: 'La partie n\'existe pas ou est terminée.', status: 404 };
  }

  if (!isRegistered(event, session.socketId, session.playerId)) {
    return { error: 'Vous n\'êtes pas inscrit à cette partie.', status: 403 };
  }

  const wrMode = getWrMode(event);
  if (!EXPORTABLE_MODES.has(wrMode)) {
    return { error: 'L\'export n\'est pas encore disponible.', status: 403 };
  }

  return { event, session };
}
