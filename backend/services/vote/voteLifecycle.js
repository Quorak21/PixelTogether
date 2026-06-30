import { getSortedGroups } from '../../store/eventStore.js';
import { getParticipantRole, isManager } from '../event/participants.js';
import { isCoop } from '../event/gameMode.js';
import { getWrMode as resolveWrMode } from '../event/wrPhase.js';
import { VOTE_COOLDOWN_MS } from '../../config/constants.js';
import { guardAck, isRateLimited } from '../../sockets/handlers/socketGuards.js';
import { clearPartyChat } from '../chat/partyChat.js';

/**
 * Récupère les données archivées d'une session passée (dessins, groupes, votes reçus)
 * à partir de son index `sessionNumber`.
 */
export function getArchiveSession(event, sessionNumber) {
  return event.sessionArchive?.find((entry) => entry.sessionNumber === sessionNumber) ?? null;
}

/**
 * Prend un instantané (snapshot) de la session coopérative en cours et l'enregistre
 * dans l'historique des sessions (`sessionArchive`).
 * En mode coop, il n'y a pas de vote, on archive juste le dessin pour l'afficher plus tard dans la galerie.
 */
export function snapshotSessionArchive(event) {
  const sessionNumber = event.currentSession;
  const theme = event.themes[sessionNumber - 1] ?? event.theme;

  const groups = getSortedGroups(event).map(({ groupCode, group }) => ({
    groupCode,
    groupIndex: group.groupIndex,
    label: isCoop(event) ? theme : `Groupe ${group.groupIndex}`,
    image: group.image ?? null,
    voteCount: 0,
    players: group.players.map((p) => ({
      socketId: p.socketId,
      playerId: p.playerId,
      pseudo: p.pseudo,
      avatarColor: p.avatarColor,
    })),
  }));

  if (!event.sessionArchive) {
    event.sessionArchive = [];
  }

  event.sessionArchive.push({ sessionNumber, theme, groups });
}

/**
 * Prend un instantané des groupes et dessins de la session compétitive actuelle pour l'archiver
 * et ouvre immédiatement une session de vote (`event.activeVote`) afin que les joueurs
 * puissent désigner leur création préférée.
 */
