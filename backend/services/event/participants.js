import { AVATAR_COLOR_REGEX } from '../../config/constants.js';

export function isAvatarColorValid(color) {
  return typeof color === 'string' && AVATAR_COLOR_REGEX.test(color);
}

export function getParticipantRole(event, socketId) {
  return socketId === event.manager ? 'manager' : 'player';
}

export function isRegistered(event, socketId) {
  if (socketId === event.manager) {
    return Boolean(event.managerProfile);
  }
  return event.players.some((player) => player.socketId === socketId);
}

// group optionnel : pseudo depuis la copie joueur dans le groupe (post-shuffle)
export function getParticipantPseudo(event, socketId, group = null) {
  if (socketId === event.manager && event.managerProfile) {
    return event.managerProfile.pseudo;
  }

  if (group) {
    const inGroup = group.players.find((entry) => entry.socketId === socketId);
    if (inGroup) return inGroup.pseudo;
  }

  const player = event.players.find((entry) => entry.socketId === socketId);
  return player?.pseudo ?? 'Joueur';
}

export function removePlayerFromEvent(event, socketId) {
  if (socketId === event.manager) {
    return false;
  }

  const before = event.players.length;
  event.players = event.players.filter((player) => player.socketId !== socketId);
  return event.players.length !== before;
}

// lookup O(n) dans groups — ok vu le nb de groupes par session
export function findPlayerGroup(event, socketId) {
  for (const groupCode in event.groups) {
    const group = event.groups[groupCode];
    if (group.players.some((p) => p.socketId === socketId)) {
      return { groupCode, group };
    }
  }
  return null;
}
