import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  GalleryGrid,
  PlayerProfile,
  VoteCandidate,
  WaitingRoomPlayer,
  WrMode,
} from '../../../types/entities';
import { PlayerCardComponent } from '../player-card/player-card';

export interface TransitionWinner {
  groupCode: string;
  label: string;
  image: string | null;
  voteCount: number;
  players?: PlayerProfile[];
}

@Component({
  selector: 'app-transition-room',
  imports: [PlayerCardComponent],
  templateUrl: './transition-room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitionRoomComponent {
  readonly wrMode = input.required<WrMode>();
  readonly players = input<WaitingRoomPlayer[]>([]);
  readonly voteCandidates = input<VoteCandidate[]>([]);
  readonly myVote = input<string | null>(null);
  readonly winner = input<TransitionWinner | null>(null);
  readonly winnerImage = input<string | null>(null);
  readonly sessionResultGrid = input<GalleryGrid | null>(null);
  readonly isManager = input(false);
  readonly isCoop = input(false);
  readonly canStart = input(false);
  readonly isStarting = input(false);
  readonly isClosingVote = input(false);
  readonly isShowingResults = input(false);
  readonly isLastVote = input(false);
  readonly startButtonLabel = input('Démarrer');
  readonly startError = input('');
  readonly voteError = input('');
  readonly partyError = input('');

  readonly vote = output<string>();
  readonly closeVote = output<void>();
  readonly startClick = output<void>();
  readonly showResults = output<void>();
  readonly enlargeImage = output<{ url: string; title: string; players?: PlayerProfile[] }>();

  onEnlarge(url: string | null, title: string, players?: PlayerProfile[]): void {
    if (!url) return;
    this.enlargeImage.emit({ url, title, players });
  }
}
