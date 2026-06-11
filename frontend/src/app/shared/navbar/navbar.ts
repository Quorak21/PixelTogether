import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder';

function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

@Component({
  selector: 'app-navbar',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(Date.now());

  // décompte basé sur sessionEndsAt serveur (inclut les +5s transition)
  readonly sessionTimerLabel = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return null;
    }
    return formatRemainingMs(endsAt - this.now());
  });

  constructor() {
    const interval = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
    });
  }

  // sortie contextuelle : closeRoom (manager WR), leaveWaitingRoom, exitGame ou retour lobby
  handleExitToLobby(): void {
    const eventId = this.ui.currentEventId() ?? this.ui.currentRoomId();

    if (eventId) {
      if (this.ui.waitingMode()) {
        if (this.ui.isManager()) {
          this.socket.emit('closeRoom', { eventId, roomId: eventId });
        } else {
          this.socket.emit('leaveWaitingRoom', { eventId, roomId: eventId });
        }
        this.ui.exitWaitingRoom();
        void this.router.navigateByUrl('/');
        return;
      }

      if (this.ui.gameMode()) {
        if (this.ui.isManager()) {
          this.ui.gameMode.set(false);
          this.ui.currentGroupCode.set(null);
          void this.router.navigateByUrl(`/lobby/${eventId}`);
          return;
        }

        this.socket.emit('exitGame', {
          eventId,
          groupCode: this.ui.currentGroupCode(),
          roomId: eventId,
        });
        this.ui.exitGame();
      }
    }

    void this.router.navigateByUrl('/');
  }
}
