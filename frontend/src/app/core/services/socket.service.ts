import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/runtime-config';

type AckFn<TResponse> = (response: TResponse) => void;

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly apiUrl = getApiUrl();
  private readonly socket: Socket = io(this.apiUrl, {
    autoConnect: false,
    auth: {
      token: localStorage.getItem('token')
    }
  });

  readonly isConnected = signal(this.socket.connected);

  constructor() {
    this.socket.on('connect', () => this.isConnected.set(true));
    this.socket.on('disconnect', () => this.isConnected.set(false));
  }

  id(): string | undefined {
    return this.socket.id;
  }

  setAuthToken(token: string | null): void {
    this.socket.auth = { token };
    this.socket.disconnect().connect();
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  emit<TPayload>(event: string, payload?: TPayload): void {
    if (payload === undefined) {
      this.socket.emit(event);
      return;
    }
    this.socket.emit(event, payload);
  }

  emitWithAck<TPayload, TResponse>(event: string, payload: TPayload): Promise<TResponse> {
    return new Promise<TResponse>((resolve) => {
      this.socket.emit(event, payload, (response: TResponse) => resolve(response));
    });
  }

  emitAckOnly<TResponse>(event: string): Promise<TResponse> {
    return new Promise<TResponse>((resolve) => {
      this.socket.emit(event, (response: TResponse) => resolve(response));
    });
  }

  on<TPayload>(event: string, handler: (payload: TPayload) => void): void {
    this.socket.on(event, handler);
  }

  once<TPayload>(event: string, handler: (payload: TPayload) => void): void {
    this.socket.once(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (handler) {
      this.socket.off(event, handler);
      return;
    }
    this.socket.off(event);
  }
}
