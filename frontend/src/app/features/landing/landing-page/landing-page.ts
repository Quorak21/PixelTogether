import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { PartyCreationModalComponent } from '../party-creation-modal/party-creation-modal';
import { JoinRoomModalComponent } from '../join-room-modal/join-room-modal';

// entrée app : ouvre les modales via signals UiStateService (pas de socket ici)
@Component({
  selector: 'app-landing-page',
  imports: [PartyCreationModalComponent, JoinRoomModalComponent],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly ui = inject(UiStateService);

  openCreateModal(): void {
    this.ui.partyCreationOpen.set(true);
  }

  openJoinModal(): void {
    this.ui.joinRoomError.set(null);
    this.ui.joinRoomOpen.set(true);
  }
}
