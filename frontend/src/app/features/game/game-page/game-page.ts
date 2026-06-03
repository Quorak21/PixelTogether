import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { GridPrivacy } from '../../../types/entities';
import { CanvasComponent } from '../canvas/canvas';
import { GameUiComponent } from '../game-ui/game-ui';
import { ColorPaletteComponent } from '../color-palette/color-palette';
import { ChatboxComponent } from '../chatbox/chatbox';
import { InviteWindowComponent } from '../invite-window/invite-window';

@Component({
  selector: 'app-game-page',
  imports: [
    CanvasComponent,
    GameUiComponent,
    ColorPaletteComponent,
    ChatboxComponent,
    InviteWindowComponent
  ],
  templateUrl: './game-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GamePageComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = signal(this.route.snapshot.paramMap.get('roomId') ?? '');
  readonly gridType = signal<GridPrivacy>('public');
  readonly hintMessage = signal<string | null>(null);
  private backgroundTimer: number | null = null;

  constructor() {
    if (!this.roomId()) {
      this.router.navigateByUrl('/lobby');
      return;
    }

    this.ui.currentRoomId.set(this.roomId());
    this.ui.gameMode.set(true);

    const onJoinedRoom = (data: { pseudo: string }) => this.showHint(`✨ ${data.pseudo} a rejoint la partie !`);
    const onExitGame = (data: { user: string }) => this.showHint(`🏃 ${data.user} a quitte la partie.`);

    this.socket.on<{ pseudo: string }>('joinedRoom', onJoinedRoom);
    this.socket.on<{ user: string }>('exitGame', onExitGame);

    const onVisibility = () => {
      if (this.socket.id() !== this.ui.currentHost()) {
        return;
      }
      if (document.hidden) {
        this.backgroundTimer = window.setTimeout(() => {
          this.socket.emit('closeRoom', { roomId: this.roomId() });
          this.ui.exitGame();
          this.router.navigateByUrl('/lobby');
        }, 10000);
      } else if (this.backgroundTimer) {
        window.clearTimeout(this.backgroundTimer);
        this.backgroundTimer = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    this.destroyRef.onDestroy(() => {
      this.socket.off('joinedRoom', onJoinedRoom as (...args: unknown[]) => void);
      this.socket.off('exitGame', onExitGame as (...args: unknown[]) => void);
      document.removeEventListener('visibilitychange', onVisibility);
      if (this.backgroundTimer) {
        window.clearTimeout(this.backgroundTimer);
      }
    });
  }

  private showHint(message: string): void {
    this.hintMessage.set(message);
    window.setTimeout(() => this.hintMessage.set(null), 5000);
  }
}
