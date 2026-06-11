// fermeture volontaire + cleanup déco (manager = fin de partie pour tous)
export function registerLifecycleHandlers(socket, deps) {
  const { io, store, participants, payloads, lifecycle } = deps;
  const { activeEvents, normalizeEventId, groupRoomName } = store;
  const { removePlayerFromEvent, findPlayerGroup } = participants;
  const { toPublicPlayer } = payloads;
  const { closeEvent } = lifecycle;

  socket.on('closeRoom', (data) => {
    const eventId = normalizeEventId(data?.roomId ?? data?.eventId);
    const event = eventId ? activeEvents[eventId] : null;
    if (!event || socket.id !== event.manager) return;

    closeEvent(io, eventId);
    socket.leave(eventId);
  });

  socket.on('disconnect', () => { // scan tous les events — un socket ne peut être que dans un event à la fois en pratique
    for (const eventId in activeEvents) {
      const event = activeEvents[eventId];

      if (event.manager === socket.id) {
        closeEvent(io, eventId);
      } else if (
        event.players.some((p) => p.socketId === socket.id) ||
        Object.values(event.groups).some((g) => g.players.some((p) => p.socketId === socket.id))
      ) {
        const wasWaiting = event.status === 'waiting';
        const removed = removePlayerFromEvent(event, socket.id);

        if (event.status === 'started') {
          const assignment = findPlayerGroup(event, socket.id);
          if (assignment) {
            socket.to(groupRoomName(eventId, assignment.groupCode)).emit('exitGame', {
              socketId: socket.id,
            });
          }
        } else if (wasWaiting && removed) {
          io.to(eventId).emit('waitingRoomUpdated', {
            players: event.players.map(toPublicPlayer),
          });
        }
      }
    }
  });
}
