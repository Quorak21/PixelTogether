import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EventGroupCard, LobbyRoom } from '../../../types/entities';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

@Component({
  selector: 'app-room-card',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './room-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCardComponent {
  readonly room = input<LobbyRoom>();
  readonly group = input<EventGroupCard>();
  readonly image = input<string>('');
  readonly hostMode = input(false);
  readonly join = output<void>();
  readonly joinGroup = output<void>();
}
