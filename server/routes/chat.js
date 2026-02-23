export default function handleChat(io, socket) {
    socket.on('sendMessage', (data) => {
        io.to(data.roomID).emit('receiveMessage', { message: data.message, pseudo: data.pseudo, senderId: socket.id });
    });

    socket.on('joinRoom', (data) => {
        io.to(data.roomId).emit('joinedRoom', { pseudo: data.pseudo });
    });
}