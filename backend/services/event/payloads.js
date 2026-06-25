import { getSortedGroups } from '../../store/eventStore.js';
import {
  getParticipantRole,
  isRegistered,
  getParticipantPseudo,
  resolvePlayerId,
} from './participants.js';
import { getEventGroupImages } from '../grid/preview.js';
import { buildVoteFields } from '../vote/voteLifecycle.js';
import { isCoop } from './gameMode.js';

export function toPublicPlayer({ socketId, pseudo, avatarColor, playerId }) {
  return { socketId, pseudo, avatarColor, playerId };
}

export function toGroupPlayer(player) {
  return {
    socketId: player.socketId,
    playerId: player.playerId,
    pseudo: player.pseudo,
    avatarColor: player.avatarColor,
    colors: player.assignedColors ?? [],
  };
}

export function toChatMessage(event, group, entry) {
  if (entry.role === 'system') {
    return {
      socketId: entry.socketId ?? 'system',
      pseudo: entry.pseudo,
      message: entry.message,
      senderId: entry.playerId ?? 'system',
      role: 'system',
      systemRole: entry.systemRole,
    };
  }
  const isSenderManager = entry.role === 'manager' || 
                          entry.playerId === event?.managerPlayerId || 
                          (event?.manager && entry.socketId === event.manager);
  return {
    socketId: entry.socketId,
    pseudo: entry.pseudo ?? getParticipantPseudo(event, entry.socketId, group, entry.playerId),
    message: entry.message,
    senderId: entry.playerId ?? entry.socketId,
    role: isSenderManager ? 'manager' : 'player',
  };
}

function buildWaitingRoomBase(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  const role = getParticipantRole(event, socketId, pid);
  return {
    roomId: event.id,
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    name: event.name,
    gameMode: event.gameMode ?? 'competitive',
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    sessionDurationMinutes: event.sessionDurationMinutes,
    partyStarted: Boolean(event.partyStarted),
    status: event.status,
    role,
    managerProfile: event.managerProfile,
    players: event.players.map(toPublicPlayer),
    isRegistered: isRegistered(event, socketId, pid),
    playerId: pid,
  };
}

export function buildVotePayload(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  return {
    eventId: event.id,
    ...buildVoteFields(event, pid),
  };
}

export function buildSessionEndedPayload(event, socketId, playerId = null) {
  const pid = resolvePlayerId(event, socketId, playerId);
  return {
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    gameMode: event.gameMode ?? 'competitive',
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    partyStarted: event.partyStarted,
    players: event.players.map(toPublicPlayer),
    status: 'waiting',
    ...buildVoteFields(event, pid),
  };
}

// état WR complet = infos partie + champs vote (wrMode, candidats…)
export function buildWaitingRoomState(event, socketId, playerId = null) {
  return {
    ...buildWaitingRoomBase(event, socketId, playerId),
    ...buildVoteFields(event, resolvePlayerId(event, socketId, playerId)),
  };
}

/** État du canvas (pixels, couleurs, etc.) renvoyé pour la reconnexion ou joinGroup, avec les infos de session pour la nav bar. */
export function buildGridStatePayload(event, groupCode, socket, gridSize) {
  const group = event.groups[groupCode];
  if (!group) return null;

  const playerId = socket.data?.playerId;
  const isManagerSocket = playerId === event.managerPlayerId || socket.id === event.manager;
  const member = group.players.find(
    (p) => p.playerId === playerId || p.socketId === socket.id,
  );
  const playerColors = member?.assignedColors ?? [];
  const managerPlays = isCoop(event) && isManagerSocket;

  return {
    eventId: event.id,
    groupCode,
    groupIndex: group.groupIndex,
    groupLabel: isCoop(event) ? 'Discussion' : `Groupe ${group.groupIndex}`,
    partyName: event.partyName,
    theme: event.name,
    gameMode: event.gameMode ?? 'competitive',
    pixels: group.pixels,
    width: gridSize,
    height: gridSize,
    name: event.name,
    colors: isManagerSocket && !managerPlays ? [] : playerColors,
    role: isManagerSocket ? 'manager' : 'player',
    teammates: group.players.map(toGroupPlayer),
    sessionEndsAt: event.sessionEndsAt ?? null,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
  };
}

// payload lobby manager : groupes triés + previews + timer si session en cours
export function buildEventLobbyPayload(event) {
  const groups = getSortedGroups(event).map(({ groupCode, group }) => ({
    eventId: event.id,
    groupCode,
    groupIndex: group.groupIndex,
    label: `Groupe ${group.groupIndex}`,
    players: group.players.map(toGroupPlayer),
    image: group.image,
  }));

  return {
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    name: event.name,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    sessionDurationMinutes: event.sessionDurationMinutes,
    sessionEndsAt: event.status === 'started' ? (event.sessionEndsAt ?? null) : null,
    status: event.status,
    groups,
    images: getEventGroupImages(event),
  };
}