export function snapshotSessionForVote(event) {
  const sessionNumber = event.currentSession;
  const theme = event.themes[sessionNumber - 1] ?? event.theme;

  const groups = getSortedGroups(event).map(({ groupCode, group }) => ({
    groupCode,
    groupIndex: group.groupIndex,
    label: `Groupe ${group.groupIndex}`,
    image: group.image ?? null,
    voteCount: 0,
    players: group.players.map((p) => ({
      socketId: p.socketId,
      playerId: p.playerId,
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
    tiedGroupCodes: null,
  };
}

/**
 * Ajuste les compteurs de vote après qu'un joueur a voté (ou changé d'avis).
 * Met à jour le nombre total de votes du groupe cible dans l'archive,
 * et met à jour le cumul de points (`playerVoteTotals`) de chaque dessinateur du groupe pour le classement final.
 */
export function applyVoteDelta(event, groupCode, delta) {
  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) return;

  const group = archive.groups.find((g) => g.groupCode === groupCode);
  if (!group) return;

  group.voteCount += delta;
  for (const player of group.players) {
    const key = player.playerId;
    if (!key) continue;
    event.playerVoteTotals[key] = (event.playerVoteTotals[key] ?? 0) + delta;
  }
}

/**
 * Retourne tous les groupes ex æquo en tête du scrutin (score `voteCount` maximal).
 * Tableau vide si l'archive est absente ou sans groupe.
 */
export function findTiedTopGroups(archiveSession) {
  if (!archiveSession?.groups?.length) return [];

  const maxVotes = Math.max(...archiveSession.groups.map((g) => g.voteCount));
  return archiveSession.groups.filter((g) => g.voteCount === maxVotes);
}

/**
 * Détermine le groupe gagnant d'une session archivée lorsqu'il est unique.
 * Retourne `null` en cas d'égalité — le départage manager prend le relais.
 */
export function pickWinner(archiveSession) {
  const tied = findTiedTopGroups(archiveSession);
  if (tied.length !== 1) return null;
  return tied[0].groupCode;
}

/**
 * Construit le classement des joueurs (podium individuel ou liste élargie) basé sur le cumul
 * des votes obtenus sur leurs dessins tout au long de la partie.
 */
export function buildTopPlayers(event, limit = 3) {
  const totals = event.playerVoteTotals ?? {};
  const playerById = new Map(event.players.map((p) => [p.playerId, p]));

  const ranked = Object.entries(totals)
    .map(([playerId, voteTotal]) => {
      const player = playerById.get(playerId);
      if (!player) return null;
      return {
        playerId,
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

/**
 * Construit le classement des plus belles grilles dessinées (podium des grilles)
 * sur toutes les sessions compétitives confondues.
 * Chaque entrée contient également le thème de sa session associée pour l'affichage.
 */
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
        players: group.players ?? [],
        theme: session.theme,
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
    players: entry.players,
    theme: entry.theme,
  }));
}

/**
 * Détermine le mode d'affichage actuel de la salle d'attente (Waiting Room Mode).
 */
export function getWrMode(event) {
  return resolveWrMode(event);
}

/**
 * Vérifie s'il s'agit du tout dernier vote de la partie (dernière session).
 */
export function isLastVote(event) {
  if (!event.activeVote) return false;
  return event.activeVote.sessionNumber >= event.sessionCount;
}

/**
 * Liste les candidats (groupes et images associées) pour le vote de la session compétitive active.
 */
export function buildVoteCandidates(event) {
  if (!event.activeVote) return [];

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) return [];

  const groups =
    event.activeVote.status === 'tiebreak'
      ? archive.groups.filter((g) => event.activeVote.tiedGroupCodes?.includes(g.groupCode))
      : archive.groups;

  return groups.map((g) => ({
    groupCode: g.groupCode,
    groupIndex: g.groupIndex,
    label: g.label,
    image: g.image,
    voteCount: g.voteCount,
    players: g.players ?? [],
  }));
}

/**
 * Récupère le dessin de la dernière session coopérative pour l'afficher en résultat.
 * Comme il n'y a qu'un seul groupe en coop, on prend le premier groupe.
 */
export function buildSessionResultGrid(event) {
  const archive = event.sessionArchive?.[event.sessionArchive.length - 1];
  const group = archive?.groups?.[0];
  if (!archive || !group) return null;

  return {
    sessionNumber: archive.sessionNumber,
    theme: archive.theme,
    label: group.label,
    image: group.image,
    groupCode: group.groupCode,
    players: group.players ?? [],
  };
}

/**
 * Récupère l'intégralité des dessins archivés depuis le début de la partie.
 * Principalement utilisé pour la galerie de fin de partie coopérative.
 */
export function buildGalleryGrids(event) {
  const grids = [];

  for (const session of event.sessionArchive ?? []) {
    for (const group of session.groups) {
      grids.push({
        sessionNumber: session.sessionNumber,
        theme: session.theme,
        label: isCoop(event)
          ? `${session.theme} — Session ${session.sessionNumber}`
          : group.label,
        image: group.image ?? null,
        groupCode: group.groupCode,
        players: group.players ?? [],
      });
    }
  }

  return grids;
}

/**
 * Construit l'état détaillé des données de vote en fonction de la phase actuelle de la salle d'attente.
 * Retourne des structures spécifiques si l'on est au stade du podium, de la galerie, d'un vote en cours ou clos.
 */
export function buildVoteFields(event, playerId) {
  const wrMode = getWrMode(event);

  if (wrMode === 'gallery') {
    return {
      wrMode,
      voteCandidates: [],
      myVote: null,
      winnerGroupCode: null,
      winnerImage: null,
      isLastVote: true,
      topPlayers: [],
      topGrids: [],
      sessionResultGrid: null,
      galleryGrids: buildGalleryGrids(event),
    };
  }

  if (wrMode === 'sessionResult') {
    const grid = buildSessionResultGrid(event);
    return {
      wrMode,
      voteCandidates: [],
      myVote: null,
      winnerGroupCode: grid?.groupCode ?? null,
      winnerImage: grid?.image ?? null,
      isLastVote: event.currentSession >= event.sessionCount,
      topPlayers: [],
      topGrids: [],
      sessionResultGrid: grid,
      galleryGrids: [],
    };
  }

  if (wrMode === 'podium') {
    return {
      wrMode,
      voteCandidates: [],
      myVote: null,
      winnerGroupCode: null,
      winnerImage: null,
      isLastVote: true,
      topPlayers: buildTopPlayers(event, 10),
      topGrids: buildTopGrids(event),
      sessionResultGrid: null,
      galleryGrids: [],
    };
  }

  const voteCandidates =
    wrMode === 'voting' || wrMode === 'tieBreak' || wrMode === 'voteResult'
      ? buildVoteCandidates(event)
      : [];
  const myVote = playerId ? (event.activeVote?.votes?.[playerId] ?? null) : null;
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
    sessionResultGrid: null,
    galleryGrids: [],
  };
}

/**
 * Indique si un utilisateur a le droit de voter dans la phase active.
 * En départage (`tiebreak`), seul le manager enregistré peut trancher.
 */
export function canParticipateInVote(event, playerId) {
  if (event.activeVote?.status === 'tiebreak') {
    return playerId === event.managerPlayerId && Boolean(event.managerProfile);
  }

  if (playerId === event.managerPlayerId) {
    return Boolean(event.managerProfile);
  }
  return event.players.some((p) => p.playerId === playerId);
}

/**
 * Enregistre le vote d'un joueur pour une œuvre (code groupe).
 * En vote normal : mise à jour des scores via `applyVoteDelta`.
 * En départage (`tiebreak`) : +1 vote pour le groupe choisi (podium / résultat cohérents).
 */
export function castVote(event, playerId, groupCode) {
  if (event.status !== 'waiting' || !event.activeVote) {
    return { error: 'Le vote n\'est pas ouvert.' };
  }

  const { status } = event.activeVote;
  if (status !== 'open' && status !== 'tiebreak') {
    return { error: 'Le vote n\'est pas ouvert.' };
  }

  if (!canParticipateInVote(event, playerId)) {
    return { error: 'Vous ne pouvez pas voter.' };
  }

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  if (!archive) {
    return { error: 'Session de vote introuvable.' };
  }

  if (status === 'tiebreak') {
    if (!event.activeVote.tiedGroupCodes?.includes(groupCode)) {
      return { error: 'Œuvre invalide.' };
    }
    applyVoteDelta(event, groupCode, 1);
    event.activeVote.winnerGroupCode = groupCode;
    event.activeVote.status = 'closed';
    return { ok: true };
  }

  const target = archive.groups.find((g) => g.groupCode === groupCode);
  if (!target) {
    return { error: 'Œuvre invalide.' };
  }

  const weight = 1;
  const previous = event.activeVote.votes[playerId];

  if (previous === groupCode) {
    return { ok: true };
  }

  if (previous) {
    applyVoteDelta(event, previous, -weight);
  }

  event.activeVote.votes[playerId] = groupCode;
  applyVoteDelta(event, groupCode, weight);

  return { ok: true };
}

/**
 * Clôture le vote normal : gagnant unique → résultat immédiat ;
 * égalité → phase `tiebreak` (grilles ex æquo, départage par le manager).
 */
export function closeVote(event) {
  if (!event.activeVote || event.activeVote.status !== 'open') {
    return { error: 'Aucun vote en cours.' };
  }

  const archive = getArchiveSession(event, event.activeVote.sessionNumber);
  const tied = findTiedTopGroups(archive);

  if (tied.length > 1) {
    event.activeVote.status = 'tiebreak';
    event.activeVote.tiedGroupCodes = tied.map((g) => g.groupCode);
    event.activeVote.votes = {};
    return { ok: true };
  }

  event.activeVote.status = 'closed';
  event.activeVote.winnerGroupCode = tied[0]?.groupCode ?? null;
  return { ok: true };
}

/**
 * Handler Socket.io appelé lorsqu'un joueur vote.
 * Enregistre le vote et notifie l'ensemble des clients du nouvel état des votes.
 */
export function handleCastVote(socket, data, callback, deps) {
  if (!guardAck(callback)) return;
  const { io, store } = deps;
  const { activeEvents, normalizeEventId, normalizeGroupCode } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const groupCode = normalizeGroupCode(data?.groupCode);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (isCoop(event)) {
    return callback({ error: 'Pas de vote en mode coopératif.' });
  }

  const playerId = socket.data?.playerId;
  if (!playerId) {
    return callback({ error: 'Session invalide.' });
  }

  if (isRateLimited(socket, 'castVote', VOTE_COOLDOWN_MS)) {
    return callback(votePayloadFor(event, playerId));
  }

  const result = castVote(event, playerId, groupCode);
  if (result.error) {
    return callback({ error: result.error });
  }

  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, playerId));
}

