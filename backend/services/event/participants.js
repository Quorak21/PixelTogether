import {
  AVATAR_COLOR_REGEX,
  MANAGER_DISCONNECT_TIMEOUT_MS,
  MANAGER_ABSENT_WARNING_MS,
  COOP_MANAGER_ABSENT_MODAL_MS,
} from '../../config/constants.js';
import { getSessionByPlayerId, setSessionConnected } from '../reconnect/sessionToken.js';
import { isCoop } from './gameMode.js';

/**
 * Vérifie si la couleur passée correspond bien au format hexadécimal attendu pour un avatar.
 * Exemple valide : "#ff5733".
 */
export function isAvatarColorValid(color) {
  return typeof color === 'string' && AVATAR_COLOR_REGEX.test(color);
}

/**
 * Résout et retrouve le `playerId` stable d'un participant.
 * Les sockets changent lors d'une déconnexion/reconnexion, mais le `playerId` reste identique
 * pour identifier l'utilisateur au cours de la session de jeu.
 * 
 * @param {Object} event - L'événement.
 * @param {string} socketId - L'ID de socket actuel.
 * @param {string} [playerId=null] - Le playerId s'il est déjà connu pour court-circuiter la recherche.
 * @returns {string|null} Le playerId trouvé ou null.
 */
export function resolvePlayerId(event, socketId, playerId = null) {
  if (playerId) return playerId;
  if (socketId === event.manager) return event.managerPlayerId ?? null;
  return event.players.find((player) => player.socketId === socketId)?.playerId ?? null;
}

/**
 * Détermine le rôle du participant ('manager' ou 'player').
 */
export function getParticipantRole(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  if (pid === event.managerPlayerId || socketId === event.manager) {
    return 'manager';
  }
  return 'player';
}

/**
 * Indique si le socket ou playerId spécifié correspond au manager de l'événement.
 */
export function isManager(event, socket) {
  return socket.id === event.manager || socket.data?.playerId === event.managerPlayerId;
}

/**
 * Vérifie si l'utilisateur est bien enregistré dans les joueurs inscrits ou s'il s'agit du manager.
 */
export function isRegistered(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  if (pid === event.managerPlayerId || socketId === event.manager) {
    return Boolean(event.managerProfile);
  }
  if (pid) {
    return event.players.some((player) => player.playerId === pid);
  }
  return event.players.some((player) => player.socketId === socketId);
}

/**
 * Récupère le pseudo d'un participant dans l'événement ou dans un groupe spécifique.
 * Retourne 'Joueur' si le participant est introuvable.
 */
export function getParticipantPseudo(event, socketId, group = null, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);

  if ((socketId === event.manager || pid === event.managerPlayerId) && event.managerProfile) {
    return event.managerProfile.pseudo;
  }

  if (group) {
    const inGroup = group.players.find(
      (entry) => entry.socketId === socketId || (pid && entry.playerId === pid),
    );
    if (inGroup) return inGroup.pseudo;
  }

  const player = event.players.find(
    (entry) => entry.socketId === socketId || (pid && entry.playerId === pid),
  );
  return player?.pseudo ?? 'Joueur';
}

/**
 * Retire un joueur de la liste des joueurs de l'événement.
 * Ne s'applique pas au manager de la partie.
 */
export function removePlayerFromEvent(event, socketId, playerId = null) {
  if (socketId === event.manager || playerId === event.managerPlayerId) {
    return false;
  }

  const pid = resolvePlayerId(event, socketId, playerId);
  const before = event.players.length;

  if (pid) {
    event.players = event.players.filter((player) => player.playerId !== pid);
  } else {
    event.players = event.players.filter((player) => player.socketId !== socketId);
  }

  return event.players.length !== before;
}

/**
 * Cherche dans quel groupe de l'événement se trouve le joueur spécifié.
 */
export function findPlayerGroup(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);

  for (const groupCode in event.groups) {
    const group = event.groups[groupCode];
    const match = group.players.some(
      (player) =>
        player.socketId === socketId || (pid && player.playerId === pid),
    );
    if (match) {
      return { groupCode, group };
    }
  }
  return null;
}

/**
 * Trouve le groupe d'un joueur directement en utilisant son `playerId`.
 */
export function findPlayerGroupByPlayerId(event, playerId) {
  if (!playerId) return null;

  for (const groupCode in event.groups) {
    const group = event.groups[groupCode];
    if (group.players.some((player) => player.playerId === playerId)) {
      return { groupCode, group };
    }
  }
  return null;
}

/**
 * Met à jour le socketId d'un joueur dans toutes les structures après une reconnexion réussie.
 * Cela réassocie son nouveau socket à son playerId existant dans l'event, ses groupes,
 * et met à jour sa session active.
 */
