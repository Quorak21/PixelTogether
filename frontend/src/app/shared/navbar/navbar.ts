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
    const roomId = this.ui.currentRoomId();

    if (roomId) {
      if (this.ui.waitingMode()) {
        if (this.ui.isHost()) {
          this.socket.emit('closeRoom', { roomId });
        } else {
          this.socket.emit('leaveWaitingRoom', { roomId });
        }
        this.ui.exitWaitingRoom();
      } else if (this.ui.gameMode()) {
        if (this.ui.isHost()) {
          this.socket.emit('closeRoom', { roomId });
        } else {
          this.socket.emit('exitGame', { roomId });
        }
        this.ui.exitGame();
      }
    }

    this.router.navigateByUrl('/');
  }
}