/**
 * Helper générant le payload des données de vote pour un joueur spécifique.
 */
function votePayloadFor(event, playerId) {
  return {
    eventId: event.id,
    ...buildVoteFields(event, playerId),
  };
}

/**
 * Diffuse la mise à jour des votes à tous les joueurs connectés.
 * Les informations envoyées à chaque joueur sont personnalisées (notamment pour indiquer
 * son propre choix de vote via `myVote`).
 */
export function emitVoteStateUpdated(io, event) {
  const recipients = [
    { playerId: event.managerPlayerId, socketId: event.manager },
    ...event.players.map((p) => ({ playerId: p.playerId, socketId: p.socketId })),
  ];
  const seen = new Set();

  for (const { playerId, socketId } of recipients) {
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    io.to(socketId).emit('voteStateUpdated', votePayloadFor(event, playerId));
  }
}

/**
 * Handler Socket.io permettant au manager de clôturer le vote de la session compétitive active.
 */
export function handleCloseVote(socket, data, callback, deps) {
  if (!guardAck(callback)) return;
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (isCoop(event)) {
    return callback({ error: 'Pas de vote en mode coopératif.' });
  }

  if (!isManager(event, socket)) {
    return callback({ error: 'Seul le manager peut clôturer le vote.' });
  }

  const result = closeVote(event);
  if (result.error) {
    return callback({ error: result.error });
  }

  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, event.managerPlayerId));
}

