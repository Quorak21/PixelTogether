import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { SocketService } from './core/services/socket.service';
import { UiStateService } from './core/services/ui-state.service';
import { SessionTokenService } from './core/services/session-token.service';

interface ManagerAbsentWarningPayload {
  eventId?: string;
  roomId?: string;
  message: string;
  closesInMs?: number;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  host: { class: 'block h-dvh' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const onWarning = (payload: ManagerAbsentWarningPayload) => {
      this.ui.showManagerAbsentWarning(
        payload.message,
        payload.closesInMs ?? 5000,
      );
    };

    const onAbsent = () => {
      this.ui.clearManagerAbsentWarning();
      this.sessionToken.clear();
      this.ui.exitWaitingRoom();
      this.ui.exitGame();
      void this.router.navigateByUrl('/');
    };

    this.socket.on<ManagerAbsentWarningPayload>('managerAbsentWarning', onWarning);
    this.socket.on('managerAbsent', onAbsent);

    this.destroyRef.onDestroy(() => {
      this.socket.off('managerAbsentWarning', onWarning as (...args: unknown[]) => void);
      this.socket.off('managerAbsent', onAbsent as (...args: unknown[]) => void);
      this.ui.clearManagerAbsentWarning();
    });
  }
}
