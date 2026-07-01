import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PendingWaitingRoomPlayer, WaitingRoomPlayer } from '../../../types/entities';
import { PlayerCardComponent } from '../player-card/player-card';
import { PendingPlayerCardComponent } from '../pending-player-card/pending-player-card';

@Component({
  selector: 'app-wr-gathering',
  imports: [PlayerCardComponent, PendingPlayerCardComponent],
  templateUrl: './waiting-room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitingRoomComponent {
  readonly players = input<WaitingRoomPlayer[]>([]);
  readonly pendingPlayers = input<PendingWaitingRoomPlayer[]>([]);
  readonly isManager = input(false);
  readonly canStart = input(false);
  readonly isStarting = input(false);
  readonly startError = input('');
  readonly partyStarted = input(false);
  readonly startButtonLabel = input('Démarrer');
  readonly startClick = output<void>();
  readonly openInvite = output<void>();
  readonly kickClick = output<string>();
}
