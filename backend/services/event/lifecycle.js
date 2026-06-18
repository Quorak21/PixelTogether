import { activeEvents, getEvent, getSortedGroups } from '../../store/eventStore.js';
import { toGroupPlayer } from './payloads.js';
import { getEventGroupImages } from '../grid/preview.js';
import { clearSessionTimer } from '../session/sessionLifecycle.js';
import { purgeEventSessions, updateSessionGroupCode } from '../reconnect/sessionToken.js';
import { clearManagerDisconnectTimer } from './participants.js';
import { isCoop } from './gameMode.js';
import { MAX_ACTIVE_EVENTS } from '../../config/constants.js';

/**
 * Construit un objet contenant les méta-informations de la session actuelle.
 * Retourné dans la plupart des paquets Socket envoyés aux clients pour synchroniser l'UI.
 * 
 * @param {Object} event - L'événement en cours.
 * @returns {Object} Un objet contenant les informations de session.
 */
function buildSessionInfo(event) {
  return {
    partyName: event.partyName,
    gameMode: event.gameMode,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    sessionEndsAt: event.sessionEndsAt ?? null,
  };
}

/**
 * Notifie le démarrage de la partie coopérative à tous les participants connectés.
 * En mode coopératif, tous les joueurs et le manager rejoignent un unique groupe de discussion et de dessin.
 * 
 * @param {Object} io - L'instance du serveur Socket.io.
 * @param {Object} event - L'événement concerné.
 */
function emitCoopGameStarted(io, event) {
  const theme = event.theme;
  const sessionInfo = buildSessionInfo(event);
  const [{ groupCode, group }] = getSortedGroups(event);
  const groupLabel = 'Discussion';
  const teammates = group.players.map(toGroupPlayer);

  for (const player of group.players) {
    updateSessionGroupCode(player.playerId, groupCode);
    const isManagerPlayer = player.playerId === event.managerPlayerId;
    io.to(player.socketId).emit('gameStarted', {
      eventId: event.id,
      groupCode,
      groupIndex: group.groupIndex,
      groupLabel,
      theme,
      role: isManagerPlayer ? 'manager' : 'player',
      myColors: player.assignedColors ?? [],
      teammates,
      // Permet au front d'identifier le manager parmi les coéquipiers (affichage couronne)
      managerPlayerId: event.managerPlayerId,
      ...sessionInfo,
    });
  }
}

/**
 * Diffuse l'événement `gameStarted` à tout le monde lors du lancement d'une session.
 * - En compétitif : chaque joueur reçoit son groupe assigné, tandis que le manager
 *   reçoit un récapitulatif complet de tous les groupes.
 * - En coopératif : redirige vers emitCoopGameStarted().
 * 
 * @param {Object} io - L'instance du serveur Socket.io.
 * @param {Object} event - L'événement concerné.
 */
export function emitGameStarted(io, event) {
  if (isCoop(event)) {
    emitCoopGameStarted(io, event);
    return;
  }

  const theme = event.theme;
  const sessionInfo = buildSessionInfo(event);

  for (const { groupCode, group } of getSortedGroups(event)) {
    const groupLabel = `Groupe ${group.groupIndex}`;
    for (const player of group.players) {
      updateSessionGroupCode(player.playerId, groupCode);
      io.to(player.socketId).emit('gameStarted', {
        eventId: event.id,
        groupCode,
        groupIndex: group.groupIndex,
        groupLabel,
        theme,
        role: 'player',
        myColors: player.assignedColors ?? [],
        teammates: group.players.map(toGroupPlayer),
        ...sessionInfo,
      });
    }
  }

  const groupsSummary = getSortedGroups(event).map(({ groupCode, group }) => ({
    groupCode,
    groupIndex: group.groupIndex,
    groupLabel: `Groupe ${group.groupIndex}`,
    players: group.players.map(toGroupPlayer),
  }));

  io.to(event.manager).emit('gameStarted', {
    eventId: event.id,
    theme,
    role: 'manager',
    groups: groupsSummary,
    ...sessionInfo,
  });
}

/**
 * Ferme et détruit complètement une partie (teardown).
 * Nettoie les timers en cours, purge les sessions de reconnexion actives du salon,
 * diffuse l'événement de fermeture globale `roomClosed` avec les images finales des groupes
 * et libère de la place sur le serveur.
 * 
 * @param {Object} io - L'instance du serveur Socket.io.
 * @param {string} eventId - L'identifiant de la partie.
 */
export function closeEvent(io, eventId) {
  const event = getEvent(eventId);
  if (!event) return;

  clearSessionTimer(event);
  clearManagerDisconnectTimer(event);
  purgeEventSessions(event);

  const images = getEventGroupImages(event);
  io.emit('roomClosed', { roomId: eventId, eventId, image: images });
  delete activeEvents[eventId];

  io.emit('serverCapacity', { maxCapReached: Object.keys(activeEvents).length >= MAX_ACTIVE_EVENTS });
}

/**
 * Parcourt les salons actifs et supprime ceux qui n'ont pas eu d'activité
 * depuis une durée supérieure à `ttlMs` (2 heures par défaut).
 * Cela évite les fuites de mémoire provoquées par des parties oubliées.
 * 
 * @param {Object} io - L'instance du serveur Socket.io.
 * @param {Object} activeEventsMap - La table des événements actifs.
 * @param {number} ttlMs - Le temps de vie maximum d'inactivité.
 */
export function sweepInactiveEvents(io, activeEventsMap, ttlMs) {
  const now = Date.now();
  for (const eventId in activeEventsMap) {
    const event = activeEventsMap[eventId];
    if (event && event.lastActivityAt) {
      const inactiveTime = now - event.lastActivityAt;
      if (inactiveTime > ttlMs) {
        closeEvent(io, eventId);
      }
    }
  }
}
