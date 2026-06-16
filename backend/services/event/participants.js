import { AVATAR_COLOR_REGEX, MANAGER_DISCONNECT_TIMEOUT_MS, MANAGER_ABSENT_WARNING_MS } from '../../config/constants.js';
import { setSessionConnected } from '../reconnect/sessionToken.js';

export function isAvatarColorValid(color) {
  return typeof color === 'string' && AVATAR_COLOR_REGEX.test(color);
}

/** Résout le playerId stable depuis le socket ou l'event. */
export function resolvePlayerId(event, socketId, playerId = null) {
  if (playerId) return playerId;
  if (socketId === event.manager) return event.managerPlayerId ?? null;
  return event.players.find((player) => player.socketId === socketId)?.playerId ?? null;
}

export function getParticipantRole(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  if (pid === event.managerPlayerId || socketId === event.manager) {
    return 'manager';
  }
  return 'player';
}

export function isManager(event, socket) {
  return socket.id === event.manager || socket.data?.playerId === event.managerPlayerId;
}

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
 * Met à jour le socketId partout après reconnexion.
 * Les votes sont indexés par playerId — pas de migration nécessaire.
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

export function clearManagerDisconnectTimer(event) {
  if (event._managerDisconnectTimer) {
    clearTimeout(event._managerDisconnectTimer);
    event._managerDisconnectTimer = null;
  }
  if (event._managerDisconnectWarningTimer) {
    clearTimeout(event._managerDisconnectWarningTimer);
    event._managerDisconnectWarningTimer = null;
  }
  event.managerDisconnectedAt = null;
}

export function scheduleManagerAbsentClose(io, event, eventId, closeEvent) {
  clearManagerDisconnectTimer(event);
  event.managerDisconnectedAt = Date.now();

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
}
