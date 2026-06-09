import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { CanvasComponent } from '../canvas/canvas';
import { ColorPaletteComponent } from '../color-palette/color-palette';
import { ChatboxComponent } from '../chatbox/chatbox';

@Component({
  selector: 'app-game-page',
  imports: [CanvasComponent, ColorPaletteComponent, ChatboxComponent],
  templateUrl: './game-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent {
  readonly ui = inject(UiStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roomId = signal(this.route.snapshot.paramMap.get('roomId')?.toUpperCase() ?? '');

  constructor() {
    if (!this.roomId()) {
      this.router.navigateByUrl('/lobby');
      return;
    }

    this.ui.currentRoomId.set(this.roomId());
    this.ui.gameMode.set(true);
  }
}
