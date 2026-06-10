import { computed, Injectable, signal } from '@angular/core';
import { GroupTransitionPayload, ParticipantRole, PlayerProfile } from '../../types/entities';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly waitingMode = signal(false);
  readonly gameMode = signal(false);
  readonly gameTheme = signal('');
  readonly partyName = signal('');
  readonly groupLabel = signal('');
  readonly currentRoomId = signal<string | null>(null);
  readonly currentEventId = signal<string | null>(null);
  readonly currentGroupCode = signal<string | null>(null);
  readonly groupTransition = signal<GroupTransitionPayload | null>(null);
  readonly currentRole = signal<ParticipantRole | null>(null);
  readonly isHost = computed(() => this.currentRole() === 'host');
  readonly inRoom = computed(() => this.waitingMode() || this.gameMode());
  readonly currentProfile = signal<PlayerProfile | null>(null);
  readonly hasProfile = computed(() => this.currentProfile() !== null);

  readonly gridCreationOpen = signal(false);
  readonly joinRoomOpen = signal(false);
  readonly joinRoomError = signal<string | null>(null);

  readonly selectedColor = signal('#000000');
  readonly colors = signal<string[]>([]);

  joinWaitingRoom(eventId: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(eventId);
    this.currentGroupCode.set(null);
    this.waitingMode.set(true);
    this.gameMode.set(false);
  }

  joinGame(eventId: string, groupCode?: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(groupCode ? `${eventId}/${groupCode}` : eventId);
    this.currentGroupCode.set(groupCode ?? null);
    this.waitingMode.set(false);
    this.gameMode.set(true);
  }

  setGroupTransition(payload: GroupTransitionPayload | null): void {
    this.groupTransition.set(payload);
  }

  clearGroupTransition(): void {
    this.groupTransition.set(null);
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
    this.currentEventId.set(null);
    this.currentGroupCode.set(null);
    this.currentRole.set(null);
    this.waitingMode.set(false);
    this.gameTheme.set('');
    this.partyName.set('');
    this.groupLabel.set('');
    this.clearGroupTransition();
    this.clearCurrentProfile();
  }

  exitGame(): void {
    this.currentRoomId.set(null);
    this.currentEventId.set(null);
    this.currentGroupCode.set(null);
    this.currentRole.set(null);
    this.waitingMode.set(false);
    this.gameMode.set(false);
    this.gameTheme.set('');
    this.partyName.set('');
    this.groupLabel.set('');
    this.clearGroupTransition();
    this.clearCurrentProfile();
    this.colors.set([]);
    this.selectedColor.set('#000000');
  }

  setSelectedColor(color: string): void {
    this.selectedColor.set(color);
  }

  setColorsFromGrid(gridColors: string[]): void {
    this.colors.set([...gridColors]);

    if (gridColors.length && !gridColors.includes(this.selectedColor())) {
      this.setSelectedColor(gridColors[0]);
    }
  }

  setColorsFromTransition(myColors: string[]): void {
    if (!myColors.length) {
      return;
    }
    this.colors.set([...myColors]);
    this.setSelectedColor(myColors[0]);
  }
}
