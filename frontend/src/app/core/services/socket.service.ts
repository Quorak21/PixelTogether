import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/runtime-config';

/**
 * Service gérant la connexion Socket.io unique pour toute l'application.
 * Fournit une interface simplifiée et réactive grâce aux Signals d'Angular.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly apiUrl = getApiUrl();
  private readonly socket: Socket = io(this.apiUrl, { autoConnect: true });

  /** Signal réactif indiquant si le socket est actuellement connecté au backend. */
  readonly isConnected = signal(this.socket.connected);
  
  /** Signal contenant l'identifiant unique du socket (socket.id) de cette session. */
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

  /**
   * Retourne l'identifiant brut du socket.
   * 
   * @returns L'ID du socket ou undefined si déconnecté.
   */
  id(): string | undefined {
    return this.socket.id;
  }

  /**
   * Envoie un événement Socket.io sans attendre de réponse de confirmation (fire-and-forget).
   * 
   * @param event - Le nom de l'événement à émettre.
   * @param payload - Optionnel. Les données à envoyer avec l'événement.
   */
  emit<TPayload>(event: string, payload?: TPayload): void {
    if (payload === undefined) {
      this.socket.emit(event);
      return;
    }
    this.socket.emit(event, payload);
  }

  /**
   * Envoie un événement au serveur et renvoie une promesse résolue avec la réponse (Acknowledgement).
   * Très utile pour simuler des appels API de type requête-réponse sur Websocket.
   * 
   * @param event - Le nom de l'événement à émettre.
   * @param payload - Les données à transmettre.
   * @returns Une promesse contenant la réponse du serveur.
   */
  emitWithAck<TPayload, TResponse>(event: string, payload: TPayload): Promise<TResponse> {
    return new Promise<TResponse>((resolve) => {
      this.socket.emit(event, payload, (response: TResponse) => resolve(response));
    });
  }

  /**
   * Enregistre un écouteur sur un événement socket spécifique.
   * 
   * @param event - Le nom de l'événement à écouter.
   * @param handler - La fonction callback exécutée à la réception de l'événement.
   */
  on<TPayload>(event: string, handler: (payload: TPayload) => void): void {
    this.socket.on(event, handler);
  }

  /**
   * Désenregistre un écouteur sur un événement.
   * Si aucun callback n'est fourni, retire tous les écouteurs de cet événement.
   * 
   * @param event - Le nom de l'événement.
   * @param handler - Optionnel. Le callback spécifique à retirer.
   */
  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (handler) {
      this.socket.off(event, handler);
      return;
    }
    this.socket.off(event);
  }
}
