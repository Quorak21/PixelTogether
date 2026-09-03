import { SESSION_TRANSITION_SECONDS } from '../../config/constants.js';
import { getEvent } from '../../store/eventStore.js';
import { clearSessionTimer, finishCurrentSession } from './sessionLifecycle.js';

/**
 * Planifie la fin automatique d'une session de dessin.
 * Calcule l'heure exacte de fin en combinant la durée configurée de la session 
 * et un délai de transition (SESSION_TRANSITION_SECONDS) pour laisser le temps aux joueurs de voir le changement.
 * Enregistre un minuteur (`setTimeout`) qui appellera finishCurrentSession() une fois le temps écoulé.
 * 
 * @param {Object} event - L'événement de la partie.
 * @param {Object} io - Le serveur Socket.io.
 * @returns {number} Le timestamp (ms) de fin de session planifié.
 */
export function scheduleSessionEnd(event, io) {
  clearSessionTimer(event);

  const transitionMs = SESSION_TRANSITION_SECONDS * 1000;
  const durationMs = event.sessionDurationMinutes * 60 * 1000;

  event.sessionEndsAt = Date.now() + durationMs + transitionMs;
  const remainingMs = event.sessionEndsAt - Date.now();

  event._sessionTimer = setTimeout(() => {
    event._sessionTimer = null;
    const current = getEvent(event.id); // re-fetch de sécurité : la partie a pu être fermée entre-temps.
    if (current) {
      finishCurrentSession(io, current);
    }
  }, remainingMs);

  return event.sessionEndsAt;
}
