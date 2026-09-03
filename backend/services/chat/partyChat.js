import { isRegistered, isManager } from '../event/participants.js';

export function canAccessPartyChat(event, socket) {
  const playerId = socket.data?.playerId;
  if (isManager(event, socket)) {
    return Boolean(event.managerProfile);
  }
  return isRegistered(event, socket.id, playerId);
}

export function clearPartyChat(io, event) {
  event.partyChatMessages = [];
  io.to(event.id).emit('chatMessages', []);
}
