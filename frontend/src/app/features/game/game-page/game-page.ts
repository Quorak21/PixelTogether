import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { CanvasComponent } from '../canvas/canvas';
import { ColorPaletteComponent } from '../color-palette/color-palette';
import { ChatboxComponent } from '../chatbox/chatbox';
import { GroupTransitionModalComponent } from '../group-transition-modal/group-transition-modal';

@Component({
  selector: 'app-game-page',
  imports: [
    CanvasComponent,
    ColorPaletteComponent,
    ChatboxComponent,
    GroupTransitionModalComponent,
  ],
  templateUrl: './game-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePageComponent {
  readonly ui = inject(UiStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly eventId = signal(this.route.snapshot.paramMap.get('eventId')?.toUpperCase() ?? '');
  readonly groupCode = signal(this.route.snapshot.paramMap.get('groupCode') ?? '');
  readonly transitionActive = signal(Boolean(this.ui.groupTransition()));

  constructor() {
    const eventId = this.eventId();
    const groupCode = this.groupCode();

    if (!eventId || !groupCode) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.ui.currentEventId.set(eventId);
    this.ui.currentGroupCode.set(groupCode);
    this.ui.joinGame(eventId, groupCode);
  }

  onTransitionDismissed(): void {
    this.transitionActive.set(false);
  }

  returnToLobby(): void {
    const eventId = this.eventId();
    if (eventId) {
      void this.router.navigateByUrl(`/lobby/${eventId}`);
    }
  }
}
