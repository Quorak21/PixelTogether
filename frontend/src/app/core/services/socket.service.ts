import { computed, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/runtime-config';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'unavailable';

function isBrowserRuntime(): boolean {
  return !(globalThis as { ngServerMode?: boolean }).ngServerMode;
}

/**
 * Service gérant la connexion Socket.io unique pour toute l'application.
 * Fournit une interface simplifiée et réactive grâce aux Signals d'Angular.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private static readonly BANNER_DELAY_MS = 2_000;
  private static readonly UNAVAILABLE_AFTER_MS = 12_000;

  private readonly socket: Socket | null = isBrowserRuntime()
    ? io(getApiUrl(), { autoConnect: true })
    : null;
  private hasConnectedOnce = false;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private unavailableTimer: ReturnType<typeof setTimeout> | null = null;

  /** Signal réactif indiquant si le socket est actuellement connecté au backend. */
  readonly isConnected = signal(this.socket?.connected ?? false);

  /** Statut de connexion pour l'affichage global (connect_error, disconnect, connect). */
  readonly connectionStatus = signal<ConnectionStatus>(
    this.socket?.connected ? 'connected' : 'connecting',
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
      case 'unavailable':
        return 'Serveur indisponible.';
      default:
        return '';
    }
  });

  constructor() {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      this.hasConnectedOnce = true;
      this.isConnected.set(true);
      this.connectionStatus.set('connected');
      this.hideConnectionBanner();
    });
    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
      if (this.connectionStatus() === 'unavailable') {
        return;
      }
      this.connectionStatus.set('reconnecting');
      this.scheduleConnectionBanner();
      this.startUnavailableTimer();
    });
    this.socket.on('connect_error', () => {
      if (this.connectionStatus() === 'unavailable') {
        return;
      }
      this.connectionStatus.set(this.hasConnectedOnce ? 'reconnecting' : 'connecting');
      this.scheduleConnectionBanner();
    });

    if (this.connectionStatus() !== 'connected') {
      this.scheduleConnectionBanner();
      this.startUnavailableTimer();
    }
  }

  /** Relance une tentative de connexion après l'état « serveur indisponible ». */
  retryConnect(): void {
    if (!this.socket) {
      return;
    }
    this.connectionStatus.set(this.hasConnectedOnce ? 'reconnecting' : 'connecting');
    this.showConnectionBanner.set(true);
    this.clearUnavailableTimer();
    this.startUnavailableTimer();
    if (!this.socket.connected) {
      this.socket.connect();
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

  private startUnavailableTimer(): void {
    if (this.unavailableTimer !== null) {
      return;
    }
    this.unavailableTimer = setTimeout(() => {
      this.unavailableTimer = null;
      if (this.connectionStatus() !== 'connected') {
        this.connectionStatus.set('unavailable');
        this.showConnectionBanner.set(true);
      }
    }, SocketService.UNAVAILABLE_AFTER_MS);
  }

  private hideConnectionBanner(): void {
    this.clearBannerTimer();
    this.clearUnavailableTimer();
    this.showConnectionBanner.set(false);
  }

  private clearBannerTimer(): void {
    if (this.bannerTimer !== null) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  }

  private clearUnavailableTimer(): void {
    if (this.unavailableTimer !== null) {
      clearTimeout(this.unavailableTimer);
      this.unavailableTimer = null;
    }
  }

  /**
   * Retourne l'identifiant brut du socket.
   *
   * @returns L'ID du socket ou undefined si déconnecté.
   */
  id(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Envoie un événement Socket.io sans attendre de réponse de confirmation (fire-and-forget).
   *
   * @param event - Le nom de l'événement à émettre.
   * @param payload - Optionnel. Les données à envoyer avec l'événement.
   */
  emit<TPayload>(event: string, payload?: TPayload): void {
    if (!this.socket) {
      return;
    }
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
    if (!this.socket) {
      return Promise.reject(new Error('Socket indisponible hors navigateur'));
    }
    const socket = this.socket;
    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Pas de réponse du serveur pour "${event}" après 10s`));
      }, 10_000);
      socket.emit(event, payload, (response: TResponse) => {
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
    if (!this.socket) {
      return () => undefined;
    }
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
    if (!this.socket) {
      return;
    }
    if (handler) {
      this.socket.off(event, handler);
      return;
    }
    this.socket.off(event);
  }
}

