import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { GridCreationModalComponent } from '../grid-creation-modal/grid-creation-modal';
import { JoinRoomModalComponent } from '../join-room-modal/join-room-modal';

@Component({
  selector: 'app-landing-page',
  imports: [GridCreationModalComponent, JoinRoomModalComponent],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly ui = inject(UiStateService);

  openCreateModal(): void {
    this.ui.gridCreationOpen.set(true);
  }

  openJoinModal(): void {
    this.ui.joinRoomError.set(null);
    this.ui.joinRoomOpen.set(true);
  }
}
