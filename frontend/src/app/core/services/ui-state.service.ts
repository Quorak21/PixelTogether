import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private readonly auth = inject(AuthService);

  readonly gameMode = signal(false);
  readonly currentRoomId = signal<string | null>(null);
  readonly currentHost = signal<string | null>(null);

  readonly gridCreationOpen = signal(false);
  readonly paletteOpen = signal(false);
  readonly chatboxOpen = signal(false);
  readonly galleryOpen = signal(false);
  readonly helpGridCreationOpen = signal(false);
  readonly inviteWindowOpen = signal(false);

  readonly selectedColor = signal('#000000');
  readonly chosenColors = signal<(string | null)[]>(Array(10).fill(null));
  readonly showPersonalGallery = signal(false);

  readonly isAnyModalOpen = computed(
    () =>
      this.gridCreationOpen() ||
      this.paletteOpen() ||
      this.chatboxOpen() ||
      this.galleryOpen() ||
      this.inviteWindowOpen()
  );

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (!user?.pseudo) {
        this.chosenColors.set(Array(10).fill(null));
        this.selectedColor.set('#000000');
        return;
      }

      const saved = localStorage.getItem(`chosenColors_${user.pseudo}`);
      if (!saved) {
        this.chosenColors.set(Array(10).fill(null));
        this.selectedColor.set('#000000');
        return;
      }

      try {
        const parsed = JSON.parse(saved) as (string | null)[];
        const padded = [...parsed.slice(0, 10)];
        while (padded.length < 10) padded.push(null);
        this.chosenColors.set(padded);
        this.selectedColor.set(padded[0] ?? '#000000');
      } catch {
        this.chosenColors.set(Array(10).fill(null));
        this.selectedColor.set('#000000');
      }
    });

    effect(() => {
      const user = this.auth.currentUser();
      if (!user?.pseudo) {
        return;
      }
      localStorage.setItem(`chosenColors_${user.pseudo}`, JSON.stringify(this.chosenColors()));
    });
  }

  newGame(): void {
    this.gameMode.set(true);
  }

  joinGame(roomId: string, host: string): void {
    this.currentRoomId.set(roomId);
    this.currentHost.set(host);
    this.gameMode.set(true);
  }

  exitGame(): void {
    this.currentRoomId.set(null);
    this.currentHost.set(null);
    this.gameMode.set(false);
    this.chatboxOpen.set(false);
    this.paletteOpen.set(false);
    this.inviteWindowOpen.set(false);
  }

  setSelectedColor(color: string): void {
    this.selectedColor.set(color);
  }

  setChosenColor(index: number, color: string | null): void {
    const next = [...this.chosenColors()];
    next[index] = color;
    this.chosenColors.set(next);
  }
}
