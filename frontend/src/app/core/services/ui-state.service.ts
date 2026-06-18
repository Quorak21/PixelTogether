import { computed, Injectable, signal } from '@angular/core';
import {
  GameMode,
  GroupPlayer,
  GroupTransitionPayload,
  ParticipantRole,
  PlayerProfile,
} from '../../types/entities';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../config/session-config';

/**
 * Service centralisant l'état UI et le contexte de jeu actif pour toute l'application.
 * Utilise les Signals réactifs d'Angular pour propager les changements d'état simplement et sans boilerplate.
 */
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
  
  /** Libellé calculé pour afficher l'état d'avancement des manches (ex: "Session 2/5"). */
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
  readonly gameCanvasLoading = signal(false);

  /** Indique si le salon actif est configuré en mode Coopératif. */
  readonly isCoopParty = computed(() => this.partyGameMode() === GAME_MODE_COOP);

  /** Indique si le salon actif est configuré en mode Compétitif. */
  readonly isCompetitiveParty = computed(
    () => !this.partyGameMode() || this.partyGameMode() === GAME_MODE_COMPETITIVE,
  );

  /** Libellé textuel correspondant au mode de jeu du salon. */
  readonly partyModeLabel = computed(() => {
    if (this.partyGameMode() === GAME_MODE_COOP) return 'Coopératif';
    if (this.partyGameMode() === GAME_MODE_COMPETITIVE) return 'Compétitif';
    return '';
  });

  /**
   * Ouvre la popup de création de partie avec le mode de jeu pré-sélectionné.
   * 
   * @param mode - Le mode de jeu ('coop' ou 'competitive').
   */
  openPartyCreation(mode: GameMode): void {
    this.partyCreationMode.set(mode);
    this.partyCreationOpen.set(true);
  }

  /**
   * Modifie le mode de jeu actuel du salon actif.
   * 
   * @param mode - Le mode de jeu ou null pour réinitialiser.
   */
  setPartyGameMode(mode: GameMode | null): void {
    this.partyGameMode.set(mode);
  }

  /** Signal contenant l'alerte d'absence du manager avec le compte à rebours de fermeture. */
  readonly managerAbsentWarning = signal<{ message: string; secondsLeft: number } | null>(null);

  private managerAbsentCountdownId: ReturnType<typeof setInterval> | null = null;

  readonly selectedColor = signal('#000000');
  readonly colors = signal<string[]>([]);
  readonly groupTeammates = signal<GroupPlayer[]>([]);

  /**
   * Configure l'UI pour entrer dans la salle d'attente d'une partie.
   * 
   * @param eventId - L'identifiant de la partie.
   */
  joinWaitingRoom(eventId: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(eventId);
    this.currentGroupCode.set(null);
    this.waitingMode.set(true);
    this.gameMode.set(false);
  }

  /**
   * Réinitialise le contexte du canvas et repasse l'UI en mode Salle d'attente (manche suivante).
   * 
   * @param eventId - L'identifiant de la partie.
   */
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

  /**
   * Configure l'UI pour entrer dans la manche de dessin active d'un groupe.
   * 
   * @param eventId - L'identifiant de la partie.
   * @param groupCode - Le code du groupe assigné pour la manche (optionnel en coop).
   */
  joinGame(eventId: string, groupCode?: string): void {
    this.currentEventId.set(eventId);
    this.currentRoomId.set(groupCode ? `${eventId}/${groupCode}` : eventId);
    this.currentGroupCode.set(groupCode ?? null);
    this.waitingMode.set(false);
    this.gameMode.set(true);
  }

  /** Activateur du loader visuel pendant le chargement initial du canvas de jeu. */
  beginGameCanvasLoading(): void {
    this.gameCanvasLoading.set(true);
  }

  /** Désactive le loader visuel une fois le canvas prêt à l'emploi. */
  setGameCanvasReady(): void {
    this.gameCanvasLoading.set(false);
  }

  /**
   * Enregistre les métadonnées de la transition de groupe à afficher (modal de changement d'équipe).
   */
  setGroupTransition(payload: GroupTransitionPayload | null): void {
    this.groupTransition.set(payload);
  }

  /**
   * Efface la transition de groupe.
   */
  clearGroupTransition(): void {
    this.groupTransition.set(null);
  }

  /**
   * Enregistre le timestamp de fin de la manche en cours.
   */
  setSessionEndsAt(timestamp: number | null | undefined): void {
    this.sessionEndsAt.set(timestamp ?? null);
  }

  /**
   * Réinitialise le timer de fin de session.
   */
  clearSessionEndsAt(): void {
    this.sessionEndsAt.set(null);
  }

  /**
   * Configure les informations générales sur les manches (nombre total et index courant).
   */
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

  /**
   * Réinitialise les informations de manches.
   */
  clearSessionMeta(): void {
    this.sessionCount.set(1);
    this.currentSession.set(1);
    this.partyStarted.set(false);
  }

  /** Définit le rôle de l'utilisateur (player / manager). */
  setRole(role: ParticipantRole): void {
    this.currentRole.set(role);
  }

  /** Définit le pseudo et l'avatar du joueur courant. */
  setCurrentProfile(profile: PlayerProfile): void {
    this.currentProfile.set(profile);
  }

  /** Efface le profil du joueur. */
  clearCurrentProfile(): void {
    this.currentProfile.set(null);
  }

  /** Enregistre la liste des joueurs coéquipiers du groupe. */
  setGroupTeammates(teammates: GroupPlayer[]): void {
    this.groupTeammates.set(teammates);
  }

  /** Vide la liste des coéquipiers du groupe. */
  clearGroupTeammates(): void {
    this.groupTeammates.set([]);
  }

  /**
   * Quitte la vue d'un groupe spécifique pour un spectateur ou joueur sans pour autant quitter la partie globale.
   * Réinitialise les paramètres de manche spécifiques.
   * 
   * @param eventId - L'ID de la partie.
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
    this.gameCanvasLoading.set(false);
  }

  /**
   * Affiche l'alerte temporaire signalant que le manager s'est déconnecté.
   * Lance un intervalle régulier pour décompter le temps restant en secondes.
   * 
   * @param message - Le message d'alerte à afficher.
   * @param closesInMs - Le temps restant avant fermeture en millisecondes.
   */
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

  /**
   * Supprime l'intervalle et l'alerte d'absence du manager.
   */
  clearManagerAbsentWarning(): void {
    if (this.managerAbsentCountdownId !== null) {
      clearInterval(this.managerAbsentCountdownId);
      this.managerAbsentCountdownId = null;
    }
    this.managerAbsentWarning.set(null);
  }

  /**
   * Réinitialise totalement l'état de l'UI et redirige hors de la salle d'attente.
   */
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

  /**
   * Réinitialise totalement l'état de l'UI et redirige hors de la partie active (retour accueil).
   */
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
    this.gameCanvasLoading.set(false);
  }

  /** Définit la couleur de dessin sélectionnée. */
  setSelectedColor(color: string): void {
    this.selectedColor.set(color);
  }

  /**
   * Charge la palette de couleurs depuis la grille de dessin.
   * Conserve la sélection courante si elle fait toujours partie de la nouvelle palette,
   * sinon sélectionne la première par défaut.
   * 
   * @param gridColors - Le tableau des couleurs disponibles.
   */
  setColorsFromGrid(gridColors: string[]): void {
    this.colors.set([...gridColors]);

    if (gridColors.length && !gridColors.includes(this.selectedColor())) {
      this.setSelectedColor(gridColors[0]);
    }
  }

  /**
   * Prépare la palette lors de la transition, avant que le canvas n'ait rejoint le groupe.
   * 
   * @param myColors - Les couleurs assignées.
   */
  setColorsFromTransition(myColors: string[]): void {
    if (!myColors.length) {
      return;
    }
    this.colors.set([...myColors]);
    this.setSelectedColor(myColors[0]);
  }
}
