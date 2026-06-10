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
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

const TRANSITION_MS = 5000;

@Component({
  selector: 'app-group-transition-modal',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './group-transition-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTransitionModalComponent {
  readonly ui = inject(UiStateService);
  private readonly destroyRef = inject(DestroyRef);

  /** When true, auto-reads payload from UiStateService */
  readonly useGlobalState = input(true);
  readonly dismissed = output<void>();

  readonly visible = signal(true);
  readonly secondsLeft = signal(5);

  constructor() {
    const interval = window.setInterval(() => {
      this.secondsLeft.update((value) => Math.max(0, value - 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      this.close();
    }, TRANSITION_MS);

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
