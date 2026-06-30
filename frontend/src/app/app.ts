import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { SocketService } from './core/services/socket.service';
import { UiStateService } from './core/services/ui-state.service';
import { SessionTokenService } from './core/services/session-token.service';
import { LucideMonitor } from '@lucide/angular';

interface RoomLifecyclePayload {
  eventId?: string;
  roomId?: string;
}

interface PlayerKickedPayload {
  roomId: string;
  message: string;
  banned: boolean;
}

interface ManagerAbsentWarningPayload {
  eventId?: string;
  roomId?: string;
  title?: string;
  message: string;
  closesInMs?: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, LucideMonitor],
  templateUrl: './app.html',
  host: { class: 'block h-dvh' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly ui = inject(UiStateService);
  readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly destroyRef = inject(DestroyRef);

  // Signal indiquant si l'appareil est un mobile ou une tablette non supportés
  readonly isUnsupportedDevice = signal(false);

  constructor() {
    this.isUnsupportedDevice.set(this.checkDeviceSupport());

    const onWarning = (payload: ManagerAbsentWarningPayload) => {
      this.ui.showManagerAbsentWarning(
        payload.message,
        payload.closesInMs ?? 5000,
        payload.title ?? 'Manager absent',
      );
    };

    const onAbsent = () => {
      this.ui.clearManagerAbsentWarning();
      this.sessionToken.clear();
      this.ui.exitWaitingRoom();
      this.ui.exitGame();
      void this.router.navigateByUrl('/');
    };

    const onRoomClosed = (payload: RoomLifecyclePayload) => {
      const closedId = payload.eventId ?? payload.roomId;
      const session = this.sessionToken.read();
      if (!closedId || !session) return;
      if (session.eventId.toUpperCase() !== closedId.toUpperCase()) return;

      this.sessionToken.clear();
      this.ui.exitWaitingRoom();
      this.ui.exitGame();
      void this.router.navigateByUrl('/');
    };

    const onPlayerKicked = (payload: PlayerKickedPayload) => {
      const session = this.sessionToken.read();
      if (!session) return;
      if (
        session.eventId &&
        session.eventId.toUpperCase() !== payload.roomId.toUpperCase()
      ) {
        return;
      }

      this.sessionToken.clearEventBinding();
      this.ui.exitWaitingRoom();
      void this.router.navigateByUrl('/');
    };

    this.socket.on<ManagerAbsentWarningPayload>('managerAbsentWarning', onWarning);
    this.socket.on('managerAbsent', onAbsent);
    this.socket.on<RoomLifecyclePayload>('roomClosed', onRoomClosed);
    this.socket.on<PlayerKickedPayload>('playerKicked', onPlayerKicked);

    this.destroyRef.onDestroy(() => {
      this.socket.off('managerAbsentWarning', onWarning as (...args: unknown[]) => void);
      this.socket.off('managerAbsent', onAbsent as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      this.socket.off('playerKicked', onPlayerKicked as (...args: unknown[]) => void);
      this.ui.clearManagerAbsentWarning();
    });
  }

  /**
   * Vérifie si le joueur tente de se connecter depuis un smartphone ou une tablette.
   * On cible spécifiquement les User Agents mobiles ainsi que les iPad récents sous iPadOS,
   * sans impacter les ordinateurs (même tactiles) ou le simple redimensionnement de fenêtre.
   *
   * @returns true si l'appareil est un mobile ou une tablette non supporté, false sinon.
   */
  private checkDeviceSupport(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent || '';
    
    // Détection classique des smartphones et tablettes via le User Agent
    const isMobileOrTabletUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Cas particulier des iPads sous iOS 13+ qui se font passer pour des Mac dans le User Agent
    // mais possèdent un écran tactile multipoint (maxTouchPoints > 1)
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    return isMobileOrTabletUA || isIPadOS;
  }
}
