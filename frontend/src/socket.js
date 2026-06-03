import io from 'socket.io-client';

export const socket = io(import.meta.env.VITE_API_URL, {
    auth: {
        token: localStorage.getItem('token')
    }
});

export function updateSocketAuth() {
    socket.auth = { token: localStorage.getItem('token') };
    socket.disconnect().connect();
}
