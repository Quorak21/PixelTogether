import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { ChatInputComponent } from '../../../shared/chatbox/chat-input';
import { ChatboxComponent } from '../../../shared/chatbox/chatbox';
import { CanvasComponent } from '../canvas/canvas';
import { ColorPaletteComponent } from '../color-palette/color-palette';
import { GroupTransitionModalComponent } from '../group-transition-modal/group-transition-modal';

function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

@Component({
  selector: 'app-game-page',
  imports: [
    CanvasComponent,
    ColorPaletteComponent,
    ChatboxComponent,
    ChatInputComponent,
    GroupTransitionModalComponent,
  ],
  templateUrl: './game-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// shell jeu : canvas + chat + palette (palette masquée manager côté template)
export class GamePageComponent {
  readonly ui = inject(UiStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly now = signal(Date.now());

  readonly eventId = signal(this.route.snapshot.paramMap.get('eventId')?.toUpperCase() ?? '');
  readonly groupCode = signal(this.route.snapshot.paramMap.get('groupCode') ?? '');
  readonly transitionActive = signal(Boolean(this.ui.groupTransition()));

  readonly sessionTimerLabel = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return null;
    }
    return formatRemainingMs(endsAt - this.now());
  });

  readonly sessionTimerUrgent = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return false;
    }
    return endsAt - this.now() <= 60_000;
  });

  constructor() {
    const interval = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
    });

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
