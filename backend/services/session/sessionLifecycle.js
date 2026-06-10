import { splitIntoGroups } from '../shuffle/groupShuffle.js';
import { assignPalettesToGroup } from '../colors/colorSplit.js';
import { toPublicPlayer } from '../event/payloads.js';

export function beginSession(event, deps) {
  const { store, preview } = deps;
  const { generateGroupCode } = store;
  const { updateGroupPreview } = preview;

  const eventId = event.id;
  const playerGroups = splitIntoGroups(event.players);
  event.groups = {};

  playerGroups.forEach((members, index) => {
    const groupIndex = index + 1;
    const groupCode = generateGroupCode(event);
    const group = {
      groupCode,
      groupIndex,
      players: members.map((p) => ({ ...p })),
      pixels: {},
      chatMessages: [],
      image: null,
    };
    assignPalettesToGroup(group);
    event.groups[groupCode] = group;
    updateGroupPreview(eventId, groupCode);
  });

  return event.groups;
}

export function dissolveSessionGroups(event) {
  event.groups = {};
  event.status = 'waiting';
}

export function emitSessionEnded(io, event) {
  const payload = {
    eventId: event.id,
    partyName: event.partyName,
    theme: event.name,
    players: event.players.map(toPublicPlayer),
    status: 'waiting',
  };

  io.to(event.host).emit('sessionEnded', payload);
  for (const player of event.players) {
    io.to(player.socketId).emit('sessionEnded', payload);
  }
  io.to(event.id).emit('sessionEnded', payload);
}

export function handleEndSession(socket, data, callback, deps) {
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    if (typeof callback === 'function') callback({ error: "La partie n'existe pas." });
    return;
  }

  if (socket.id !== event.host) {
    if (typeof callback === 'function') callback({ error: 'Seul le manager peut arrêter la session.' });
    return;
  }

  if (event.status !== 'started') {
    if (typeof callback === 'function') callback({ error: 'Aucune session en cours.' });
    return;
  }

  dissolveSessionGroups(event);
  emitSessionEnded(io, event);
  if (typeof callback === 'function') callback({ ok: true, eventId: event.id });
}
