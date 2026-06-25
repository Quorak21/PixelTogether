import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { SessionTokenService } from '../../../core/services/session-token.service';
import { ReconnectService } from '../../../core/services/reconnect.service';
import {
  GalleryGrid,
  PodiumGrid,
  PodiumPlayer,
  SessionEndedPayload,
  VoteCandidate,
  VoteStateFields,
  PlayerProfile,
  WaitingRoomPlayer,
  WrMode,
} from '../../../types/entities';
import {
  COOP_GUESTS_MIN,
  COOP_GRID_MAX,
  COMPETITIVE_PLAYERS_MIN,
  EVENT_PLAYERS_MAX,
  GAME_MODE_COOP,
  coopGridOccupancy,
} from '../../../core/config/session-config';
import {
  CastVotePayload,
  CloseVotePayload,
  EndPartyPayload,
  EndPartyResponse,
  EnterWaitingRoomPayload,
  GameStartedPayload,
  RegisterPlayerPayload,
  RegisterPlayerResponse,
  ShowResultsPayload,
  StartGamePayload,
  StartGameResponse,
  VoteStateUpdatedPayload,
  WaitingRoomErrorPayload,
  WaitingRoomStatePayload,
  WaitingRoomUpdatedPayload,
} from '../../../types/socket-payloads';
import { OnboardingModalComponent } from '../onboarding-modal/onboarding-modal';
import { InviteModalComponent } from '../invite-modal/invite-modal';
import { StartConfirmModalComponent } from '../start-confirm-modal/start-confirm-modal';
import { LucideLayers, LucideUsers } from '@lucide/angular';
import { WaitingRoomComponent } from '../waiting-room/waiting-room';
import { TransitionRoomComponent } from '../transition-room/transition-room';
import { FinalRoomComponent } from '../final-room/final-room';
import { resolveWrPhase } from '../wr-phase';
import { GridPixelSplashComponent } from '../../../shared/grid-pixel-splash/grid-pixel-splash';
import { ChatboxComponent } from '../../../shared/chatbox/chatbox';
import { fireVoteWinnerConfetti } from '../../../core/utils/confetti-burst';

