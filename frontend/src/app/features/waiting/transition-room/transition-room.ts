import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  GalleryGrid,
  PendingWaitingRoomPlayer,
  PlayerProfile,
  VoteCandidate,
  WaitingRoomPlayer,
  WrMode,
} from '../../../types/entities';
import { PlayerCardComponent } from '../player-card/player-card';
import { PendingPlayerCardComponent } from '../pending-player-card/pending-player-card';

export interface TransitionWinner {
  groupCode: string;
  label: string;
  image: string | null;
  voteCount: number;
  players?: PlayerProfile[];
}

@Component({
  selector: 'app-transition-room',
  imports: [PlayerCardComponent, PendingPlayerCardComponent],
  templateUrl: './transition-room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransitionRoomComponent {
  readonly wrMode = input.required<WrMode>();
  readonly players = input<WaitingRoomPlayer[]>([]);
  readonly pendingPlayers = input<PendingWaitingRoomPlayer[]>([]);
  readonly voteCandidates = input<VoteCandidate[]>([]);
  readonly myVote = input<string | null>(null);
  readonly winner = input<TransitionWinner | null>(null);
  readonly winnerImage = input<string | null>(null);
  readonly sessionTheme = input('');
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
  readonly autoPilotActive = input(false);
  readonly rouletteWinnerGroupCode = input<string | null>(null);
  readonly rouletteStartedAt = input<number | null>(null);
  readonly rouletteDurationMs = input<number | null>(null);
  readonly voteParticipation = input<{ cast: number; eligible: number } | null>(null);

  readonly vote = output<string>();
  readonly closeVote = output<void>();
  readonly startClick = output<void>();
  readonly showResults = output<void>();
  readonly enlargeImage = output<{ url: string; title: string; players?: PlayerProfile[] }>();

  readonly rouletteHighlight = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const started = this.rouletteStartedAt();
      const duration = this.rouletteDurationMs();
      const winner = this.rouletteWinnerGroupCode();
      const candidates = this.voteCandidates();

      if (!started || !duration || !winner || candidates.length < 2) {
        this.rouletteHighlight.set(null);
        return;
      }

      const codes = candidates.map((c) => c.groupCode);
      const endTime = started + duration;
      let idx = 0;
      let delay = 90;
      let timer: ReturnType<typeof setTimeout>;

      const tick = () => {
        const now = Date.now();
        if (now >= endTime) {
          this.rouletteHighlight.set(winner);
          return;
        }
        this.rouletteHighlight.set(codes[idx % codes.length] ?? null);
        idx += 1;
        delay = Math.min(550, delay * 1.1);
        timer = setTimeout(tick, delay);
      };

      if (Date.now() >= endTime) {
        this.rouletteHighlight.set(winner);
        return;
      }

      tick();
      onCleanup(() => clearTimeout(timer));
    });
  }

  isRouletteActive(): boolean {
    return Boolean(
      this.autoPilotActive() &&
        this.rouletteStartedAt() &&
        this.rouletteDurationMs() &&
        this.rouletteWinnerGroupCode(),
    );
  }

  isCandidateHighlighted(groupCode: string): boolean {
    if (this.isRouletteActive()) {
      return this.rouletteHighlight() === groupCode;
    }
    return false;
  }

  onEnlarge(url: string | null, title: string, players?: PlayerProfile[]): void {
    if (!url) return;
    this.enlargeImage.emit({ url, title, players });
  }
}
