import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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

  readonly gridClass = computed(() => {
    const count = this.group().players.length;
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-3'; // fallback
  });
}
