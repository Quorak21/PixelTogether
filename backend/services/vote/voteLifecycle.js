import { getSortedGroups } from '../../store/eventStore.js';
import { getParticipantRole } from '../event/participants.js';

export function getArchiveSession(event, sessionNumber) {
  return event.sessionArchive?.find((entry) => entry.sessionNumber === sessionNumber) ?? null;
}

// copie les groupes dans sessionArchive et ouvre activeVote
export function snapshotSessionForVote(event) {
  const sessionNumber = event.currentSession;
  const theme = event.themes[sessionNumber - 1] ?? event.name;

  const groups = getSortedGroups(event).map(({ groupCode, group }) => ({
    groupCode,
    groupIndex: group.groupIndex,
    label: `Groupe ${group.groupIndex}`,
    image: group.image ?? null,
    voteCount: 0,
    players: group.players.map((p) => ({
      socketId: p.socketId,
      pseudo: p.pseudo,
      avatarColor: p.avatarColor,
    })),
  }));

  if (!event.sessionArchive) {
    event.sessionArchive = [];
  }

  event.sessionArchive.push({ sessionNumber, theme, groups });

  event.activeVote = {
    sessionNumber,
    status: 'open',
    votes: {},
    winnerGroupCode: null,
  };
}

// incrémente voteCount du groupe + cumul par joueur (pour le podium)
export function applyVoteDelta(event, groupCode, delta) {
  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) return;

  const group = archive.groups.find((g) => g.groupCode === groupCode);
  if (!group) return;

  group.voteCount += delta;
  for (const player of group.players) {
    const key = player.socketId;
    event.playerVoteTotals[key] = (event.playerVoteTotals[key] ?? 0) + delta;
  }
}

// égalité → groupe au groupIndex le plus bas
export function pickWinner(archiveSession) {
  if (!archiveSession?.groups?.length) return null;

  let winner = archiveSession.groups[0];
  for (const group of archiveSession.groups) {
    if (group.voteCount > winner.voteCount) {
      winner = group;
    } else if (group.voteCount === winner.voteCount && group.groupIndex < winner.groupIndex) {
      winner = group;
    }
  }
  return winner.groupCode;
}

export function buildTopPlayers(event, limit = 3) {
  const totals = event.playerVoteTotals ?? {};
  const playerById = new Map(event.players.map((p) => [p.socketId, p]));

  const ranked = Object.entries(totals)
    .map(([socketId, voteTotal]) => {
      const player = playerById.get(socketId);
      if (!player) return null;
      return {
        socketId,
        pseudo: player.pseudo,
        avatarColor: player.avatarColor,
        voteTotal,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.voteTotal - a.voteTotal || a.pseudo.localeCompare(b.pseudo))
    .slice(0, limit);

  return ranked.map((entry, index) => ({
    rank: index + 1,
    pseudo: entry.pseudo,
    avatarColor: entry.avatarColor,
    voteTotal: entry.voteTotal,
  }));
}

export function buildTopGrids(event, limit = 3) {
  const grids = [];

  for (const session of event.sessionArchive ?? []) {
    for (const group of session.groups) {
      grids.push({
        groupCode: group.groupCode,
        groupIndex: group.groupIndex,
        sessionNumber: session.sessionNumber,
        label: `${group.label} — Session ${session.sessionNumber}`,
        image: group.image ?? null,
        voteCount: group.voteCount,
      });
    }
  }

  grids.sort(
    (a, b) =>
      b.voteCount - a.voteCount ||
      a.sessionNumber - b.sessionNumber ||
      a.groupIndex - b.groupIndex,
  );

  return grids.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    label: entry.label,
    image: entry.image,
    voteCount: entry.voteCount,
  }));
}

// pilote l'UI waiting room (boutons manager, grille vote, podium…)
export function getWrMode(event) {
  if (event.showingResults) return 'podium';
  if (!event.partyStarted) return 'players';
  if (event.activeVote?.status === 'open') return 'voting';
  if (event.activeVote?.status === 'closed') return 'voteResult';
  return 'players';
}

export function isLastVote(event) {
  if (!event.activeVote) return false;
  return event.activeVote.sessionNumber >= event.sessionCount;
}

export function buildVoteCandidates(event) {
  if (!event.activeVote) return [];

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) return [];

  return archive.groups.map((g) => ({
    groupCode: g.groupCode,
    groupIndex: g.groupIndex,
    label: g.label,
    image: g.image,
    voteCount: g.voteCount,
  }));
}

