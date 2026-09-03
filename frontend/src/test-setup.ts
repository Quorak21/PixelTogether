import { vi } from 'vitest';

// Évite qu'un SocketService instancié par erreur lance une vraie connexion socket
// (sinon vitest ne quitte jamais → job CI bloqué jusqu'au timeout 6h).
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    id: undefined,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));
