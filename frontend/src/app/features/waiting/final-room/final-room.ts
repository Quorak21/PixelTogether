import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { GalleryGrid, PlayerProfile, PodiumGrid, PodiumPlayer, WrMode } from '../../../types/entities';

@Component({
  selector: 'app-final-room',
  templateUrl: './final-room.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalRoomComponent {
  readonly activeTab = signal<'drawings' | 'players'>('drawings');
  readonly wrMode = input.required<WrMode>();
  readonly topPlayers = input<PodiumPlayer[]>([]);
  readonly topGrids = input<PodiumGrid[]>([]);
  readonly galleryGrids = input<GalleryGrid[]>([]);
  readonly isManager = input(false);
  readonly canEndParty = input(false);
  readonly isEndingParty = input(false);
  readonly isDownloadingExport = input(false);
  readonly exportError = input('');
  readonly partyError = input('');

  readonly downloadExport = output<void>();
  readonly endParty = output<void>();
  readonly enlargeImage = output<{ url: string; title: string; players?: PlayerProfile[] }>();

  readonly firstGrid = computed(() => this.topGrids().find((g) => g.rank === 1));
  readonly secondGrid = computed(() => this.topGrids().find((g) => g.rank === 2));
  readonly thirdGrid = computed(() => this.topGrids().find((g) => g.rank === 3));

  readonly firstPlayer = computed(() => this.topPlayers().find((p) => p.rank === 1));
  readonly secondPlayer = computed(() => this.topPlayers().find((p) => p.rank === 2));
  readonly thirdPlayer = computed(() => this.topPlayers().find((p) => p.rank === 3));

  onEnlarge(url: string | null, title: string, players?: PlayerProfile[]): void {
    if (!url) return;
    this.enlargeImage.emit({ url, title, players });
  }
}