@Component({
  selector: 'app-waiting-room-page',
  imports: [
    WaitingRoomComponent,
    TransitionRoomComponent,
    FinalRoomComponent,
    OnboardingModalComponent,
    InviteModalComponent,
    StartConfirmModalComponent,
    LucideUsers,
    LucideLayers,
    GridPixelSplashComponent,
    ChatboxComponent,
  ],
  templateUrl: './waiting-room-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// orchestrateur WR : sockets, état, shell — délègue aux 3 composants phase
export class WaitingRoomPageComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly reconnect = inject(ReconnectService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  /** Évite de relancer les confettis tant qu'on reste sur voteResult. */
  private previousWrMode: WrMode = 'players';

  private readonly onboardingModal = viewChild(OnboardingModalComponent);

  readonly roomId = signal(this.route.snapshot.paramMap.get('roomId')?.toUpperCase() ?? '');
  readonly partyName = signal('');
  readonly gameTheme = signal('');
  readonly sessionCount = signal(1);
  readonly currentSession = signal(1);
  readonly partyStarted = signal(false);
  readonly players = signal<WaitingRoomPlayer[]>([]);
  readonly managerProfile = signal<PlayerProfile | null>(null);
  readonly isRegistered = signal(false);
  readonly isLoading = signal(true);
  readonly pageError = signal<string | null>(null);

  readonly wrMode = signal<WrMode>('players');
  readonly voteCandidates = signal<VoteCandidate[]>([]);
  readonly myVote = signal<string | null>(null);
  readonly winnerGroupCode = signal<string | null>(null);
  readonly winnerImage = signal<string | null>(null);
  readonly isLastVote = signal(false);
  readonly topPlayers = signal<PodiumPlayer[]>([]);
  readonly topGrids = signal<PodiumGrid[]>([]);
  readonly sessionResultGrid = signal<GalleryGrid | null>(null);
  readonly galleryGrids = signal<GalleryGrid[]>([]);
  readonly enlargedImage = signal<{ url: string; title: string; players?: PlayerProfile[] } | null>(null);

  openImageEnlarge(url: string | null, title: string, players?: PlayerProfile[]): void {
    if (!url) return;
    this.enlargedImage.set({ url, title, players });
  }

  closeImageEnlarge(): void {
    this.enlargedImage.set(null);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeImageEnlarge();
    }
  }

  readonly onboardingOpen = signal(false);
  readonly onboardingError = signal('');
  readonly inviteOpen = signal(false);
  readonly startConfirmOpen = signal(false);
  readonly startError = signal('');
  readonly isStarting = signal(false);
  readonly isClosingVote = signal(false);
  readonly isShowingResults = signal(false);
  readonly isEndingParty = signal(false);
  readonly voteError = signal('');
  readonly partyError = signal('');

  readonly playerCount = computed(() => this.players().length);
  readonly isRoomFull = computed(() => this.playerCount() >= EVENT_PLAYERS_MAX);
  readonly isCoop = computed(() => this.ui.partyGameMode() === GAME_MODE_COOP);

  readonly coopGridCount = computed(() =>
    this.isCoop() ? coopGridOccupancy(this.playerCount()) : this.playerCount(),
  );

  readonly playerCountReady = computed(() => {
    if (this.isCoop()) {
      return this.playerCount() >= COOP_GUESTS_MIN;
    }
    return this.playerCount() >= COMPETITIVE_PLAYERS_MIN;
  });

  readonly managerPlayerCounter = computed(() => {
    if (this.isCoop()) {
      return `${this.coopGridCount()} / ${COOP_GRID_MAX} · min. ${COOP_GUESTS_MIN + 1} sur la grille`;
    }
    return `${this.playerCount()} joueur${this.playerCount() > 1 ? 's' : ''} · min. ${COMPETITIVE_PLAYERS_MIN}`;
  });

  readonly startConfirmTitle = computed(() =>
    this.isCoop() ? 'Démarrer la partie coopérative ?' : 'Démarrer la partie compétitive ?',
  );

  readonly startConfirmHint = computed(
    () => 'Plus personne ne pourra rejoindre une fois la partie lancée.',
  );

  readonly sessionLabel = computed(
    () => `Session ${this.currentSession()}/${this.sessionCount()}`,
  );
  readonly canStart = computed(
    () => this.ui.isManager() && (this.partyStarted() || this.playerCountReady()),
  );

  readonly roomPhase = computed(() => resolveWrPhase(this.wrMode(), this.partyStarted()));

  readonly voteWinner = computed(() => {
    const code = this.winnerGroupCode();
    if (!code) return null;
    const candidate = this.voteCandidates().find((c) => c.groupCode === code);
    if (!candidate) return null;
    return {
      groupCode: candidate.groupCode,
      label: candidate.label,
      image: candidate.image,
      voteCount: candidate.voteCount,
      players: candidate.players,
    };
  });

  readonly startButtonLabel = computed(() =>
    this.partyStarted()
      ? `Démarrer la session ${this.currentSession()}`
      : 'Démarrer',
  );

  readonly waitingTitle = computed(() => {
    switch (this.wrMode()) {
      case 'voting':
        return 'Votez pour votre dessin préféré !';
      case 'tieBreak':
        return 'Égalité — le manager tranche !';
      case 'voteResult':
        return 'Le gagnant de la session !';
      case 'sessionResult':
        return 'Le dessin de la session';
      case 'gallery':
        return 'Galerie des dessins';
      case 'podium':
        return 'Classement final';
      default:
        return this.partyStarted()
          ? 'En attente de la session suivante…'
          : 'En attente du début de la partie…';
    }
  });
  readonly partySubtitle = computed(() => {
    if (this.wrMode() !== 'players' || this.partyStarted()) {
      return '';
    }
    const pseudo = this.managerProfile()?.pseudo;
    if (pseudo) {
      return `${pseudo} vous a préparé un super thème !`;
    }
    return 'Votre manager vous a préparé un super thème !';
  });
  readonly waitingSubtitle = computed(() => {
    if (this.wrMode() === 'voting' || this.wrMode() === 'tieBreak') {
      return '';
    }
    if (this.wrMode() === 'gallery') {
      return 'Retrouvez toutes les créations de la partie.';
    }
    return '';
  });
  readonly showWaitingStatusBar = computed(() => {
    const mode = this.wrMode();
    return mode !== 'sessionResult' && mode !== 'gallery' && mode !== 'voteResult' && mode !== 'podium';
  });
  readonly roomUrl = computed(() => `${window.location.origin}/room/${this.roomId()}`);
  readonly showOnboarding = computed(() => this.onboardingOpen() && !this.isRegistered());

  constructor() {
    const id = this.roomId();
    this.ui.joinWaitingRoom(id);
    void this.enterRoom(id);
    this.bindSocketListeners();

    this.reconnect.setWaitingRoomResyncHandler((state) => {
      this.reconnect.saveFromWaitingRoom(state);
      this.applyState(state);
    });
    this.destroyRef.onDestroy(() => {
      this.reconnect.setWaitingRoomResyncHandler(null);
    });

    effect(() => {
      const mode = this.wrMode();
      if (mode === 'voteResult' && this.previousWrMode !== 'voteResult') {
        fireVoteWinnerConfetti();
      }
      this.previousWrMode = mode;
    });
  }

  openInvite(): void {
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
  }

  handleStartClick(): void {
    if (!this.canStart() || this.isStarting()) {
      return;
    }
    this.startError.set('');
    if (this.partyStarted()) {
      void this.confirmStart();
      return;
    }
    this.startConfirmOpen.set(true);
  }

  async handleCloseVote(): Promise<void> {
    if (this.isClosingVote()) {
      return;
    }

    this.isClosingVote.set(true);
    this.voteError.set('');

    let response: VoteStateUpdatedPayload;
    try {
      response = await this.socket.emitWithAck<CloseVotePayload, VoteStateUpdatedPayload>(
        'closeVote',
        { roomId: this.roomId() },
      );
    } catch {
      this.isClosingVote.set(false);
      this.voteError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    this.isClosingVote.set(false);

    if (response.error) {
      this.voteError.set(response.error);
      return;
    }

    this.applyVoteState(response);
  }

  async handleShowResults(): Promise<void> {
    if (this.isShowingResults()) {
      return;
    }

    this.isShowingResults.set(true);
    this.partyError.set('');

    let response: VoteStateUpdatedPayload;
    try {
      response = await this.socket.emitWithAck<ShowResultsPayload, VoteStateUpdatedPayload>(
        'showResults',
        { roomId: this.roomId() },
      );
    } catch {
      this.isShowingResults.set(false);
      this.partyError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    this.isShowingResults.set(false);

    if (response.error) {
      this.partyError.set(response.error);
      return;
    }

    this.applyVoteState(response);
  }

  async handleEndParty(): Promise<void> {
    if (this.isEndingParty()) {
      return;
    }

    this.isEndingParty.set(true);
    this.partyError.set('');

    let response: EndPartyResponse;
    try {
      response = await this.socket.emitWithAck<EndPartyPayload, EndPartyResponse>(
        'endParty',
        { roomId: this.roomId() },
      );
    } catch {
      this.isEndingParty.set(false);
      this.partyError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    this.isEndingParty.set(false);

    if (response.error) {
      this.partyError.set(response.error);
    }
  }

  async handleVote(groupCode: string): Promise<void> {
    const mode = this.wrMode();
    if (mode !== 'voting' && mode !== 'tieBreak') {
      return;
    }

    this.voteError.set('');

    let response: VoteStateUpdatedPayload;
    try {
      response = await this.socket.emitWithAck<CastVotePayload, VoteStateUpdatedPayload>(
        'castVote',
        { roomId: this.roomId(), groupCode },
      );
    } catch {
      this.voteError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    if (response.error) {
      this.voteError.set(response.error);
      return;
    }

    this.applyVoteState(response);
  }

  closeStartConfirm(): void {
    if (!this.isStarting()) {
      this.startConfirmOpen.set(false);
      this.startError.set('');
    }
  }

  goHome(): void {
    this.ui.exitWaitingRoom();
    void this.router.navigateByUrl('/');
  }

  async handleRegister(profile: { pseudo: string; avatarColor: string }): Promise<void> {
    this.onboardingError.set('');

    let response: RegisterPlayerResponse;
    try {
      response = await this.socket.emitWithAck<RegisterPlayerPayload, RegisterPlayerResponse>(
        'registerPlayer',
        {
          roomId: this.roomId(),
          pseudo: profile.pseudo,
          avatarColor: profile.avatarColor,
        },
      );
    } catch {
      this.onboardingError.set('Une erreur est survenue. Veuillez réessayer.');
      this.onboardingModal()?.resetSubmitting();
      return;
    }

    this.onboardingModal()?.resetSubmitting();

    if (response.error) {
      this.onboardingError.set(response.error);
      return;
    }

    this.applyState(response);
    this.ui.setCurrentProfile({
      pseudo: profile.pseudo,
      avatarColor: profile.avatarColor,
    });
    this.onboardingOpen.set(false);
  }

  async confirmStart(): Promise<void> {
    if (this.isStarting()) {
      return;
    }

    this.isStarting.set(true);
    this.startError.set('');

    let response: StartGameResponse;
    try {
      response = await this.socket.emitWithAck<StartGamePayload, StartGameResponse>('startGame', {
        roomId: this.roomId(),
      });
    } catch {
      this.isStarting.set(false);
      this.startError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    if (response.error) {
      this.startError.set(response.error);
      this.isStarting.set(false);
      return;
    }

    this.startConfirmOpen.set(false);
    this.isStarting.set(false);
  }

  // 1er appel socket à l'arrivée sur /room/:id — reconnexion ou enterWaitingRoom
  private async enterRoom(roomId: string): Promise<void> {
    const session = this.sessionToken.read();

    if (session?.token) {
      const reconnected = await this.reconnect.reconnect();
      if (reconnected) {
        if (reconnected.phase === 'game' && reconnected.groupCode) {
          await this.reconnect.resumeAndNavigate(reconnected);
          return;
        }
        if (reconnected.phase === 'lobby') {
          await this.reconnect.resumeAndNavigate(reconnected);
          return;
        }
        if (reconnected.waitingRoomState) {
          this.applyState(reconnected.waitingRoomState);
          this.isLoading.set(false);
          return;
        }
      }
    }

    let response: WaitingRoomStatePayload;
    try {
      response = await this.socket.emitWithAck<EnterWaitingRoomPayload, WaitingRoomStatePayload>(
        'enterWaitingRoom',
        { roomId, token: session?.token },
      );
    } catch {
      this.isLoading.set(false);
      this.ui.exitWaitingRoom();
      this.pageError.set('Une erreur est survenue. Veuillez réessayer.');
      void this.router.navigateByUrl('/');
      return;
    }

    this.isLoading.set(false);

    if (response.error) {
      this.pageError.set(response.error);
      this.ui.exitWaitingRoom();
      this.sessionToken.clear();
      return;
    }

    this.reconnect.saveFromWaitingRoom(response);
    this.applyState(response);
  }

  // sync locale + UiStateService depuis n'importe quel ack WR
  private applyState(state: WaitingRoomStatePayload): void {
    this.ui.setRole(state.role);
    this.partyName.set(state.partyName);
    this.gameTheme.set(state.theme ?? state.name);
    this.sessionCount.set(state.sessionCount);
    this.currentSession.set(state.currentSession);
    this.partyStarted.set(Boolean(state.partyStarted));
    this.ui.partyName.set(state.partyName);
    this.ui.gameTheme.set(state.theme ?? state.name);
    this.ui.setSessionMeta(state.sessionCount, state.currentSession, Boolean(state.partyStarted));
    this.ui.setPartyGameMode(state.gameMode);
    this.players.set(state.players);
    this.managerProfile.set(state.managerProfile);
    this.isRegistered.set(state.isRegistered);
    this.onboardingOpen.set(!state.isRegistered);
    this.applyVoteState(state);
    this.syncProfileFromState(state);
  }

  // merge partiel — voteStateUpdated n'envoie pas toujours tous les champs
  private applyVoteState(state: Partial<VoteStateFields>): void {
    if (state.wrMode) {
      this.wrMode.set(state.wrMode);
    }
    if (state.voteCandidates) {
      this.voteCandidates.set(state.voteCandidates);
    }
    if (state.myVote !== undefined) {
      this.myVote.set(state.myVote);
    }
    if (state.winnerGroupCode !== undefined) {
      this.winnerGroupCode.set(state.winnerGroupCode);
    }
    if (state.winnerImage !== undefined) {
      this.winnerImage.set(state.winnerImage);
    }
    if (state.isLastVote !== undefined) {
      this.isLastVote.set(state.isLastVote);
    }
    if (state.topPlayers) {
      this.topPlayers.set(state.topPlayers);
    }
    if (state.topGrids) {
      this.topGrids.set(state.topGrids);
    }
    if (state.sessionResultGrid !== undefined) {
      this.sessionResultGrid.set(state.sessionResultGrid);
    }
    if (state.galleryGrids) {
      this.galleryGrids.set(state.galleryGrids);
    }
  }

  private syncProfileFromState(state: WaitingRoomStatePayload): void {
    if (!state.isRegistered) {
      return;
    }

    if (state.role === 'manager' && state.managerProfile) {
      this.ui.setCurrentProfile(state.managerProfile);
      return;
    }

    const playerId = state.playerId ?? this.sessionToken.read()?.playerId;
    const me = state.players.find(
      (player) => player.playerId === playerId || player.socketId === this.socket.id(),
    );
    if (me) {
      this.ui.setCurrentProfile({
        pseudo: me.pseudo,
        avatarColor: me.avatarColor,
      });
    }
  }

  // listeners push — à détacher dans onDestroy (pattern DestroyRef)
  private bindSocketListeners(): void {
    const onUpdated = (payload: WaitingRoomUpdatedPayload) => {
      this.players.set(payload.players);
    };

    const onGameStarted = (payload: GameStartedPayload) => { // push serveur post-startGame, pas l'ack de startGame
      if (payload.eventId !== this.roomId()) {
        return;
      }

      this.ui.setGroupTransition(payload);
      this.ui.partyName.set(payload.partyName);
      this.ui.gameTheme.set(payload.theme);
      this.ui.setSessionMeta(payload.sessionCount, payload.currentSession, true);
      this.ui.setSessionEndsAt(payload.sessionEndsAt);
      if (payload.gameMode) {
        this.ui.setPartyGameMode(payload.gameMode);
      }

      const isCoopManager =
        payload.role === 'manager' && payload.gameMode === GAME_MODE_COOP;

      if (isCoopManager) {
        const groupCode =
          ('groupCode' in payload && payload.groupCode) ||
          ('groups' in payload ? payload.groups?.[0]?.groupCode : undefined);

        if (!groupCode) {
          return;
        }

        this.ui.setRole('manager');

        if ('myColors' in payload && payload.myColors?.length) {
          this.ui.setColorsFromTransition(payload.myColors);
          this.ui.setGroupTeammates(payload.teammates ?? []);
          const playerId = this.sessionToken.read()?.playerId;
          const me = payload.teammates?.find((mate) => mate.playerId === playerId);
          if (me) {
            this.ui.setCurrentProfile({ pseudo: me.pseudo, avatarColor: me.avatarColor });
          }
        } else if ('groups' in payload && payload.groups?.[0]) {
          this.ui.groupLabel.set(payload.groups[0].groupLabel);
        }

        this.sessionToken.updateGroupCode(groupCode);
        this.ui.beginGameCanvasLoading();
        this.ui.joinGame(payload.eventId, groupCode);
        void this.router.navigateByUrl(`/game/${payload.eventId}/${groupCode}`);
        return;
      }

      if (payload.role === 'player') {
        this.ui.groupLabel.set(payload.groupLabel);
        this.ui.setGroupTeammates(payload.teammates ?? []);
        const playerId = this.sessionToken.read()?.playerId;
        const me = payload.teammates?.find(
          (mate) => mate.playerId === playerId || mate.socketId === this.socket.id(),
        );
        if (me) {
          this.ui.setCurrentProfile({ pseudo: me.pseudo, avatarColor: me.avatarColor });
        }
      }

      if (payload.role === 'manager' && payload.gameMode !== GAME_MODE_COOP) {
        const { eventId, partyName, theme, sessionEndsAt } = payload;
        this.ui.setRole('manager');
        this.ui.currentEventId.set(eventId);
        this.ui.partyName.set(partyName);
        this.ui.gameTheme.set(theme);
        this.ui.setSessionEndsAt(sessionEndsAt);
        this.ui.waitingMode.set(false);
        void this.router.navigateByUrl(`/lobby/${eventId}`);
        return;
      }

      if ('groupCode' in payload && payload.groupCode && 'myColors' in payload) {
        this.ui.setRole(payload.role === 'manager' ? 'manager' : 'player');
        this.ui.setColorsFromTransition(payload.myColors);
        this.sessionToken.updateGroupCode(payload.groupCode);
        this.ui.beginGameCanvasLoading();
        this.ui.joinGame(payload.eventId, payload.groupCode);
        void this.router.navigateByUrl(`/game/${payload.eventId}/${payload.groupCode}`);
      }
    };

    const onSessionEnded = (payload: SessionEndedPayload) => { // retour WR + wrMode voting
      if (payload.eventId !== this.roomId()) {
        return;
      }
      this.partyName.set(payload.partyName);
      this.gameTheme.set(payload.theme);
      this.sessionCount.set(payload.sessionCount);
      this.currentSession.set(payload.currentSession);
      this.partyStarted.set(Boolean(payload.partyStarted ?? true));
      this.players.set(
        payload.players.map((p) => ({ ...p, role: 'player' as const })),
      );
      this.isLoading.set(false);
      this.pageError.set(null);
      this.onboardingOpen.set(false);
      this.ui.clearSessionEndsAt();
      this.ui.joinWaitingRoom(payload.eventId);
      this.ui.partyName.set(payload.partyName);
      this.ui.gameTheme.set(payload.theme);
      this.ui.setSessionMeta(
        payload.sessionCount,
        payload.currentSession,
        payload.partyStarted ?? true,
      );
      if (payload.gameMode) {
        this.ui.setPartyGameMode(payload.gameMode);
      }
      const sessionRole = this.sessionToken.read()?.role;
      if (sessionRole) {
        this.ui.setRole(sessionRole);
      }
      this.applyVoteState(payload);
    };

    const onVoteStateUpdated = (payload: VoteStateUpdatedPayload) => {
      if (payload.eventId !== this.roomId()) {
        return;
      }
      this.applyVoteState(payload);
    };

    const onWaitingRoomError = (payload: WaitingRoomErrorPayload) => {
      if (!this.isLoading()) {
        return;
      }
      this.pageError.set(payload.error);
      this.isLoading.set(false);
      this.ui.exitWaitingRoom();
    };

    this.socket.on<WaitingRoomUpdatedPayload>('waitingRoomUpdated', onUpdated);
    this.socket.on<GameStartedPayload>('gameStarted', onGameStarted);
    this.socket.on<SessionEndedPayload>('sessionEnded', onSessionEnded);
    this.socket.on<VoteStateUpdatedPayload>('voteStateUpdated', onVoteStateUpdated);
    this.socket.on<WaitingRoomErrorPayload>('waitingRoomError', onWaitingRoomError);

    this.destroyRef.onDestroy(() => {
      this.socket.off('waitingRoomUpdated', onUpdated as (...args: unknown[]) => void);
      this.socket.off('gameStarted', onGameStarted as (...args: unknown[]) => void);
      this.socket.off('sessionEnded', onSessionEnded as (...args: unknown[]) => void);
      this.socket.off('voteStateUpdated', onVoteStateUpdated as (...args: unknown[]) => void);
      this.socket.off('waitingRoomError', onWaitingRoomError as (...args: unknown[]) => void);
    });
  }
}
