import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { GROUP_TRANSITION_MS, GROUP_TRANSITION_SECONDS } from '../../../core/config/session-config';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

// overlay 5s post-gameStarted — synchro avec SESSION_TRANSITION_SECONDS back
@Component({
  selector: 'app-group-transition-modal',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './group-transition-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTransitionModalComponent {
  readonly ui = inject(UiStateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly useGlobalState = input(true); // lit groupTransition depuis UiStateService si true
  readonly dismissed = output<void>();

  readonly visible = signal(true);
  readonly secondsLeft = signal(GROUP_TRANSITION_SECONDS);

  constructor() {
    const interval = window.setInterval(() => {
      this.secondsLeft.update((value) => Math.max(0, value - 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      this.close();
    }, GROUP_TRANSITION_MS);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    });
  }

  close(): void {
    if (!this.visible()) {
      return;
    }
    this.visible.set(false);
    if (this.useGlobalState()) {
      this.ui.clearGroupTransition();
    }
    this.dismissed.emit();
  }
}
