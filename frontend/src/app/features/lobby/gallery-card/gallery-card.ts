import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { GalleryGrid } from '../../../types/entities';
import { SocketService } from '../../../core/services/socket.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-gallery-card',
  templateUrl: './gallery-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryCardComponent {
  private readonly socket = inject(SocketService);

  readonly item = input.required<GalleryGrid>();
  readonly personal = input(false);
  readonly deleteGrid = output<string>();
  readonly publicToggled = output<{ gridId: string; currentValue: boolean }>();

  readonly liked = signal<boolean | null>(null);
  readonly likes = signal<number | null>(null);
  readonly fullScreenImage = signal<GalleryGrid | null>(null);

  async handleLike(event: Event): Promise<void> {
    event.stopPropagation();
    if (this.personal() || (this.liked() ?? this.item().liked)) {
      return;
    }

    const response = await this.socket.emitWithAck<{ gridId: string }, { success: boolean; likes: number }>(
      'likeGrid',
      { gridId: this.item().id }
    );
    if (response.success) {
      this.liked.set(true);
      this.likes.set(response.likes);
    }
  }

  handleDelete(event: Event): void {
    event.stopPropagation();
    this.deleteGrid.emit(this.item().id);
  }

  togglePublic(): void {
    this.publicToggled.emit({ gridId: this.item().id, currentValue: !!this.item().onGallery });
  }

  openFullscreen(): void {
    this.fullScreenImage.set(this.item());
  }
}
