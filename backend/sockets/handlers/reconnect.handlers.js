import {
  validateToken,
  purgePlayerSession,
  updateSessionGroupCode,
  setSessionConnected,
} from '../../services/reconnect/sessionToken.js';
import {
  remapSocket,
  clearManagerDisconnectTimer,
  findPlayerGroupByPlayerId,
} from '../../services/event/participants.js';import { isCoop } from '../../services/event/gameMode.js';
import { getSortedGroups } from '../../store/eventStore.js';
import { resolveReconnectPhase } from '../../services/event/wrPhase.js';

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

  const phase = resolveReconnectPhase(event, session.role);
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
 * Enregistre le handler d'écoute sur le message `reconnectSession`.
 */
export function registerReconnectHandlers(socket, deps) {
  socket.on('reconnectSession', (data, callback) => {
    if (typeof callback !== 'function') return;
    handleReconnectSession(socket, data, callback, deps);
  });
}
