import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import {
  PodiumGrid,
  PodiumPlayer,
  SessionEndedPayload,
  VoteCandidate,
  VoteStateFields,
  WaitingRoomPlayer,
  WrMode,
} from '../../../types/entities';
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
import { PlayerCardComponent } from '../player-card/player-card';

@Component({
  selector: 'app-waiting-room-page',
  imports: [
    OnboardingModalComponent,
    InviteModalComponent,
    StartConfirmModalComponent,
    PlayerCardComponent,
  ],
  templateUrl: './waiting-room-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// orchestrateur WR : inscription, start, vote, podium — gros morceau du flow
export class WaitingRoomPageComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly onboardingModal = viewChild(OnboardingModalComponent);

  readonly roomId = signal(this.route.snapshot.paramMap.get('roomId')?.toUpperCase() ?? '');
  readonly partyName = signal('');
  readonly gameTheme = signal('');
  readonly sessionCount = signal(1);
  readonly currentSession = signal(1);
  readonly partyStarted = signal(false);
  readonly players = signal<WaitingRoomPlayer[]>([]);
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
  readonly sessionLabel = computed(
    () => `Session ${this.currentSession()}/${this.sessionCount()}`,
  );
  readonly canStart = computed(
    () => this.ui.isManager() && (this.partyStarted() || this.playerCount() >= 2),
  );
  readonly winnerCandidate = computed(() => {
    const code = this.winnerGroupCode();
    if (!code) return null;
    return this.voteCandidates().find((c) => c.groupCode === code) ?? null;
  });
  readonly managerShowsCloseVote = computed(
    () => this.ui.isManager() && this.wrMode() === 'voting',
  );
  readonly managerShowsStart = computed( // session suivante dispo après closeVote
    () => this.ui.isManager() && this.wrMode() === 'voteResult' && !this.isLastVote(),
  );
  readonly managerShowsResults = computed(
    () => this.ui.isManager() && this.wrMode() === 'voteResult' && this.isLastVote(),
  );
  readonly managerShowsEndParty = computed(
    () => this.ui.isManager() && this.wrMode() === 'podium',
  );
  readonly managerShowsInitialStart = computed(
    () => this.ui.isManager() && this.wrMode() === 'players',
  );
  readonly startButtonLabel = computed(() =>
    this.partyStarted()
      ? `Démarrer la session ${this.currentSession()}`
      : 'Démarrer',
  );
  readonly waitingTitle = computed(() => {
    switch (this.wrMode()) {
      case 'voting':
        return 'Votez pour votre œuvre préférée !';
      case 'voteResult':
        return "L'œuvre gagnante";
      case 'podium':
        return 'Classement final';
      default:
        return this.partyStarted()
          ? 'En attente de la session suivante…'
          : 'En attente du début de la partie…';
    }
  });
  readonly waitingSubtitle = computed(() => {
    if (this.wrMode() === 'players') {
      return `${this.playerCount()} joueur${this.playerCount() > 1 ? 's' : ''} déjà prêt${this.playerCount() > 1 ? 's' : ''} !`;
    }
    if (this.wrMode() === 'voting') {
      return 'Cliquez sur une œuvre pour voter — vous pouvez changer votre choix.';
    }
    return '';
  });
  readonly roomUrl = computed(() => `${window.location.origin}/room/${this.roomId()}`);
  readonly showOnboarding = computed(() => this.onboardingOpen() && !this.isRegistered());

  constructor() {
    const id = this.roomId();
    if (!id) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.ui.joinWaitingRoom(id);
    void this.enterRoom(id);
    this.bindSocketListeners();
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

    const response = await this.socket.emitWithAck<CloseVotePayload, VoteStateUpdatedPayload>(
      'closeVote',
      { roomId: this.roomId() },
    );

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

    const response = await this.socket.emitWithAck<ShowResultsPayload, VoteStateUpdatedPayload>(
      'showResults',
      { roomId: this.roomId() },
    );

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

    const response = await this.socket.emitWithAck<EndPartyPayload, EndPartyResponse>(
      'endParty',
      { roomId: this.roomId() },
    );

    this.isEndingParty.set(false);

    if (response.error) {
      this.partyError.set(response.error);
    }
  }

  async handleVote(groupCode: string): Promise<void> {
    if (this.wrMode() !== 'voting') {
      return;
    }

    this.voteError.set('');

    const response = await this.socket.emitWithAck<CastVotePayload, VoteStateUpdatedPayload>(
      'castVote',
      { roomId: this.roomId(), groupCode },
    );

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

    const response = await this.socket.emitWithAck<RegisterPlayerPayload, RegisterPlayerResponse>(
      'registerPlayer',
      {
        roomId: this.roomId(),
        pseudo: profile.pseudo,
        avatarColor: profile.avatarColor,
      },
    );

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

    const response = await this.socket.emitWithAck<StartGamePayload, StartGameResponse>('startGame', {
      roomId: this.roomId(),
    });

    if (response.error) {
      this.startError.set(response.error);
      this.isStarting.set(false);
      return;
    }

    this.startConfirmOpen.set(false);
    this.isStarting.set(false);
  }

  // 1er appel socket à l'arrivée sur /room/:id — le join modal ne fait que naviguer
  private async enterRoom(roomId: string): Promise<void> {
    const response = await this.socket.emitWithAck<EnterWaitingRoomPayload, WaitingRoomStatePayload>(
      'enterWaitingRoom',
      { roomId },
    );

    this.isLoading.set(false);

    if (response.error) {
      this.pageError.set(response.error);
      this.ui.exitWaitingRoom();
      return;
    }

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
    this.players.set(state.players);
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
  }

  private syncProfileFromState(state: WaitingRoomStatePayload): void {
    if (!state.isRegistered) {
      return;
    }

    if (state.role === 'manager' && state.managerProfile) {
      this.ui.setCurrentProfile(state.managerProfile);
      return;
    }

    const socketId = this.socket.id();
    const me = state.players.find((player) => player.socketId === socketId);
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
      if (payload.role === 'player') {
        this.ui.groupLabel.set(payload.groupLabel);
      }

      if (payload.role === 'manager') {
        const { eventId, partyName, theme, sessionEndsAt } = payload;
        this.ui.setRole('manager');
        this.ui.exitWaitingRoom(); // manager ne reste pas en WR pendant le jeu
        this.ui.currentEventId.set(eventId);
        this.ui.partyName.set(partyName);
        this.ui.gameTheme.set(theme);
        this.ui.setSessionEndsAt(sessionEndsAt);
        void this.router.navigateByUrl(`/lobby/${eventId}`);
        return;
      }

      this.ui.setRole('player');
      this.ui.setColorsFromTransition(payload.myColors);
      this.ui.joinGame(payload.eventId, payload.groupCode);
      void this.router.navigateByUrl(`/game/${payload.eventId}/${payload.groupCode}`);
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
      this.applyVoteState(payload);
      if (this.ui.isManager()) {
        this.ui.setRole('manager');
      }
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

    const onRoomClosed = (payload: { roomId?: string; eventId?: string }) => {
      const closedId = payload.eventId ?? payload.roomId;
      if (closedId !== this.roomId()) {
        return;
      }
      this.ui.exitWaitingRoom();
      void this.router.navigateByUrl('/');
    };

    this.socket.on<WaitingRoomUpdatedPayload>('waitingRoomUpdated', onUpdated);
    this.socket.on<GameStartedPayload>('gameStarted', onGameStarted);
    this.socket.on<SessionEndedPayload>('sessionEnded', onSessionEnded);
    this.socket.on<VoteStateUpdatedPayload>('voteStateUpdated', onVoteStateUpdated);
    this.socket.on<WaitingRoomErrorPayload>('waitingRoomError', onWaitingRoomError);
    this.socket.on<{ roomId: string }>('roomClosed', onRoomClosed);

    this.destroyRef.onDestroy(() => {
      this.socket.off('waitingRoomUpdated', onUpdated as (...args: unknown[]) => void);
      this.socket.off('gameStarted', onGameStarted as (...args: unknown[]) => void);
      this.socket.off('sessionEnded', onSessionEnded as (...args: unknown[]) => void);
      this.socket.off('voteStateUpdated', onVoteStateUpdated as (...args: unknown[]) => void);
      this.socket.off('waitingRoomError', onWaitingRoomError as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
    });
  }
}
