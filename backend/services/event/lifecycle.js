import { activeEvents, getEvent, getSortedGroups } from '../../store/eventStore.js';
import { toGroupPlayer } from './payloads.js';
import { getEventGroupImages } from '../grid/preview.js';
import { clearSessionTimer } from '../session/sessionTimer.js';
import { purgeEventSessions, updateSessionGroupCode } from '../reconnect/sessionToken.js';
import { clearManagerDisconnectTimer } from './participants.js';
import { isCoop } from './gameMode.js';

function buildSessionInfo(event) {
  return {
    partyName: event.partyName,
    gameMode: event.gameMode,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
    sessionEndsAt: event.sessionEndsAt ?? null,
  };
}

function emitCoopGameStarted(io, event) {
  const theme = event.name;
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
      ...sessionInfo,
    });
  }
}

// push gameStarted : joueurs → leur groupe, manager → résumé de tous les groupes
export function emitGameStarted(io, event) {
  if (isCoop(event)) {
    emitCoopGameStarted(io, event);
    return;
  }

  const theme = event.name;
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

// teardown complet : timer, roomClosed global, delete activeEvents
export function closeEvent(io, eventId) {
  const event = getEvent(eventId);
  if (!event) return;

  clearSessionTimer(event);
  clearManagerDisconnectTimer(event);
  purgeEventSessions(event);

  const images = getEventGroupImages(event);
  io.emit('roomClosed', { roomId: eventId, eventId, image: images });
  delete activeEvents[eventId];
}
