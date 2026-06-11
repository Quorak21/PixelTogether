import { splitIntoGroups } from '../shuffle/groupShuffle.js';
import { assignPalettesToGroup } from '../colors/colorSplit.js';
import { buildSessionEndedPayload } from '../event/payloads.js';
import { snapshotSessionForVote } from '../vote/voteLifecycle.js';

export function clearSessionTimer(event) {
  if (event._sessionTimer) {
    clearTimeout(event._sessionTimer);
    event._sessionTimer = null;
  }
}

// reshuffle joueurs, assigne palettes, génère previews — appelé à chaque startGame
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

// vide les groupes sans toucher aux joueurs ni à l'archive vote
export function dissolveSessionGroups(event) {
  event.groups = {};
  event.status = 'waiting';
}

// payload personnalisé par socket (myVote, wrMode, etc.)
export function emitSessionEnded(io, event) {
  const recipients = [event.manager, ...event.players.map((p) => p.socketId)];
  const seen = new Set(); // manager peut aussi être dans players[] en théorie

  for (const socketId of recipients) {
    if (seen.has(socketId)) continue;
    seen.add(socketId);
    io.to(socketId).emit('sessionEnded', buildSessionEndedPayload(event, socketId));
  }
}

// fin auto (timer) ou manuelle (endSession) — archive, vote, bump session si pas la dernière
export function finishCurrentSession(io, event) {
  clearSessionTimer(event);

  snapshotSessionForVote(event);

  const isLastSession = event.currentSession >= event.sessionCount;

  dissolveSessionGroups(event);

  if (!isLastSession) {
    event.currentSession += 1;
    event.name = event.themes[event.currentSession - 1]; // thème de la prochaine session
  }

  emitSessionEnded(io, event);
}

// arrêt anticipé depuis le lobby manager (équivalent au timer)
export function handleEndSession(socket, data, callback, deps) {
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    if (typeof callback === 'function') callback({ error: "La partie n'existe pas." });
    return;
  }

  if (socket.id !== event.manager) {
    if (typeof callback === 'function') callback({ error: 'Seul le manager peut arrêter la session.' });
    return;
  }

  if (event.status !== 'started') {
    if (typeof callback === 'function') callback({ error: 'Aucune session en cours.' });
    return;
  }

  finishCurrentSession(io, event);
  if (typeof callback === 'function') callback({ ok: true, eventId: event.id });
}
