import { splitIntoGroups } from '../shuffle/groupShuffle.js';
import { assignPalettesToGroup } from '../colors/colorSplit.js';
import { buildSessionEndedPayload } from '../event/payloads.js';
import { snapshotSessionForVote, snapshotSessionArchive } from '../vote/voteLifecycle.js';
import { isManager, isRegistered, resolvePlayerId } from '../event/participants.js';
import { isCoop } from '../event/gameMode.js';
import { flushAllEventPreviews } from '../grid/preview.js';
import { clearPartyChat } from '../chat/partyChat.js';
import { scheduleSessionEnd } from './sessionTimer.js';
import { onVotePhaseOpened } from '../event/autoPilot.js';

export function clearSessionTimer(event) {
  if (event._sessionTimer) {
    clearTimeout(event._sessionTimer);
    event._sessionTimer = null;
  }
}

function buildCoopGroupMembers(event) {
  const members = event.players.map((p) => ({ ...p }));

  if (event.managerProfile) {
    members.push({
      playerId: event.managerPlayerId,
      socketId: event.manager,
      pseudo: event.managerProfile.pseudo,
      avatarColor: event.managerProfile.avatarColor,
      role: 'manager',
    });
  }

  return members;
}

function beginCoopSession(event, deps) {
  const { store, preview } = deps;
  const { generateGroupCode } = store;
  const { updateGroupPreview } = preview;

  const eventId = event.id;
  const groupCode = generateGroupCode(event);
  const group = {
    groupCode,
    groupIndex: 1,
    players: buildCoopGroupMembers(event),
    pixels: {},
    chatMessages: [],
    visitors: [],
    image: null,
  };

  assignPalettesToGroup(group);
  event.groups = { [groupCode]: group };
  updateGroupPreview(eventId, groupCode);

  return event.groups;
}

// reshuffle joueurs, assigne palettes, génère previews — appelé à chaque startGame
export function beginSession(event, deps) {
  if (isCoop(event)) {
    return beginCoopSession(event, deps);
  }

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
      visitors: [],
      image: null,
      finishedPlayerIds: [],
      finished: false,
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
  const recipients = [
    { playerId: event.managerPlayerId, socketId: event.manager },
    ...event.players.map((p) => ({ playerId: p.playerId, socketId: p.socketId })),
  ];
  const seen = new Set();

  for (const { playerId, socketId } of recipients) {
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    io.to(socketId).emit('sessionEnded', buildSessionEndedPayload(event, socketId, playerId));
  }
}

// fin auto (timer) ou manuelle (endSession) — archive, vote, bump session si pas la dernière
export function finishCurrentSession(io, event) {
  clearSessionTimer(event);
  flushAllEventPreviews(event);

  const isLastSession = event.currentSession >= event.sessionCount;

  if (isCoop(event)) {
    snapshotSessionArchive(event);
    event.coopWrMode = isLastSession ? 'gallery' : 'sessionResult';
    event.activeVote = null;
  } else {
    snapshotSessionForVote(event);
  }

  dissolveSessionGroups(event);
  clearPartyChat(io, event);

  if (!isLastSession) {
    event.currentSession += 1;
    event.name = event.themes[event.currentSession - 1];
  }

  emitSessionEnded(io, event);

  if (!isCoop(event)) {
    onVotePhaseOpened(io, event);
  }
}

/**
 * Démarre une session de dessin (appel manager ou pilote auto).
 */
export function runStartGame(io, event, deps) {
  const voteStatus = event.activeVote?.status;
  if (voteStatus === 'open' || voteStatus === 'tiebreak' || voteStatus === 'tiebreak_roulette') {
    return { error: 'Terminez le vote avant de démarrer la session.' };
  }

  if (event.status !== 'waiting') {
    return { error: 'La partie est déjà lancée.' };
  }

  event.status = 'started';
  event.activeVote = null;
  event.coopWrMode = null;
  event.theme = event.themes[event.currentSession - 1];
  event.name = event.theme;
  beginSession(event, deps);

  if (!isCoop(event)) {
    scheduleSessionEnd(event, io);
  }

  deps.lifecycle.emitGameStarted(io, event);
  return { ok: true, eventId: event.id };
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

  if (!isManager(event, socket)) {
    const playerId = socket.data?.playerId ?? resolvePlayerId(event, socket.id);
    const coopOverride = isCoop(event) && event.coopManagerAbsent && isRegistered(event, socket.id, playerId);
    if (!coopOverride) {
      if (typeof callback === 'function') callback({ error: 'Seul le manager peut terminer la session.' });
      return;
    }
  }

  if (event.status !== 'started') {
    if (typeof callback === 'function') callback({ error: 'Aucune session en cours.' });
    return;
  }

  finishCurrentSession(io, event);
  if (typeof callback === 'function') callback({ ok: true, eventId: event.id });
}
