import { describe, it, expect, beforeEach, vi } from 'vitest';

const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

const mockSocket = {
  connected: false,
  id: undefined as string | undefined,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    handlers[event] ??= [];
    handlers[event].push(handler);
  }),
  off: vi.fn((event: string, handler?: (...args: unknown[]) => void) => {
    if (!handlers[event]) {
      return;
    }
    if (handler) {
      handlers[event] = handlers[event].filter((entry) => entry !== handler);
      return;
    }
    delete handlers[event];
  }),
  emit: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('../config/runtime-config', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

import { SocketService } from './socket.service';

function emitSocketEvent(event: string, ...args: unknown[]): void {
  for (const handler of handlers[event] ?? []) {
    handler(...args);
  }
}

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(handlers)) {
      delete handlers[key];
    }
    mockSocket.connected = false;
    mockSocket.id = undefined;
    service = new SocketService();
  });

  it('should start as connecting when not connected', () => {
    expect(service.connectionStatus()).toBe('connecting');
    expect(service.connectionMessage()).toBe('Connexion au serveur en cours…');
  });

  it('should start as connected when socket is already connected', () => {
    mockSocket.connected = true;
    mockSocket.id = 'sock-1';
    const connectedService = new SocketService();
    expect(connectedService.connectionStatus()).toBe('connected');
    expect(connectedService.connectionMessage()).toBe('');
  });

  it('should transition to connected on connect', () => {
    mockSocket.id = 'sock-42';
    emitSocketEvent('connect');

    expect(service.connectionStatus()).toBe('connected');
    expect(service.isConnected()).toBe(true);
    expect(service.socketId()).toBe('sock-42');
    expect(service.connectionMessage()).toBe('');
  });

  it('should stay connecting on connect_error before first connect', () => {
    emitSocketEvent('connect_error', new Error('ECONNREFUSED'));

    expect(service.connectionStatus()).toBe('connecting');
    expect(service.connectionMessage()).toBe('Connexion au serveur en cours…');
  });

  it('should transition to reconnecting on disconnect after connect', () => {
    mockSocket.id = 'sock-42';
    emitSocketEvent('connect');
    emitSocketEvent('disconnect');

    expect(service.connectionStatus()).toBe('reconnecting');
    expect(service.isConnected()).toBe(false);
    expect(service.socketId()).toBeUndefined();
    expect(service.connectionMessage()).toBe('Connexion perdue. Reconnexion en cours…');
  });

  it('should stay reconnecting on connect_error after disconnect', () => {
    mockSocket.id = 'sock-42';
    emitSocketEvent('connect');
    emitSocketEvent('disconnect');
    emitSocketEvent('connect_error', new Error('ECONNREFUSED'));

    expect(service.connectionStatus()).toBe('reconnecting');
    expect(service.connectionMessage()).toBe('Connexion perdue. Reconnexion en cours…');
  });

  it('on() returns an unsubscribe function', () => {
    const handler = vi.fn();
    const unsub = service.on('customEvent', handler);

    emitSocketEvent('customEvent', { ok: true });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    emitSocketEvent('customEvent', { ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockSocket.off).toHaveBeenCalledWith('customEvent', handler);
  });

  it('should return to connected after successful reconnect', () => {
    mockSocket.id = 'sock-42';
    emitSocketEvent('connect');
    emitSocketEvent('disconnect');
    mockSocket.id = 'sock-99';
    emitSocketEvent('connect');

    expect(service.connectionStatus()).toBe('connected');
    expect(service.isConnected()).toBe(true);
    expect(service.socketId()).toBe('sock-99');
  });
});