export function buildVoteFields(event, socketId) {
  const wrMode = getWrMode(event);

  if (wrMode === 'podium') {
    return {
      wrMode,
      voteCandidates: [],
      myVote: null,
      winnerGroupCode: null,
      winnerImage: null,
      isLastVote: true,
      topPlayers: buildTopPlayers(event),
      topGrids: buildTopGrids(event),
    };
  }

  const voteCandidates = wrMode === 'voting' || wrMode === 'voteResult' ? buildVoteCandidates(event) : [];
  const myVote = event.activeVote?.votes?.[socketId] ?? null;
  const winnerGroupCode = event.activeVote?.winnerGroupCode ?? null;
  const winnerCandidate =
    winnerGroupCode != null ? voteCandidates.find((c) => c.groupCode === winnerGroupCode) ?? null : null;

  return {
    wrMode,
    voteCandidates,
    myVote,
    winnerGroupCode,
    winnerImage: winnerCandidate?.image ?? null,
    isLastVote: isLastVote(event),
    topPlayers: [],
    topGrids: [],
  };
}

export function canParticipateInVote(event, socketId) {
  const role = getParticipantRole(event, socketId);
  if (role === 'manager') {
    return Boolean(event.managerProfile);
  }
  return event.players.some((p) => p.socketId === socketId);
}

// change de vote autorisé — delta appliqué sur l'ancien choix si besoin
export function castVote(event, socketId, groupCode) {
  if (event.status !== 'waiting' || !event.activeVote || event.activeVote.status !== 'open') {
    return { error: 'Le vote n\'est pas ouvert.' };
  }

  if (!canParticipateInVote(event, socketId)) {
    return { error: 'Vous ne pouvez pas voter.' };
  }

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) {
    return { error: 'Session de vote introuvable.' };
  }

  const target = archive.groups.find((g) => g.groupCode === groupCode);
  if (!target) {
    return { error: 'Œuvre invalide.' };
  }

  const weight = 1;
  const previous = event.activeVote.votes[socketId];

  if (previous === groupCode) {
    return { ok: true };
  }

  if (previous) {
    applyVoteDelta(event, previous, -weight);
  }

  event.activeVote.votes[socketId] = groupCode;
  applyVoteDelta(event, groupCode, weight);

  return { ok: true };
}

export function closeVote(event) {
  if (!event.activeVote || event.activeVote.status !== 'open') {
    return { error: 'Aucun vote en cours.' };
  }

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  event.activeVote.status = 'closed';
  event.activeVote.winnerGroupCode = pickWinner(archive);

  return { ok: true };
}

export function handleCastVote(socket, data, callback, deps) {
  const { io, store } = deps;
  const { activeEvents, normalizeEventId, normalizeGroupCode } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const groupCode = normalizeGroupCode(data?.groupCode);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  const result = castVote(event, socket.id, groupCode);
  if (result.error) {
    return callback({ error: result.error });
  }

  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, socket.id));
}

function votePayloadFor(event, socketId) {
  return {
    eventId: event.id,
    ...buildVoteFields(event, socketId),
  };
}

// chaque client reçoit son myVote + wrMode (pas un broadcast identique)
function emitVoteStateUpdated(io, event) {
  const recipients = [event.manager, ...event.players.map((p) => p.socketId)];
  const seen = new Set();

  for (const socketId of recipients) {
    if (seen.has(socketId)) continue;
    seen.add(socketId);
    io.to(socketId).emit('voteStateUpdated', votePayloadFor(event, socketId));
  }
}

export function handleCloseVote(socket, data, callback, deps) {
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (socket.id !== event.manager) {
    return callback({ error: 'Seul le manager peut clôturer le vote.' });
  }

  const result = closeVote(event);
  if (result.error) {
    return callback({ error: result.error });
  }

  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, socket.id));
}

// réservé au dernier vote — active le mode podium
export function openResults(event) {
  if (!event.activeVote || event.activeVote.status !== 'closed') {
    return { error: 'Le vote n\'est pas terminé.' };
  }

  if (!isLastVote(event)) {
    return { error: 'Ce n\'est pas le dernier vote.' };
  }

  if (event.showingResults) {
    return { error: 'Les résultats sont déjà affichés.' };
  }

  event.showingResults = true;
  return { ok: true };
}

export function handleShowResults(socket, data, callback, deps) {
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (socket.id !== event.manager) {
    return callback({ error: 'Seul le manager peut afficher les résultats.' });
  }

  const result = openResults(event);
  if (result.error) {
    return callback({ error: result.error });
  }

  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, socket.id));
}

// ordre imposé : closeVote → showResults → endParty (sinon erreur)
export function handleEndParty(socket, data, callback, deps) {
  const { io, store, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { closeEvent } = lifecycle;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (socket.id !== event.manager) {
    return callback({ error: 'Seul le manager peut terminer la partie.' });
  }

  if (!event.showingResults) {
    return callback({ error: 'Affichez les résultats avant de terminer la partie.' });
  }

  callback({ ok: true, eventId: event.id });
  closeEvent(io, event.id);
  socket.leave(eventId);
}
