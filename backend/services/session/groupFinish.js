import { buildEventLobbyPayload } from '../event/payloads.js';
import { groupRoomName } from '../../store/eventStore.js';
import { finishCurrentSession } from './sessionLifecycle.js';
import { allGroupsFinished } from './groupAccess.js';

function emitGroupFinishProgress(io, eventId, groupCode, group) {
  const roomName = groupRoomName(eventId, groupCode);
  io.to(roomName).emit('groupFinishProgress', {
    eventId,
    groupCode,
    finishedCount: group.finishedPlayerIds.length,
    totalCount: group.players.length,
    finishedPlayerIds: [...group.finishedPlayerIds],
  });
}

function emitLobbyGroupsUpdated(io, event) {
  const { groups, images } = buildEventLobbyPayload(event);
  io.to(event.id).emit('lobbyGroupsUpdated', {
    eventId: event.id,
    groups,
    images,
  });
}

function emitGroupFinished(io, event, groupCode, group) {
  for (const player of group.players) {
    if (player.socketId) {
      io.to(player.socketId).emit('groupFinished', { eventId: event.id, groupCode });
    }
  }
}

export function completeGroup(io, event, groupCode) {
  const group = event.groups[groupCode];
  if (!group || group.finished) return;

  group.finished = true;
  emitGroupFinished(io, event, groupCode, group);
  emitLobbyGroupsUpdated(io, event);

  if (allGroupsFinished(event)) {
    finishCurrentSession(io, event);
  }
}

export function markPlayerFinished(io, event, group, playerId) {
  if (group.finished) return null;
  if (!group.finishedPlayerIds) {
    group.finishedPlayerIds = [];
  }
  if (group.finishedPlayerIds.includes(playerId)) {
    return {
      finishedCount: group.finishedPlayerIds.length,
      totalCount: group.players.length,
    };
  }

  group.finishedPlayerIds.push(playerId);
  emitGroupFinishProgress(io, event.id, group.groupCode, group);

  const finishedCount = group.finishedPlayerIds.length;
  const totalCount = group.players.length;

  if (finishedCount >= totalCount) {
    completeGroup(io, event, group.groupCode);
  }

  return { finishedCount, totalCount };
}
