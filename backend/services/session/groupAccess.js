import { findPlayerGroupByPlayerId } from '../event/participants.js';
import { isManager } from '../event/participants.js';
import { isCoop } from '../event/gameMode.js';

/** Résout le playerId stable à partir du socket (reconnexion, lobby joueur). */
export function resolveSocketPlayerId(event, socket) {
  const stored = socket.data?.playerId;
  if (stored) return stored;
  if (socket.id === event.manager) return event.managerPlayerId ?? null;
  return event.players.find((p) => p.socketId === socket.id)?.playerId ?? null;
}

export function getPlayerHomeGroup(event, playerId) {
  return findPlayerGroupByPlayerId(event, playerId);
}

export function canAccessLobby(event, playerId) {
  if (!playerId) return false;
  if (playerId === event.managerPlayerId) return true;
  const home = getPlayerHomeGroup(event, playerId);
  return Boolean(home?.group?.finished);
}

export function isGroupMember(group, socket, playerId) {
  return group.players.some(
    (p) => p.socketId === socket.id || (playerId && p.playerId === playerId),
  );
}

/** Spectateur = non-membre qui observe une autre grille (manager ou joueur au lobby). */
export function isGroupSpectator(event, socket, group) {
  const playerId = resolveSocketPlayerId(event, socket);
  if (isGroupMember(group, socket, playerId)) return false;
  if (isManager(event, socket)) return true;
  if (isCoop(event)) return false;
  return canAccessLobby(event, playerId);
}

export function allGroupsFinished(event) {
  const groups = Object.values(event.groups ?? {});
  return groups.length > 0 && groups.every((g) => g.finished);
}