/**
 * Bascule l'événement sur l'affichage des résultats finaux (podiums).
 * Réservé exclusivement au manager après la clôture du tout dernier vote.
 */
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

/**
 * Handler Socket.io permettant au manager d'initier l'affichage du podium de fin.
 */
export function handleShowResults(socket, data, callback, deps) {
  if (!guardAck(callback)) return;
  const { io, store } = deps;
  const { activeEvents, normalizeEventId } = store;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (isCoop(event)) {
    return callback({ error: 'Pas de podium en mode coopératif.' });
  }

  if (!isManager(event, socket)) {
    return callback({ error: 'Seul le manager peut afficher les résultats.' });
  }

  const result = openResults(event);
  if (result.error) {
    return callback({ error: result.error });
  }

  clearPartyChat(io, event);
  emitVoteStateUpdated(io, event);
  callback(votePayloadFor(event, event.managerPlayerId));
}

/**
 * Handler Socket.io permettant au manager de clore définitivement la partie.
 * Déclenche la destruction de la partie en mémoire et déconnecte les sockets liés.
 */
export function handleEndParty(socket, data, callback, deps) {
  if (!guardAck(callback)) return;
  const { io, store, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { closeEvent } = lifecycle;

  const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
  const event = eventId ? activeEvents[eventId] : null;

  if (!event) {
    return callback({ error: "La partie n'existe pas." });
  }

  if (!isManager(event, socket)) {
    return callback({ error: 'Seul le manager peut terminer la partie.' });
  }

  if (isCoop(event)) {
    if (event.coopWrMode !== 'gallery') {
      return callback({ error: 'Terminez toutes les sessions avant de fermer la partie.' });
    }
  } else if (!event.showingResults) {
    return callback({ error: 'Affichez les résultats avant de terminer la partie.' });
  }

  callback({ ok: true, eventId: event.id });
  closeEvent(io, event.id);
  socket.leave(eventId);
}
