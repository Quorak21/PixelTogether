import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../config/runtime-config', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

import { io } from 'socket.io-client';
import { SocketService } from './socket.service';

function getMockSocket() {
  return vi.mocked(io).mock.results.at(-1)?.value as {
    connected: boolean;
    id: string | undefined;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };
}

function getHandler(event: string) {
  const socket = getMockSocket();
  const call = socket.on.mock.calls.find(([name]) => name === event);
  return call?.[1] as (() => void) | undefined;
}

describe('SocketService', () => {
  beforeEach(() => {
    vi.mocked(io).mockClear();
    vi.mocked(io).mockImplementation(() => ({
      connected: false,
      id: undefined,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    }));
  });

  it('lifecycle connecting → connected → reconnecting → connected', () => {
    const service = new SocketService();
    expect(service.connectionStatus()).toBe('connecting');
    expect(service.showConnectionBanner()).toBe(false);

    const socket = getMockSocket();
    socket.id = 'sock-1';
    getHandler('connect')?.();
    expect(service.connectionStatus()).toBe('connected');
    expect(service.showConnectionBanner()).toBe(false);

    getHandler('disconnect')?.();
    expect(service.connectionStatus()).toBe('reconnecting');
    expect(service.showConnectionBanner()).toBe(false);

    socket.id = 'sock-2';
    getHandler('connect')?.();
    expect(service.connectionStatus()).toBe('connected');
    expect(service.showConnectionBanner()).toBe(false);
  });

  it('affiche la bannière seulement après 2 s de déconnexion', () => {
    vi.useFakeTimers();
    const service = new SocketService();

    getHandler('disconnect')?.();
    expect(service.showConnectionBanner()).toBe(false);

    vi.advanceTimersByTime(1_999);
    expect(service.showConnectionBanner()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(service.showConnectionBanner()).toBe(true);

    getHandler('connect')?.();
    expect(service.showConnectionBanner()).toBe(false);

    vi.useRealTimers();
  });

  it('on() returns an unsubscribe function', () => {
    const service = new SocketService();
    const handler = vi.fn();
    const unsub = service.on('customEvent', handler);

    const socket = getMockSocket();
    const customHandler = socket.on.mock.calls.find(([name]) => name === 'customEvent')?.[1] as (
      payload: unknown,
    ) => void;
    customHandler({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    expect(socket.off).toHaveBeenCalledWith('customEvent', handler);
  });
});
