import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

// overlay post-gameStarted — fermeture manuelle (le chrono compétitif inclut déjà la marge serveur)
@Component({
  selector: 'app-group-transition-modal',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './group-transition-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupTransitionModalComponent {
  readonly ui = inject(UiStateService);

  readonly useGlobalState = input(true);
  readonly dismissed = output<void>();

  readonly visible = signal(true);

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
