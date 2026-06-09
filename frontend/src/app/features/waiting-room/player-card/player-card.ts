import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WaitingRoomPlayer } from '../../../types/entities';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

@Component({
  selector: 'app-player-card',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './player-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  readonly player = input.required<WaitingRoomPlayer>();
}
