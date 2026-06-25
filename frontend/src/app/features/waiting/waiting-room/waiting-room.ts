import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { WaitingRoomPlayer } from '../../../types/entities';
import { PlayerCardComponent } from '../player-card/player-card';

@Component({
  selector: 'app-wr-gathering',
  imports: [PlayerCardComponent, LucidePlus],
  templateUrl: './waiting-room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitingRoomComponent {
  readonly players = input<WaitingRoomPlayer[]>([]);
  readonly isManager = input(false);
  readonly canStart = input(false);
  readonly isStarting = input(false);
  readonly startError = input('');
  readonly partyStarted = input(false);
  readonly startButtonLabel = input('Démarrer');
  readonly startClick = output<void>();
  readonly openInvite = output<void>();
}
