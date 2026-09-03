import { GRID_SIZE, PREVIEW_THROTTLE_MS } from '../../config/constants.js';
import { generateGridImage } from './gridPreview.js';
import { getEvent, getGroup } from '../../store/eventStore.js';

// Stocke l'état des timers de throttle pour la génération des aperçus.
// Clé : "eventId:groupCode" -> { timeoutId, lastRunTime }
export const pendingUpdates = {};

/**
 * Recalcule et met à jour l'image de preview d'un groupe après la pose d'un pixel.
 * Bien que ce calcul puisse être coûteux (regénération de l'image PNG), c'est tout à fait
 * acceptable vu la taille modeste de nos grilles (75x75).
 * 
 * @param {string} eventId - ID de la partie.
 * @param {string} groupCode - Code du groupe dont il faut recalculer la preview.
 */
export function updateGroupPreview(eventId, groupCode) {
  const event = getEvent(eventId);
  const group = getGroup(event, groupCode);
  if (!event || !group) return;
  group.image = generateGridImage(group.pixels, GRID_SIZE);
}

/**
 * Planifie une mise à jour d'aperçu de groupe avec un système de throttle (cooldown).
 * Émet également l'événement Socket.io 'groupPreviewUpdated' vers le salon du manager/joueurs.
 * 
 * @param {Object} io - L'instance de Socket.io.
 * @param {string} eventId - ID de la partie.
 * @param {string} groupCode - Code du groupe.
 */
export function scheduleGroupPreviewUpdate(io, eventId, groupCode) {
  const key = `${eventId}:${groupCode}`;
  const now = Date.now();

  if (!pendingUpdates[key]) {
    pendingUpdates[key] = {
      timeoutId: null,
      lastRunTime: 0,
      hasRun: false,
    };
  }

  const entry = pendingUpdates[key];
  const timeSinceLastRun = now - entry.lastRunTime;

  const runUpdate = () => {
    updateGroupPreview(eventId, groupCode);
    const event = getEvent(eventId);
    const group = getGroup(event, groupCode);
    if (group && group.image) {
      io.to(eventId).emit('groupPreviewUpdated', {
        eventId,
        groupCode,
        image: group.image,
      });
    }
    entry.lastRunTime = Date.now();
    entry.hasRun = true;
    entry.timeoutId = null;
  };

  if (!entry.hasRun || timeSinceLastRun >= PREVIEW_THROTTLE_MS) {
    // Si c'est le premier appel ou qu'on a dépassé le cooldown, on exécute immédiatement (leading edge)
    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
      entry.timeoutId = null;
    }
    runUpdate();
  } else {
    // Sinon, on planifie pour la fin du cooldown s'il n'y a pas déjà un timer actif (trailing edge)
    if (!entry.timeoutId) {
      const delay = PREVIEW_THROTTLE_MS - timeSinceLastRun;
      entry.timeoutId = setTimeout(runUpdate, delay);
    }
  }
}

/**
 * Force la mise à jour immédiate de la preview d'un groupe,
 * en annulant tout timer de throttle programmé.
 * 
 * @param {string} eventId - ID de la partie.
 * @param {string} groupCode - Code du groupe.
 */
export function flushGroupPreviewUpdate(eventId, groupCode) {
  const key = `${eventId}:${groupCode}`;
  const entry = pendingUpdates[key];
  if (entry) {
    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }
    delete pendingUpdates[key];
  }
  // Exécute le rendu de manière synchrone immédiatement
  updateGroupPreview(eventId, groupCode);
}

/**
 * Force le rendu final de toutes les images de groupe pour un événement
 * et nettoie les timers de throttle associés.
 * 
 * @param {Object} event - L'événement de la partie.
 */
export function flushAllEventPreviews(event) {
  if (!event || !event.groups) return;
  for (const groupCode in event.groups) {
    flushGroupPreviewUpdate(event.id, groupCode);
  }
}

/**
 * Récupère les images de preview de tous les groupes d'un événement donné.
 * Pratique pour envoyer l'ensemble des images au manager ou aux joueurs lors des votes.
 * 
 * @param {Object} event - L'événement.
 * @returns {Object} Un objet associant chaque groupCode à sa preview PNG Base64.
 */
export function getEventGroupImages(event) {
  const images = {};
  for (const code in event.groups) {
    if (event.groups[code]?.image) {
      images[code] = event.groups[code].image;
    }
  }
  return images;
}
