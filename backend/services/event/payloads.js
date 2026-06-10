import { GRID_SIZE } from '../../config/constants.js';
import { getSortedGroups } from '../../store/eventStore.js';
import {
  getParticipantRole,
  isRegistered,
  getParticipantPseudo,
} from './participants.js';
import { getEventGroupImages } from '../grid/preview.js';

export function toPublicPlayer({ socketId, pseudo, avatarColor }) {
  return { socketId, pseudo, avatarColor };
}

export function toGroupPlayer(player) {
  return {
    socketId: player.socketId,
    pseudo: player.pseudo,
    avatarColor: player.avatarColor,
    colors: player.assignedColors ?? [],
  };
}

export function toChatMessage(event, group, entry) {
  return {
    socketId: entry.socketId,
    pseudo: entry.pseudo ?? getParticipantPseudo(event, entry.socketId, group),
    message: entry.message,
    senderId: entry.socketId,
  };
}

export function buildWaitingRoomState(event, socketId) {
  const role = getParticipantRole(event, socketId);
  return {
    roomId: event.id,
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    name: event.name,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    status: event.status,
    role,
    hostProfile: event.hostProfile,
    players: event.players.map(toPublicPlayer),
    isRegistered: isRegistered(event, socketId),
  };
}

export function toLegacyLobbyRoom(event) {
  const groupCodes = Object.keys(event.groups);
  const firstGroup = groupCodes.length ? event.groups[groupCodes[0]] : null;
  const playersList = event.status === 'started'
    ? groupCodes.flatMap((code) => event.groups[code].players.map((p) => p.socketId))
    : [event.host, ...event.players.map((p) => p.socketId)];

  return {
    id: event.id,
    host: event.host,
    name: event.name,
    width: GRID_SIZE,
    height: GRID_SIZE,
    playersList: [...new Set(playersList)],
    status: event.status,
    groupCount: groupCodes.length,
    previewGroupCode: firstGroup ? groupCodes[0] : null,
  };
}

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
    status: event.status,
    groups,
    images: getEventGroupImages(event),
  };
}