export function remapSocket(event, playerId, newSocketId) {
  if (playerId === event.managerPlayerId) {
    event.manager = newSocketId;
  }

  for (const player of event.players) {
    if (player.playerId === playerId) {
      player.socketId = newSocketId;
    }
  }

  for (const group of Object.values(event.groups)) {
    for (const player of group.players) {
      if (player.playerId === playerId) {
        player.socketId = newSocketId;
      }
    }
  }

  setSessionConnected(playerId, true, newSocketId);
}

/**
 * Annule les minuteurs de déconnexion du manager.
 * Si le manager revient à temps, on stoppe la procédure de fermeture automatique.
 */
export function isManagerConnected(event) {
  if (!event.managerPlayerId) return false;
  const session = getSessionByPlayerId(event.managerPlayerId);
  return Boolean(session?.connected);
}

export function clearManagerDisconnectTimer(event) {
  if (event._managerDisconnectTimer) {
    clearTimeout(event._managerDisconnectTimer);
    event._managerDisconnectTimer = null;
  }
  if (event._managerDisconnectWarningTimer) {
    clearTimeout(event._managerDisconnectWarningTimer);
    event._managerDisconnectWarningTimer = null;
  }
  if (event._coopAbsentTimer) {
    clearTimeout(event._coopAbsentTimer);
    event._coopAbsentTimer = null;
  }
  event.managerDisconnectedAt = null;
}

/**
 * Lance le minuteur de grâce si le manager se déconnecte.
 * Le serveur donne un délai de MANAGER_DISCONNECT_TIMEOUT_MS (5 min par défaut)
 * au manager pour se reconnecter. 
 * Un premier avertissement est envoyé peu avant la fin, et si le délai expire,
 * la room est fermée automatiquement via closeEvent.
 */
export function scheduleManagerAbsentClose(io, event, eventId, closeEvent) {
  clearManagerDisconnectTimer(event);
  event.managerDisconnectedAt = Date.now();

  if (event.partyStarted) {
    if (!isCoop(event)) {
      event.autoPilot = { active: true };
      if (!event.showingResults) {
        io.to(eventId).emit('managerAbsentBanner', {
          eventId,
          roomId: eventId,
          message: 'Le manager est absent — la partie continue automatiquement.',
          mode: 'competitive',
        });
      }
      return 'auto_pilot';
    }

    event._coopAbsentTimer = setTimeout(() => {
      event._coopAbsentTimer = null;
      event.coopManagerAbsent = true;
      io.to(eventId).emit('managerAbsentCoop', {
        eventId,
        roomId: eventId,
        message: 'Le manager est absent — les joueurs peuvent terminer la session à tout moment.',
      });
    }, COOP_MANAGER_ABSENT_MODAL_MS);
    return 'coop_wait';
  }

  const warningDelay = Math.max(0, MANAGER_DISCONNECT_TIMEOUT_MS - MANAGER_ABSENT_WARNING_MS);

  event._managerDisconnectWarningTimer = setTimeout(() => {
    io.to(eventId).emit('managerAbsentWarning', {
      eventId,
      roomId: eventId,
      message: 'Le manager est absent. La partie va se fermer dans quelques secondes.',
      closesInMs: MANAGER_ABSENT_WARNING_MS,
    });
  }, warningDelay);

  event._managerDisconnectTimer = setTimeout(() => {
    io.to(eventId).emit('managerAbsent', {
      eventId,
      roomId: eventId,
      message: 'Le manager est absent depuis trop longtemps. La partie est fermée.',
    });
    closeEvent(io, eventId);
  }, MANAGER_DISCONNECT_TIMEOUT_MS);

  return 'close';
}

/** Visiteur en salle d'attente sans pseudo validé (onboarding ouvert). */
export function toPublicPendingPlayer({ playerId, socketId }) {
  return { playerId, socketId };
}

export function addPendingPlayer(event, { playerId, socketId }) {
  if (!event.pendingPlayers) {
    event.pendingPlayers = [];
  }
  const index = event.pendingPlayers.findIndex((entry) => entry.playerId === playerId);
  const entry = { playerId, socketId };
  if (index >= 0) {
    event.pendingPlayers[index] = entry;
  } else {
    event.pendingPlayers.push(entry);
  }
}

export function removePendingPlayer(event, { playerId = null, socketId = null } = {}) {
  if (!event.pendingPlayers?.length) {
    return false;
  }
  const before = event.pendingPlayers.length;
  event.pendingPlayers = event.pendingPlayers.filter(
    (entry) =>
      !(playerId && entry.playerId === playerId) &&
      !(socketId && entry.socketId === socketId),
  );
  return event.pendingPlayers.length !== before;
}
