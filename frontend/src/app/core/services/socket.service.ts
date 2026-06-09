import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly apiUrl = getApiUrl();
  private readonly socket: Socket = io(this.apiUrl, { autoConnect: true });

  readonly isConnected = signal(this.socket.connected);
  readonly socketId = signal<string | undefined>(this.socket.id);

  constructor() {
    this.socket.on('connect', () => {
      this.isConnected.set(true);
      this.socketId.set(this.socket.id);
    });
    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
      this.socketId.set(undefined);
    });
    this.socket.on('connected', (payload: { socketId: string }) => {
      this.socketId.set(payload.socketId);
    });
  }

  id(): string | undefined {
    return this.socket.id;
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

  on<TPayload>(event: string, handler: (payload: TPayload) => void): void {
    this.socket.on(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (handler) {
      this.socket.off(event, handler);
      return;
    }
    this.socket.off(event);
  }
}
