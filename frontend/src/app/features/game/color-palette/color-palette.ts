import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { BuyColorResponse } from '../../../types/socket-payloads';

@Component({
  selector: 'app-color-palette',
  imports: [FormsModule, NgOptimizedImage, CdkDrag, CdkDragHandle],
  templateUrl: './color-palette.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorPaletteComponent {
  readonly ui = inject(UiStateService);
  readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly colors = signal<string[]>([]);
  readonly isEditing = signal(false);
  readonly editingIndex = signal(0);
  readonly isBuying = signal(false);
  readonly errorMessage = signal('');
  readonly buyNewColor = signal('#aabbcc');

  constructor() {
    const onColors = (data: { colors: string[] }) => {
      this.colors.set(data.colors ?? []);
      if (this.ui.chosenColors().every((c) => c === null) && data.colors?.length) {
        const initial = Array(10).fill(null) as (string | null)[];
        let added = 0;
        for (const color of data.colors) {
          if (added >= 10) {
            break;
          }
          initial[added] = color;
          added += 1;
        }
        this.ui.chosenColors.set(initial);
      }
    };

    this.socket.on<{ colors: string[] }>('colors', onColors);
    this.socket.emit('getColors');

    this.destroyRef.onDestroy(() => {
      this.socket.off('colors', onColors as (...args: unknown[]) => void);
    });
  }

  replaceColor(color: string): void {
    this.ui.setChosenColor(this.editingIndex(), color);
    this.editingIndex.set((this.editingIndex() + 1) % 10);
  }

  openBuyingMode(): void {
    this.isBuying.set(true);
    this.isEditing.set(false);
  }

  selectColor(color: string): void {
    this.ui.setSelectedColor(color);
    this.ui.paletteOpen.set(false);
  }

  async buyColor(): Promise<void> {
    const response = await this.socket.emitWithAck<{ color: string }, BuyColorResponse>('buyColor', {
      color: this.buyNewColor()
    });

    if (!response.success || typeof response.gold !== 'number') {
      this.errorMessage.set(response.message ?? 'Achat impossible');
      return;
    }

    this.auth.setGold(response.gold);
    this.ui.setChosenColor(this.editingIndex(), this.buyNewColor());
    this.editingIndex.set((this.editingIndex() + 1) % 10);
    this.socket.emit('getColors');
    this.isBuying.set(false);
    this.errorMessage.set('');
  }
}
