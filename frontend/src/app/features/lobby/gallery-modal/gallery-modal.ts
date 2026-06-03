import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { GalleryGrid } from '../../../types/entities';
import { GalleryCardComponent } from '../gallery-card/gallery-card';

@Component({
  selector: 'app-gallery-modal',
  imports: [GalleryCardComponent],
  templateUrl: './gallery-modal.html',
  styleUrl: './gallery-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryModalComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);

  readonly galleryData = signal<GalleryGrid[]>([]);

  constructor() {
    effect(() => {
      const isOpen = this.ui.galleryOpen();
      const showPersonal = this.ui.showPersonalGallery();
      if (!isOpen) {
        return;
      }
      if (showPersonal) {
        this.loadMyGallery();
      } else {
        this.loadPublicGallery();
      }
    });
  }

  async loadPublicGallery(): Promise<void> {
    const response = await this.socket.emitAckOnly<{ grids: GalleryGrid[] }>('askGallery');
    this.galleryData.set(response?.grids ?? []);
  }

  async loadMyGallery(): Promise<void> {
    const response = await this.socket.emitAckOnly<{ grids: GalleryGrid[] }>('askMyGallery');
    this.galleryData.set(response?.grids ?? []);
  }

  handleDelete(gridId: string): void {
    this.socket.emit('deleteGrid', { gridId });
    this.galleryData.set(this.galleryData().filter((grid) => grid.id !== gridId));
  }

  handlePublicToggle(gridId: string, currentValue: boolean): void {
    this.socket.emit('updateGridOnGallery', { gridId, newValue: !currentValue });
    this.galleryData.set(
      this.galleryData().map((grid) =>
        grid.id === gridId ? { ...grid, onGallery: !currentValue } : grid
      )
    );
  }
}
