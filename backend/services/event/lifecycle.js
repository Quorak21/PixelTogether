import { activeEvents, getEvent, getSortedGroups } from '../../store/eventStore.js';
import { toGroupPlayer } from './payloads.js';
import { getEventGroupImages } from '../grid/preview.js';

export function emitGameStarted(io, event) {
  const theme = event.name;
  const sessionInfo = {
    partyName: event.partyName,
    sessionCount: event.sessionCount,
    currentSession: event.currentSession,
  };

  for (const { groupCode, group } of getSortedGroups(event)) {
    const groupLabel = `Groupe ${group.groupIndex}`;
    for (const player of group.players) {
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

  io.to(event.host).emit('gameStarted', {
    eventId: event.id,
    theme,
    role: 'host',
    groups: groupsSummary,
    ...sessionInfo,
  });
}

export function closeEvent(io, eventId) {
  const event = getEvent(eventId);
  if (!event) return;

  const images = getEventGroupImages(event);
  io.emit('roomClosed', { roomId: eventId, eventId, image: images });
  delete activeEvents[eventId];
}
