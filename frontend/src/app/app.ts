import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { SocketService } from './core/services/socket.service';
import { SeoService } from './core/services/seo.service';
import { UiStateService } from './core/services/ui-state.service';
import { SessionTokenService } from './core/services/session-token.service';
import { DeviceSupportService } from './core/services/device-support.service';
import { isSessionAppPath } from './core/utils/device-support';
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

interface ManagerAbsentBannerPayload {
  eventId?: string;
  roomId?: string;
  message: string;
  mode?: string;
}

interface ManagerAbsentCoopPayload {
  eventId?: string;
  roomId?: string;
  message: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, NavbarComponent, FooterComponent, LucideMonitor],
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
  private readonly device = inject(DeviceSupportService);
  private readonly url = signal(this.router.url);

  /** Téléphone ou tablette : l'atelier en direct est bloqué, les pages d'information restent lisibles. */
  readonly blockSessionOnMobile = computed(
    () => this.device.isUnsupportedDevice() && isSessionAppPath(this.url()),
  );

  constructor() {
    inject(SeoService);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.url.set(event.urlAfterRedirects);
      }
    });

    const onWarning = (payload: ManagerAbsentWarningPayload) => {
      this.ui.showManagerAbsentWarning(
        payload.message,
        payload.closesInMs ?? 5000,
        payload.title ?? 'Animateur absent',
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

    const onAbsentBanner = (payload: ManagerAbsentBannerPayload) => {
      this.ui.clearManagerAbsentWarning();
      this.ui.showManagerAbsentBanner(payload.message);
    };

    const onAbsentCoop = (payload: ManagerAbsentCoopPayload) => {
      this.ui.showManagerAbsentBanner(payload.message);
      this.ui.setCoopManagerAbsent(true);
    };

    const onAbsentCleared = () => {
      this.ui.clearManagerAbsentBanner();
      this.ui.setCoopManagerAbsent(false);
    };

    this.socket.on<ManagerAbsentWarningPayload>('managerAbsentWarning', onWarning);
    this.socket.on('managerAbsent', onAbsent);
    this.socket.on<ManagerAbsentBannerPayload>('managerAbsentBanner', onAbsentBanner);
    this.socket.on<ManagerAbsentCoopPayload>('managerAbsentCoop', onAbsentCoop);
    this.socket.on('managerAbsentCleared', onAbsentCleared);
    this.socket.on<RoomLifecyclePayload>('roomClosed', onRoomClosed);
    this.socket.on<PlayerKickedPayload>('playerKicked', onPlayerKicked);

    this.destroyRef.onDestroy(() => {
      this.socket.off('managerAbsentWarning', onWarning as (...args: unknown[]) => void);
      this.socket.off('managerAbsent', onAbsent as (...args: unknown[]) => void);
      this.socket.off('managerAbsentBanner', onAbsentBanner as (...args: unknown[]) => void);
      this.socket.off('managerAbsentCoop', onAbsentCoop as (...args: unknown[]) => void);
      this.socket.off('managerAbsentCleared', onAbsentCleared as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      this.socket.off('playerKicked', onPlayerKicked as (...args: unknown[]) => void);
      this.ui.clearManagerAbsentWarning();
      this.ui.clearManagerAbsentBanner();
    });
  }

}
