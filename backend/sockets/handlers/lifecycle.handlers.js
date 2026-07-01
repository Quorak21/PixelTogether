// fermeture volontaire + cleanup déco (manager = grace period 5 min)
import { MANAGER_ABSENT_WARNING_MS } from '../../config/constants.js';
import {
  removePlayerSessionFromEvent,
  setSessionConnected,
} from '../../services/reconnect/sessionToken.js';
import {
  resolvePlayerId,
  scheduleManagerAbsentClose,
  isManager,
  removePlayerFromEvent,
} from '../../services/event/participants.js';
import { enableAutoPilotOnManagerDisconnect } from '../../services/event/autoPilot.js';
import { toPublicPlayer } from '../../services/event/payloads.js';
import { isCoop } from '../../services/event/gameMode.js';
import {
  finishCurrentSession,
} from '../../services/session/sessionLifecycle.js';
import {
  closeVote,
  openResults,
  emitVoteStateUpdated,
} from '../../services/vote/voteLifecycle.js';
import { guardAck } from './socketGuards.js';

/** Retire un joueur de tous les groupes actifs. */
function removePlayerFromGroups(event, playerId) {
  if (!playerId) return;
  for (const groupCode in event.groups) {
    const group = event.groups[groupCode];
    group.players = group.players.filter((p) => p.playerId !== playerId);
    if (group.finishedPlayerIds) {
      group.finishedPlayerIds = group.finishedPlayerIds.filter((id) => id !== playerId);
    }
  }
}

/** Passe la partie compétitive au podium avec ce qui a été fait. */
function progressPartyToFinal(io, event) {
  if (event.status === 'started') {
    finishCurrentSession(io, event);
    event.currentSession = event.sessionCount;
  }

  if (event.activeVote) {
    if (event.activeVote.status === 'open') {
      closeVote(event);
    }
    if (event.activeVote.status === 'tiebreak' || event.activeVote.status === 'tiebreak_roulette') {
      event.activeVote.status = 'closed';
      event.activeVote.winnerGroupCode = event.activeVote.tiedGroupCodes?.[0] ?? null;
    }
    if (event.activeVote.sessionNumber < event.sessionCount) {
      event.activeVote.sessionNumber = event.sessionCount;
    }
  }

  if (!event.showingResults) {
    const result = openResults(event);
    if (result.error) {
      event.showingResults = true;
    }
  }

  emitVoteStateUpdated(io, event);
}

function maybeScheduleForcedFinal(io, event, eventId, activeEvents) {
  if (isCoop(event)) {
    return;
  }

  if (!event.partyStarted || event.forcedFinalAt || !event.rosterBaselineCount) {
    return;
  }

  const remaining = event.players.length;
  const half = Math.floor(event.rosterBaselineCount / 2);
  if (remaining > half) {
    return;
  }

  event.forcedFinalAt = Date.now();

  io.to(eventId).emit('managerAbsentWarning', {
    eventId,
    roomId: eventId,
    title: 'Fin de partie',
    message: 'Plus assez de joueurs disponibles, la partie va se terminer.',
    closesInMs: MANAGER_ABSENT_WARNING_MS,
  });

  if (event._forcedFinalTimer) {
    clearTimeout(event._forcedFinalTimer);
  }

  event._forcedFinalTimer = setTimeout(() => {
    event._forcedFinalTimer = null;
    if (!activeEvents[eventId]) {
      return;
    }
    progressPartyToFinal(io, activeEvents[eventId]);
  }, MANAGER_ABSENT_WARNING_MS);
}

/**
 * Enregistre les handlers de gestion du cycle de vie de la connexion socket
 * (fermeture manuelle de salon par le manager ou déconnexion inattendue d'un client).
 */
export function registerLifecycleHandlers(socket, deps) {
  const { io, store, lifecycle } = deps;
  const { activeEvents, normalizeEventId } = store;
  const { closeEvent } = lifecycle;

  // Fermeture manuelle immédiate de la room par le manager
  socket.on('closeRoom', (data) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || !isManager(event, socket)) return;

    closeEvent(io, eventId);
    socket.leave(eventId);
  });

  // Sortie définitive d'un joueur (hors phase de groupement WR)
  socket.on('leaveParty', (data, callback) => {
    if (!guardAck(callback)) return;

    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;

    if (!event) {
      return callback({ error: "La partie n'existe pas." });
    }

    if (isManager(event, socket)) {
      return callback({ error: 'Le manager doit fermer la partie.' });
    }

    if (!event.partyStarted) {
      return callback({ error: 'Utilisez leaveWaitingRoom en phase de groupement.' });
    }

    const playerId = socket.data?.playerId ?? resolvePlayerId(event, socket.id);
    if (!playerId) {
      return callback({ error: 'Session invalide.' });
    }

    removePlayerFromGroups(event, playerId);
    removePlayerFromEvent(event, socket.id, playerId);
    removePlayerSessionFromEvent(event, playerId);

    socket.leave(eventId);
    socket.data.eventId = undefined;
    socket.data.playerId = undefined;
    socket.data.role = undefined;

    io.to(eventId).emit('waitingRoomUpdated', {
      players: event.players.map(toPublicPlayer),
    });

    callback({ ok: true });

    maybeScheduleForcedFinal(io, event, eventId, activeEvents);
  });

  // Déconnexion inattendue d'un client (perte réseau, fermeture d'onglet)
  socket.on('disconnect', () => {
    for (const eventId in activeEvents) {
      const event = activeEvents[eventId];
      const playerId = resolvePlayerId(event, socket.id);

      if (isManager(event, socket)) {
        setSessionConnected(event.managerPlayerId, false);
        const mode = scheduleManagerAbsentClose(io, event, eventId, closeEvent);
        if (mode === 'auto_pilot') {
          enableAutoPilotOnManagerDisconnect(io, event, eventId, deps);
        }
        continue;
      }

      const inEvent =
        event.players.some((p) => p.socketId === socket.id || p.playerId === playerId) ||
        Object.values(event.groups).some((g) =>
          g.players.some((p) => p.socketId === socket.id || p.playerId === playerId),
        ) ||
        (playerId &&
          event.sessionsByToken &&
          Object.values(event.sessionsByToken).includes(playerId));

      if (!inEvent) continue;

      if (playerId) {
        setSessionConnected(playerId, false);
      }
    }
  });
}
