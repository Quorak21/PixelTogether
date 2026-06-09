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
import { WaitingRoomPlayer } from '../../../types/entities';
import {
  EnterWaitingRoomPayload,
  GameStartedPayload,
  RegisterPlayerPayload,
  RegisterPlayerResponse,
  StartGamePayload,
  StartGameResponse,
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
export class WaitingRoomPageComponent {
  readonly ui = inject(UiStateService);
  private readonly socket = inject(SocketService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly onboardingModal = viewChild(OnboardingModalComponent);

  readonly roomId = signal(this.route.snapshot.paramMap.get('roomId')?.toUpperCase() ?? '');
  readonly players = signal<WaitingRoomPlayer[]>([]);
  readonly isRegistered = signal(false);
  readonly isLoading = signal(true);
  readonly pageError = signal<string | null>(null);

  readonly onboardingOpen = signal(false);
  readonly onboardingError = signal('');
  readonly inviteOpen = signal(false);
  readonly startConfirmOpen = signal(false);
  readonly startError = signal('');
  readonly isStarting = signal(false);

  readonly playerCount = computed(() => this.players().length);
  readonly canStart = computed(() => this.ui.isHost() && this.playerCount() >= 2);
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

  openStartConfirm(): void {
    if (!this.canStart()) {
      return;
    }
    this.startError.set('');
    this.startConfirmOpen.set(true);
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

  private applyState(state: WaitingRoomStatePayload): void {
    this.ui.setRole(state.role);
    this.ui.gameTheme.set(state.name);
    this.players.set(state.players);
    this.isRegistered.set(state.isRegistered);
    this.onboardingOpen.set(!state.isRegistered);
    this.syncProfileFromState(state);
  }

  private syncProfileFromState(state: WaitingRoomStatePayload): void {
    if (!state.isRegistered) {
      return;
    }

    if (state.role === 'host' && state.hostProfile) {
      this.ui.setCurrentProfile(state.hostProfile);
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

  private bindSocketListeners(): void {
    const onUpdated = (payload: WaitingRoomUpdatedPayload) => {
      this.players.set(payload.players);
    };

    const onGameStarted = (payload: GameStartedPayload) => {
      if (payload.roomId !== this.roomId()) {
        return;
      }
      this.ui.joinGame(payload.roomId);
      void this.router.navigateByUrl(`/game/${payload.roomId}`);
    };

    const onWaitingRoomError = (payload: WaitingRoomErrorPayload) => {
      if (!this.isLoading()) {
        return;
      }
      this.pageError.set(payload.error);
      this.isLoading.set(false);
      this.ui.exitWaitingRoom();
    };

    const onRoomClosed = (payload: { roomId: string }) => {
      if (payload.roomId !== this.roomId()) {
        return;
      }
      this.ui.exitWaitingRoom();
      void this.router.navigateByUrl('/');
    };

    this.socket.on<WaitingRoomUpdatedPayload>('waitingRoomUpdated', onUpdated);
    this.socket.on<GameStartedPayload>('gameStarted', onGameStarted);
    this.socket.on<WaitingRoomErrorPayload>('waitingRoomError', onWaitingRoomError);
    this.socket.on<{ roomId: string }>('roomClosed', onRoomClosed);

    this.destroyRef.onDestroy(() => {
      this.socket.off('waitingRoomUpdated', onUpdated as (...args: unknown[]) => void);
      this.socket.off('gameStarted', onGameStarted as (...args: unknown[]) => void);
      this.socket.off('waitingRoomError', onWaitingRoomError as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
    });
  }
}
