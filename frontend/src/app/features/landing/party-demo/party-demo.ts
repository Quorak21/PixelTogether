import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DEMO_ARTWORKS,
  DEMO_DRAW_STROKES,
  DEMO_FADE_MS,
  DEMO_GRID,
  DEMO_PHASE_MS,
  DEMO_PLAYERS,
  DemoPhase,
  emptyGrid,
} from './party-demo.util';

@Component({
  selector: 'app-party-demo',
  templateUrl: './party-demo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full max-w-[23.3rem]',
    'aria-hidden': 'true',
  },
})
export class PartyDemoComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly gridSize = DEMO_GRID;
  readonly players = DEMO_PLAYERS;
  readonly artworks = DEMO_ARTWORKS;

  readonly phase = signal<DemoPhase>('draw');
  readonly phaseVisible = signal(true);
  readonly drawCells = signal<(string | null)[]>(emptyGrid());
  readonly voteCounts = signal<number[]>([0, 0, 0]);
  readonly phaseLabel = signal('Dessin collaboratif');

  /** Ordre d’affichage podium : 2e | 1er | 3e */
  readonly podiumArts = computed(() => {
    const byRank = [...DEMO_ARTWORKS].sort((a, b) => a.rank - b.rank);
    return [byRank[1], byRank[0], byRank[2]];
  });

  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.runCycle();
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  private runCycle(): void {
    this.clearTimers();
    this.enterPhase('draw', () => this.startDrawAnimation());

    const toVoteAt = DEMO_PHASE_MS;
    const toPodiumAt = DEMO_PHASE_MS * 2;
    const restartAt = DEMO_PHASE_MS * 3;

    this.timers.push(
      setTimeout(() => this.enterPhase('vote', () => this.startVoteAnimation()), toVoteAt),
      setTimeout(() => this.enterPhase('podium', () => this.showPodium()), toPodiumAt),
      setTimeout(() => this.runCycle(), restartAt),
    );
  }

  private enterPhase(phase: DemoPhase, onReady: () => void): void {
    this.clearIntervals();
    this.phaseVisible.set(false);

    this.timers.push(
      setTimeout(() => {
        this.phase.set(phase);
        this.phaseLabel.set(
          phase === 'draw' ? 'Dessin collaboratif' : phase === 'vote' ? 'Vote' : 'Podium',
        );
        onReady();
        // laisse le DOM peindre en opacity 0 avant le fade-in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.phaseVisible.set(true));
        });
      }, DEMO_FADE_MS),
    );
  }

  private startDrawAnimation(): void {
    this.drawCells.set(emptyGrid());
    this.voteCounts.set([0, 0, 0]);

    const strokeCount = DEMO_DRAW_STROKES.length;
    const usableMs = DEMO_PHASE_MS - DEMO_FADE_MS * 2;
    const stepMs = Math.max(60, Math.floor(usableMs / strokeCount));
    let step = 0;

    const id = setInterval(() => {
      if (step >= strokeCount) {
        clearInterval(id);
        return;
      }
      const stroke = DEMO_DRAW_STROKES[step++];
      this.drawCells.update((cells) => {
        const next = cells.slice();
        next[stroke.i] = stroke.color;
        return next;
      });
    }, stepMs);
    this.intervals.push(id);
  }

  private startVoteAnimation(): void {
    this.voteCounts.set([0, 0, 0]);

    const targets = DEMO_ARTWORKS.map((art) => art.votes);
    const maxVotes = Math.max(...targets);
    const usableMs = DEMO_PHASE_MS - DEMO_FADE_MS * 2;
    const stepMs = Math.max(120, Math.floor(usableMs / (maxVotes + 1)));
    let tick = 0;

    const id = setInterval(() => {
      tick += 1;
      this.voteCounts.set(targets.map((v) => Math.min(v, tick)));
      if (tick >= maxVotes) {
        clearInterval(id);
      }
    }, stepMs);
    this.intervals.push(id);
  }

  private showPodium(): void {
    this.voteCounts.set(DEMO_ARTWORKS.map((art) => art.votes));
  }

  private clearIntervals(): void {
    for (const id of this.intervals) {
      clearInterval(id);
    }
    this.intervals = [];
  }

  private clearTimers(): void {
    this.clearIntervals();
    for (const id of this.timers) {
      clearTimeout(id);
    }
    this.timers = [];
  }
}
