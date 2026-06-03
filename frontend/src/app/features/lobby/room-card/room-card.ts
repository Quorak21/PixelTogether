import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LobbyRoom } from '../../../types/entities';

@Component({
  selector: 'app-room-card',
  templateUrl: './room-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomCardComponent {
  readonly room = input.required<LobbyRoom>();
  readonly image = input<string>('');
  readonly join = output<void>();
}
