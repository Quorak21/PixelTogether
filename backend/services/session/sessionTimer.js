import { SESSION_TRANSITION_SECONDS } from '../../config/constants.js';

import { getEvent } from '../../store/eventStore.js';

import { clearSessionTimer, finishCurrentSession } from './sessionLifecycle.js';



export { clearSessionTimer };



// durée session + marge lecture modale transition (SESSION_TRANSITION_SECONDS)
export function scheduleSessionEnd(event, io) {

  clearSessionTimer(event);



  const transitionMs = SESSION_TRANSITION_SECONDS * 1000;

  const durationMs = event.sessionDurationMinutes * 60 * 1000;

  event.sessionEndsAt = Date.now() + durationMs + transitionMs;



  const remainingMs = event.sessionEndsAt - Date.now();

  event._sessionTimer = setTimeout(() => {

    event._sessionTimer = null;

    const current = getEvent(event.id); // re-fetch : l'event a pu être supprimé entre-temps

    if (current) {

      finishCurrentSession(io, current);

    }

  }, remainingMs);



  return event.sessionEndsAt;

}

