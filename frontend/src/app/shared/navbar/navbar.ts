import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder';

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

  handleExitToLobby(): void {
    const eventId = this.ui.currentEventId() ?? this.ui.currentRoomId();

    if (eventId) {
      if (this.ui.waitingMode()) {
        if (this.ui.isHost()) {
          this.socket.emit('closeRoom', { eventId, roomId: eventId });
        } else {
          this.socket.emit('leaveWaitingRoom', { eventId, roomId: eventId });
        }
        this.ui.exitWaitingRoom();
        void this.router.navigateByUrl('/');
        return;
      }

      if (this.ui.gameMode()) {
        if (this.ui.isHost()) {
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
