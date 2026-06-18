import crypto from 'crypto';
import {
  validateToken,
  issueSession,
  purgePlayerSession,
  hasActiveSessionOnOtherEvent,
  updateSessionGroupCode,
  setSessionConnected,
} from '../../services/reconnect/sessionToken.js';
import {
  remapSocket,
  clearManagerDisconnectTimer,
  findPlayerGroupByPlayerId,
  resolvePlayerId,
} from '../../services/event/participants.js';
import { isCoop } from '../../services/event/gameMode.js';
import { getSortedGroups } from '../../store/eventStore.js';

/**
 * Détermine la phase de jeu actuelle en fonction de l'état du salon et du rôle du joueur.
 * Cela permet de rediriger le joueur sur le bon écran lors de sa reconnexion (jeu, vote, podium, salle d'attente...).
 */
function resolvePhase(event, role) {
  if (event.status === 'started') {
    if (isCoop(event)) {
      return 'game';
    }
    return role === 'manager' ? 'lobby' : 'game';
  }
  if (isCoop(event)) {
    if (event.coopWrMode === 'gallery') return 'gallery';
    if (event.coopWrMode === 'sessionResult') return 'sessionResult';
    return 'waiting';
  }
  if (event.showingResults) return 'podium';
  if (event.activeVote?.status === 'open') return 'voting';
  if (event.activeVote?.status === 'closed') return 'voteResult';
  return 'waiting';
}

/**
 * Helper injectant les données de session nécessaires (token, date d'expiration)
 * dans le payload d'état retourné au client.
 */
function attachSessionFields(state, session) {
  return {
    ...state,
    playerId: session.playerId,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

/**
 * Gère la reconnexion d'un joueur ou du manager via son token de session.
 * Met à jour son socket, ses abonnements aux rooms Socket.io et retourne l'état actuel
 * de la partie correspondant à la phase résolue.
 */
export function handleReconnectSession(socket, data, callback, deps) {
  const { store, constants, payloads } = deps;
  const { activeEvents, groupRoomName } = store;
  const { GRID_SIZE } = constants;
  const { buildWaitingRoomState, buildEventLobbyPayload, buildGridStatePayload } = payloads;

  const token = typeof data?.token === 'string' ? data.token.trim() : '';
  const session = validateToken(token);

  if (!session) {
    return callback({ error: 'PARTY_GONE' });
  }

  const event = activeEvents[session.eventId];
  if (!event) {
    purgePlayerSession(session.playerId);
    return callback({ error: 'PARTY_GONE' });
  }

  remapSocket(event, session.playerId, socket.id);
  setSessionConnected(session.playerId, true, socket.id);
  if (session.role === 'manager') {
    clearManagerDisconnectTimer(event);
  }
  event.lastActivityAt = Date.now();

  socket.data.playerId = session.playerId;
  socket.data.role = session.role;
  socket.data.eventId = session.eventId;

  socket.join(session.eventId);

  const phase = resolvePhase(event, session.role);
  const response = {
    phase,
    eventId: session.eventId,
    role: session.role,
    playerId: session.playerId,
    token: session.token,
    expiresAt: session.expiresAt,
  };

  if (phase === 'game') {
    let assignment = findPlayerGroupByPlayerId(event, session.playerId);
    let groupCode = assignment?.groupCode ?? session.groupCode;

    if (!groupCode && isCoop(event)) {
      const sorted = getSortedGroups(event);
      groupCode = sorted[0]?.groupCode ?? null;
    }

    if (!groupCode) {
      return callback({ error: 'PARTY_GONE' });
    }

    updateSessionGroupCode(session.playerId, groupCode);
    socket.data.groupCode = groupCode;
    socket.join(groupRoomName(session.eventId, groupCode));

    response.groupCode = groupCode;
    response.gridState = buildGridStatePayload(event, groupCode, socket, GRID_SIZE);
  } else if (phase === 'lobby') {
    response.lobbyState = buildEventLobbyPayload(event);
  } else if (phase === 'sessionResult' || phase === 'gallery' || phase === 'waiting' || phase === 'voting' || phase === 'voteResult' || phase === 'podium') {
    response.waitingRoomState = attachSessionFields(
      buildWaitingRoomState(event, socket.id, session.playerId),
      session,
    );
  }

  return callback(response);
}

/**
 * Gère l'entrée initiale d'un joueur dans la salle d'attente (Waiting Room).
 * Si le joueur a déjà un token pour cet événement, il se reconnecte à sa session existante.
 * Sinon, une nouvelle session de reconnexion lui est délivrée.
 */
export function handleWaitingRoomEntry(socket, event, eventId, data, deps) {
  const { payloads } = deps;
  const { buildWaitingRoomState } = payloads;
  const token = typeof data?.token === 'string' ? data.token.trim() : '';

  if (token) {
    if (hasActiveSessionOnOtherEvent(token, eventId)) {
      return { error: 'Vous êtes déjà dans une autre partie.' };
    }

    const session = validateToken(token);
    if (session && session.eventId === eventId) {
      remapSocket(event, session.playerId, socket.id);
      setSessionConnected(session.playerId, true, socket.id);
      if (session.role === 'manager') {
        clearManagerDisconnectTimer(event);
      }
      event.lastActivityAt = Date.now();

      socket.data.playerId = session.playerId;
      socket.data.role = session.role;
      socket.data.eventId = eventId;
      socket.join(eventId);

      const state = attachSessionFields(
        buildWaitingRoomState(event, socket.id, session.playerId),
        session,
      );
      return { state };
    }
  }

  if (token && validateToken(token)) {
    return { error: 'Vous êtes déjà dans une autre partie.' };
  }

  const playerId = crypto.randomUUID();
  const issued = issueSession(event, {
    playerId,
    role: 'player',
    socketId: socket.id,
  });
  event.lastActivityAt = Date.now();

  socket.data.playerId = playerId;
  socket.data.role = 'player';
  socket.data.eventId = eventId;
  socket.join(eventId);

  const state = {
    ...buildWaitingRoomState(event, socket.id, playerId),
    ...issued,
  };

  return { state };
}

/**
 * Enregistre le handler d'écoute sur le message `reconnectSession`.
 */
export function registerReconnectHandlers(socket, deps) {
  socket.on('reconnectSession', (data, callback) => {
    if (typeof callback !== 'function') return;
    handleReconnectSession(socket, data, callback, deps);
  });
}
