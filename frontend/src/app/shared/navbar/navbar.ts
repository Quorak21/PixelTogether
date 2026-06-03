import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-navbar',
  imports: [NgOptimizedImage],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  handleExitToLobby(): void {
    const roomId = this.ui.currentRoomId();

    if (roomId) {
      if (this.socket.id() === this.ui.currentHost()) {
        this.socket.emit('closeRoom', { roomId });
      } else {
        this.socket.emit('exitGame', { roomId });
      }
    }

    this.ui.exitGame();
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/lobby');
    }
  }

  openPublicGallery(): void {
    this.ui.showPersonalGallery.set(false);
    this.ui.galleryOpen.set(!this.ui.galleryOpen());
  }

  openPersonalGallery(): void {
    this.ui.showPersonalGallery.set(true);
    this.ui.galleryOpen.set(!this.ui.galleryOpen());
  }

  logout(): void {
    this.handleExitToLobby();
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
