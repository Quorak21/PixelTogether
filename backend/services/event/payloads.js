import { getSortedGroups } from '../../store/eventStore.js';
import {
  getParticipantRole,
  isRegistered,
  getParticipantPseudo,
} from './participants.js';
import { getEventGroupImages } from '../grid/preview.js';
import { buildVoteFields } from '../vote/voteLifecycle.js';

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

function buildWaitingRoomBase(event, socketId) {
  const role = getParticipantRole(event, socketId);
  return {
    roomId: event.id,
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    name: event.name,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    sessionDurationMinutes: event.sessionDurationMinutes,
    partyStarted: Boolean(event.partyStarted),
    status: event.status,
    role,
    managerProfile: event.managerProfile,
    players: event.players.map(toPublicPlayer),
    isRegistered: isRegistered(event, socketId),
  };
}

export function buildVotePayload(event, socketId) {
  return {
    eventId: event.id,
    ...buildVoteFields(event, socketId),
  };
}

export function buildSessionEndedPayload(event, socketId) {
  return {
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    partyStarted: event.partyStarted,
    players: event.players.map(toPublicPlayer),
    status: 'waiting',
    ...buildVoteFields(event, socketId),
  };
}

// état WR complet = infos partie + champs vote (wrMode, candidats…)
export function buildWaitingRoomState(event, socketId) {
  return {
    ...buildWaitingRoomBase(event, socketId),
    ...buildVoteFields(event, socketId),
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
