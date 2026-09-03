import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AvatarPlaceholderComponent } from '../../../shared/avatar-placeholder/avatar-placeholder';

@Component({
  selector: 'app-pending-player-card',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './pending-player-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingPlayerCardComponent {}
