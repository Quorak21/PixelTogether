import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EventGroupCard } from '../../../types/entities';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

// vignette groupe lobby — le parent gère joinGroup + navigation
@Component({
  selector: 'app-room-card',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './room-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCardComponent {
  readonly group = input.required<EventGroupCard>();
  readonly image = input<string>('');
  readonly joinGroup = output<void>();
}
