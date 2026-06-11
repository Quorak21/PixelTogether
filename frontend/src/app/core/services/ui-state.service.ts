import { computed, Injectable, signal } from '@angular/core';
import { GroupTransitionPayload, ParticipantRole, PlayerProfile } from '../../types/entities';

// état client cross-route (navbar, transitions) — pas de NgRx, signals suffisent
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
  readonly sessionEndsAt = signal<number | null>(null);
  readonly sessionCount = signal(1);
  readonly currentSession = signal(1);
  readonly partyStarted = signal(false);
  readonly sessionLabel = computed(
    () => `Session ${this.currentSession()}/${this.sessionCount()}`,
  );
  readonly currentRole = signal<ParticipantRole | null>(null);
  readonly isManager = computed(() => this.currentRole() === 'manager');
  readonly inRoom = computed(() => this.waitingMode() || this.gameMode());
  readonly currentProfile = signal<PlayerProfile | null>(null);
  readonly hasProfile = computed(() => this.currentProfile() !== null);

  readonly partyCreationOpen = signal(false);
  readonly joinRoomOpen = signal(false);
  readonly joinRoomError = signal<string | null>(null);

  readonly selectedColor = signal('#000000');
  readonly colors = signal<string[]>([]);

  // bascule en mode WR, reset le groupCode
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

  setSessionEndsAt(timestamp: number | null | undefined): void {
    this.sessionEndsAt.set(timestamp ?? null);
  }

  clearSessionEndsAt(): void {
    this.sessionEndsAt.set(null);
  }

  setSessionMeta(
    sessionCount: number,
    currentSession: number,
    partyStarted?: boolean,
  ): void {
    this.sessionCount.set(sessionCount);
    this.currentSession.set(currentSession);
    if (partyStarted !== undefined) {
      this.partyStarted.set(partyStarted);
    }
  }

  clearSessionMeta(): void {
    this.sessionCount.set(1);
    this.currentSession.set(1);
    this.partyStarted.set(false);
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
    this.clearSessionEndsAt();
    this.clearSessionMeta();
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
    this.clearSessionEndsAt();
    this.clearSessionMeta();
    this.clearCurrentProfile();
    this.colors.set([]);
    this.selectedColor.set('#000000');
  }

  setSelectedColor(color: string): void {
    this.selectedColor.set(color);
  }

  // palette reçue du serveur (joinGroup) — garde selectedColor si encore valide
  setColorsFromGrid(gridColors: string[]): void {
    this.colors.set([...gridColors]);

    if (gridColors.length && !gridColors.includes(this.selectedColor())) {
      this.setSelectedColor(gridColors[0]);
    }
  }

  // palette depuis gameStarted, avant que le canvas ait rejoint le groupe
  setColorsFromTransition(myColors: string[]): void {
    if (!myColors.length) {
      return;
    }
    this.colors.set([...myColors]);
    this.setSelectedColor(myColors[0]);
  }
}
