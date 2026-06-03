import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { GridPrivacy } from '../../../types/entities';
import { FinishConfirmModalComponent } from '../finish-confirm-modal/finish-confirm-modal';
import { EndScreenModalComponent } from '../end-screen-modal/end-screen-modal';

@Component({
  selector: 'app-game-ui',
  imports: [FinishConfirmModalComponent, EndScreenModalComponent],
  templateUrl: './game-ui.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameUiComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly gridType = input<GridPrivacy>('public');

  readonly showDeleteModal = signal(false);
  readonly showFinishModal = signal(false);
  readonly saved = signal(false);
  readonly showEndScreen = signal(false);
  readonly snapshot = signal('');
  readonly notification = signal(false);

  constructor() {
    const onGridSaved = () => {
      this.saved.set(true);
      window.setTimeout(() => this.saved.set(false), 2000);
    };
    const onReceiveMessage = () => {
      if (!this.ui.chatboxOpen()) {
        this.notification.set(true);
      }
    };

    this.socket.on('gridSaved', onGridSaved);
    this.socket.on('receiveMessage', onReceiveMessage);

    this.destroyRef.onDestroy(() => {
      this.socket.off('gridSaved', onGridSaved as (...args: unknown[]) => void);
      this.socket.off('receiveMessage', onReceiveMessage as (...args: unknown[]) => void);
    });
  }

  isHost(): boolean {
    return this.ui.currentHost() === this.socket.id();
  }

  askGallery(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      this.snapshot.set(canvas.toDataURL('image/png'));
    }
    this.showFinishModal.set(false);
    this.showEndScreen.set(true);
  }

  finishCanvas(isPublic: boolean): void {
    this.socket.emit('finishCanvas', { roomId: this.roomId(), onGallery: isPublic });
    this.auth.setGridId(null);
    this.ui.exitGame();
    this.router.navigateByUrl('/lobby');
  }

  deleteCanvas(): void {
    this.socket.emit('deleteCanvas', { roomId: this.roomId() });
    this.auth.setGridId(null);
    this.ui.exitGame();
    this.router.navigateByUrl('/lobby');
  }

  toggleChat(): void {
    this.ui.chatboxOpen.set(!this.ui.chatboxOpen());
    this.notification.set(false);
  }
}
