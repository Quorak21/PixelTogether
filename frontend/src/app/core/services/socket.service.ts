import { computed, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/runtime-config';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting';

/**
 * Service gérant la connexion Socket.io unique pour toute l'application.
 * Fournit une interface simplifiée et réactive grâce aux Signals d'Angular.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private static readonly BANNER_DELAY_MS = 2_000;

  private readonly apiUrl = getApiUrl();
  private readonly socket: Socket = io(this.apiUrl, { autoConnect: true });
  private hasConnectedOnce = false;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  /** Signal réactif indiquant si le socket est actuellement connecté au backend. */
  readonly isConnected = signal(this.socket.connected);

  /** Statut de connexion pour l'affichage global (connect_error, disconnect, connect). */
  readonly connectionStatus = signal<ConnectionStatus>(
    this.socket.connected ? 'connected' : 'connecting',
  );

  /** Bannière connexion : visible seulement après 2 s de déconnexion (évite le flash au chargement). */
  readonly showConnectionBanner = signal(false);

  /** Message utilisateur dérivé du statut de connexion. */
  readonly connectionMessage = computed(() => {
    switch (this.connectionStatus()) {
      case 'connecting':
        return 'Connexion au serveur en cours…';
      case 'reconnecting':
        return 'Connexion perdue. Reconnexion en cours…';
      default:
        return '';
    }
  });

  constructor() {
    this.socket.on('connect', () => {
      this.hasConnectedOnce = true;
      this.isConnected.set(true);
      this.connectionStatus.set('connected');
      this.hideConnectionBanner();
    });
    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
      this.connectionStatus.set('reconnecting');
      this.scheduleConnectionBanner();
    });
    this.socket.on('connect_error', () => {
      this.connectionStatus.set(this.hasConnectedOnce ? 'reconnecting' : 'connecting');
      this.scheduleConnectionBanner();
    });

    if (this.connectionStatus() !== 'connected') {
      this.scheduleConnectionBanner();
    }
  }

  /** Lance le minuteur avant d'afficher la bannière ; réinitialise si la connexion fluctue. */
  private scheduleConnectionBanner(): void {
    this.showConnectionBanner.set(false);
    this.clearBannerTimer();
    this.bannerTimer = setTimeout(() => {
      this.bannerTimer = null;
      if (this.connectionStatus() !== 'connected') {
        this.showConnectionBanner.set(true);
      }
    }, SocketService.BANNER_DELAY_MS);
  }

  private hideConnectionBanner(): void {
    this.clearBannerTimer();
    this.showConnectionBanner.set(false);
  }

  private clearBannerTimer(): void {
    if (this.bannerTimer !== null) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
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
    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Pas de réponse du serveur pour "${event}" après 10s`));
      }, 10_000);
      this.socket.emit(event, payload, (response: TResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Enregistre un écouteur sur un événement socket spécifique.
   *
   * @param event - Le nom de l'événement à écouter.
   * @param handler - La fonction callback exécutée à la réception de l'événement.
   * @returns Fonction pour désabonner ce handler (à passer à `destroyRef.onDestroy`).
   */
  on<TPayload>(event: string, handler: (payload: TPayload) => void): () => void {
    this.socket.on(event, handler);
    return () => this.off(event, handler as (...args: unknown[]) => void);
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
