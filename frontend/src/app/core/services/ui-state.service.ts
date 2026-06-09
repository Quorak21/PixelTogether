import { computed, Injectable, signal } from '@angular/core';
import { ParticipantRole, PlayerProfile } from '../../types/entities';

const WHITE = '#ffffff';
const DEFAULT_COLORS = [
  '#000000',
  '#ff0000',
  '#ff6600',
  '#ffff00',
  '#00ff00',
  '#00ccff',
  '#0000ff',
  '#9900ff',
  '#ff00cc',
  WHITE,
];

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly waitingMode = signal(false);
  readonly gameMode = signal(false);
  readonly gameTheme = signal('');
  readonly currentRoomId = signal<string | null>(null);
  readonly currentRole = signal<ParticipantRole | null>(null);
  readonly isHost = computed(() => this.currentRole() === 'host');
  readonly inRoom = computed(() => this.waitingMode() || this.gameMode());
  readonly currentProfile = signal<PlayerProfile | null>(null);
  readonly hasProfile = computed(() => this.currentProfile() !== null);

  readonly gridCreationOpen = signal(false);
  readonly joinRoomOpen = signal(false);
  readonly joinRoomError = signal<string | null>(null);

  readonly selectedColor = signal(DEFAULT_COLORS[0]);
  readonly colors = signal<string[]>([...DEFAULT_COLORS]);

  joinWaitingRoom(roomId: string): void {
    this.currentRoomId.set(roomId);
    this.waitingMode.set(true);
    this.gameMode.set(false);
  }

  joinGame(roomId: string): void {
    this.currentRoomId.set(roomId);
    this.waitingMode.set(false);
    this.gameMode.set(true);
  }

  setRole(role: ParticipantRole): void {
    this.currentRole.set(role);
  }

  setCurrentProfile(profile: PlayerProfile): void {
    this.currentProfile.set(profile);
  }

  clearCurrentProfile(): void {
    this.currentProfile.set(null);
  }

  exitWaitingRoom(): void {
    this.currentRoomId.set(null);
    this.currentRole.set(null);
    this.waitingMode.set(false);
    this.gameTheme.set('');
    this.clearCurrentProfile();
  }

  exitGame(): void {
    this.currentRoomId.set(null);
    this.currentRole.set(null);
    this.waitingMode.set(false);
    this.gameMode.set(false);
    this.gameTheme.set('');
    this.clearCurrentProfile();
    this.colors.set([...DEFAULT_COLORS]);
    this.selectedColor.set(DEFAULT_COLORS[0]);
  }

  setSelectedColor(color: string): void {
    this.selectedColor.set(color);
  }

  setColorsFromGrid(gridColors: string[]): void {
    const merged = gridColors.includes(WHITE) ? [...gridColors] : [...gridColors, WHITE];
    this.colors.set(merged);

    if (!merged.includes(this.selectedColor())) {
      this.setSelectedColor(merged[0]);
    }
  }
}
