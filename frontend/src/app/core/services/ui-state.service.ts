import { computed, Injectable, signal } from '@angular/core';
import {
  GameMode,
  GroupPlayer,
  GroupTransitionPayload,
  ParticipantRole,
  PlayerProfile,
} from '../../types/entities';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../config/session-config';

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
  readonly partyCreationMode = signal<GameMode>(GAME_MODE_COMPETITIVE);
  readonly partyGameMode = signal<GameMode | null>(null);
  readonly joinRoomOpen = signal(false);
  readonly joinRoomError = signal<string | null>(null);

  readonly isCoopParty = computed(() => this.partyGameMode() === GAME_MODE_COOP);
  readonly isCompetitiveParty = computed(
    () => !this.partyGameMode() || this.partyGameMode() === GAME_MODE_COMPETITIVE,
  );

  readonly partyModeLabel = computed(() => {
    if (this.partyGameMode() === GAME_MODE_COOP) return 'Coopératif';
    if (this.partyGameMode() === GAME_MODE_COMPETITIVE) return 'Compétitif';
    return '';
  });

  openPartyCreation(mode: GameMode): void {
    this.partyCreationMode.set(mode);
    this.partyCreationOpen.set(true);
  }

  setPartyGameMode(mode: GameMode | null): void {
    this.partyGameMode.set(mode);
  }

  /** Popup globale : manager absent, fermeture imminente. */
  readonly managerAbsentWarning = signal<{ message: string; secondsLeft: number } | null>(null);

  private managerAbsentCountdownId: ReturnType<typeof setInterval> | null = null;

  readonly selectedColor = signal('#000000');
  readonly colors = signal<string[]>([]);
  readonly groupTeammates = signal<GroupPlayer[]>([]);

  // bascule en mode WR, reset le groupCode
  joinWaitingRoom(eventId: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(eventId);
    this.currentGroupCode.set(null);
    this.waitingMode.set(true);
    this.gameMode.set(false);
  }

  /** Fin de session : retour WR sans effacer mode de partie ni rôle manager. */
  leaveCanvasForWaitingRoom(eventId: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(eventId);
    this.currentGroupCode.set(null);
    this.waitingMode.set(true);
    this.gameMode.set(false);
    this.groupLabel.set('');
    this.clearGroupTeammates();
    this.colors.set([]);
    this.selectedColor.set('#000000');
    this.clearGroupTransition();
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

  setGroupTeammates(teammates: GroupPlayer[]): void {
    this.groupTeammates.set(teammates);
  }

  clearGroupTeammates(): void {
    this.groupTeammates.set([]);
  }

  /**
   * Quitte la vue d'un groupe (spectateur / joueur) sans quitter la partie.
   * Efface uniquement les pseudos coéquipiers et le contexte canvas.
   */
  leaveGroupView(eventId: string): void {
    this.gameMode.set(false);
    this.currentEventId.set(eventId);
    this.currentRoomId.set(eventId);
    this.currentGroupCode.set(null);
    this.groupLabel.set('');
    this.clearGroupTeammates();
    this.colors.set([]);
    this.selectedColor.set('#000000');
  }

  showManagerAbsentWarning(message: string, closesInMs: number): void {
    this.clearManagerAbsentWarning();
    const secondsLeft = Math.max(1, Math.ceil(closesInMs / 1000));
    this.managerAbsentWarning.set({ message, secondsLeft });

    this.managerAbsentCountdownId = setInterval(() => {
      const current = this.managerAbsentWarning();
      if (!current) return;
      if (current.secondsLeft <= 1) {
        this.clearManagerAbsentWarning();
        return;
      }
      this.managerAbsentWarning.set({ ...current, secondsLeft: current.secondsLeft - 1 });
    }, 1000);
  }

  clearManagerAbsentWarning(): void {
    if (this.managerAbsentCountdownId !== null) {
      clearInterval(this.managerAbsentCountdownId);
      this.managerAbsentCountdownId = null;
    }
    this.managerAbsentWarning.set(null);
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
    this.setPartyGameMode(null);
    this.clearGroupTransition();
    this.clearSessionEndsAt();
    this.clearSessionMeta();
    this.clearCurrentProfile();
    this.clearGroupTeammates();
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
    this.setPartyGameMode(null);
    this.clearGroupTransition();
    this.clearSessionEndsAt();
    this.clearSessionMeta();
    this.clearCurrentProfile();
    this.colors.set([]);
    this.selectedColor.set('#000000');
    this.clearGroupTeammates();
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
