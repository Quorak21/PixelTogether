import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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

  onEnlarge(url: string | null, title: string, players?: PlayerProfile[]): void {
    if (!url) return;
    this.enlargeImage.emit({ url, title, players });
  }
}
