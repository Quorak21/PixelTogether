import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { SessionTokenService } from '../../core/services/session-token.service';
import {
  EndSessionPayload,
  EndSessionResponse,
  LeavePartyPayload,
  LeavePartyResponse,
  LeaveWaitingRoomResponse,
  PlayerTypingPayload,
} from '../../types/socket-payloads';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder';
import { SessionTimerBadgeComponent } from '../session-timer-badge/session-timer-badge';

type PartyConfirmAction = 'leave' | 'close';

@Component({
  selector: 'app-navbar',
  imports: [AvatarPlaceholderComponent, SessionTimerBadgeComponent],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class NavbarComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef);

  constructor() {
    const onPlayerTyping = (data: PlayerTypingPayload) => {
      if (!this.ui.gameMode()) {
        return;
      }
      this.ui.setTeammateTyping(data.socketId, data.active);
    };

    this.destroyRef.onDestroy(
      this.socket.on<PlayerTypingPayload>('playerTyping', onPlayerTyping),
    );
  }

  readonly otherTeammates = computed(() => {
    if (!this.ui.gameMode() || this.ui.isCoopParty()) {
      return [];
    }
    const myPlayerId = this.sessionToken.read()?.playerId;
    const myId = this.socket.id();
    const teammates = this.ui.groupTeammates();
    return teammates.filter(
      (mate) => mate.playerId !== myPlayerId && mate.socketId !== myId,
    );
  });

  readonly showCoopEndSession = computed(
    () =>
      this.ui.gameMode() &&
      this.ui.isCoopParty() &&
      (this.ui.isManager() || this.ui.coopManagerAbsent()),
  );

  readonly isGroupingPhase = computed(
    () => this.ui.waitingMode() && !this.ui.partyStarted(),
  );

  readonly showProfileMenu = computed(
    () =>
      Boolean(
        (this.ui.waitingMode() || this.ui.gameMode() || this.ui.currentEventId()) &&
          this.ui.currentProfile(),
      ),
  );

  readonly endSessionConfirmTitle = computed(() => {
    if (this.ui.currentSession() >= this.ui.sessionCount()) {
      return 'Terminer la session actuelle ?';
    }
    return 'Terminer la session actuelle et passer à la suivante ?';
  });

  readonly partyConfirmTitle = computed(() =>
    this.partyConfirmAction() === 'close' ? 'Fermer la partie ?' : 'Quitter la partie ?',
  );

  readonly partyConfirmBody = computed(() =>
    this.partyConfirmAction() === 'close'
      ? 'La partie sera fermée pour tous les participants. Cette action est irréversible.'
      : 'Vous quitterez définitivement la partie. Vous ne pourrez pas revenir.',
  );

  readonly endSessionConfirmOpen = signal(false);
  readonly isEndingSession = signal(false);
  readonly endSessionError = signal('');

  readonly profileMenuOpen = signal(false);
  readonly partyConfirmOpen = signal(false);
  readonly partyConfirmAction = signal<PartyConfirmAction>('leave');
  readonly isPartyActionPending = signal(false);
  readonly partyActionError = signal('');

  onDocumentClick(event: MouseEvent): void {
    if (!this.profileMenuOpen()) {
      return;
    }
    const target = event.target as Node | null;
    const menu = this.host.nativeElement.querySelector('[data-profile-menu]');
    if (target && menu?.contains(target)) {
      return;
    }
    this.profileMenuOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  handleLogoClick(): void {
    const eventId = this.resolveEventId();

    if (!eventId) {
      void this.router.navigateByUrl('/');
      return;
    }

    if (this.ui.gameMode()) {
      if (
        this.ui.isCompetitiveParty() &&
        (this.ui.isManager() || this.ui.isSpectator())
      ) {
        this.socket.emit('exitGame', {
          eventId,
          groupCode: this.ui.currentGroupCode(),
          roomId: eventId,
        });
        this.ui.leaveGroupView(eventId);
        void this.router.navigateByUrl(`/lobby/${eventId}`);
        return;
      }

      if (!this.ui.isManager()) {
        this.openPartyConfirm('leave');
        return;
      }

      return;
    }

    if (this.ui.waitingMode()) {
      if (this.isGroupingPhase() && !this.ui.isManager()) {
        void this.executeSoftLeave(eventId);
        return;
      }

      if (this.isGroupingPhase() && this.ui.isManager()) {
        this.leaveWaitingRoomView();
        return;
      }

      if (!this.ui.isManager()) {
        this.openPartyConfirm('leave');
      }
      return;
    }

    if (this.ui.currentEventId() && !this.ui.isManager()) {
      this.openPartyConfirm('leave');
      return;
    }
  }

  onProfileQuitClick(): void {
    this.closeProfileMenu();
    const eventId = this.resolveEventId();
    if (!eventId || this.ui.isManager()) {
      return;
    }

    if (this.isGroupingPhase()) {
      void this.executeSoftLeave(eventId);
      return;
    }

    this.openPartyConfirm('leave');
  }

  onProfileCloseClick(): void {
    this.closeProfileMenu();
    this.openPartyConfirm('close');
  }

  openPartyConfirm(action: PartyConfirmAction): void {
    this.partyActionError.set('');
    this.partyConfirmAction.set(action);
    this.partyConfirmOpen.set(true);
  }

  closePartyConfirm(): void {
    this.partyConfirmOpen.set(false);
    this.partyActionError.set('');
  }

  async confirmPartyAction(): Promise<void> {
    const eventId = this.resolveEventId();
    if (!eventId || this.isPartyActionPending()) {
      return;
    }

    this.isPartyActionPending.set(true);
    this.partyActionError.set('');

    try {
      if (this.partyConfirmAction() === 'close') {
        this.socket.emit('closeRoom', { eventId, roomId: eventId });
        this.sessionToken.clear();
        this.ui.exitWaitingRoom();
        this.ui.exitGame();
        void this.router.navigateByUrl('/');
      } else {
        const response = await this.socket.emitWithAck<LeavePartyPayload, LeavePartyResponse>(
          'leaveParty',
          { eventId, roomId: eventId },
        );

        if (response.error) {
          this.partyActionError.set(response.error);
          this.isPartyActionPending.set(false);
          return;
        }

        this.sessionToken.clear();
        this.ui.exitWaitingRoom();
        this.ui.exitGame();
        void this.router.navigateByUrl('/');
      }
    } catch {
      this.partyActionError.set('Une erreur est survenue. Veuillez réessayer.');
      this.isPartyActionPending.set(false);
      return;
    }

    this.closePartyConfirm();
    this.isPartyActionPending.set(false);
  }

  private leaveWaitingRoomView(): void {
    this.ui.exitWaitingRoom();
    void this.router.navigateByUrl('/');
  }

  private async executeSoftLeave(eventId: string): Promise<void> {
    try {
      const response = await this.socket.emitWithAck<
        { eventId: string; roomId: string },
        LeaveWaitingRoomResponse
      >('leaveWaitingRoom', { eventId, roomId: eventId });

      if (response.error) {
        return;
      }
    } catch {
      return;
    }

    this.sessionToken.clearEventBinding();
    this.leaveWaitingRoomView();
  }

  /** eventId stable même si currentRoomId vaut « EVENT/GROUP ». */
  private resolveEventId(): string | null {
    const direct = this.ui.currentEventId();
    if (direct) {
      return direct;
    }
    const roomId = this.ui.currentRoomId();
    if (!roomId) {
      return null;
    }
    return roomId.includes('/') ? roomId.split('/')[0] : roomId;
  }

  openEndSessionConfirm(): void {
    this.endSessionError.set('');
    this.endSessionConfirmOpen.set(true);
  }

  closeEndSessionConfirm(): void {
    this.endSessionConfirmOpen.set(false);
    this.endSessionError.set('');
  }

  async confirmEndSession(): Promise<void> {
    const eventId = this.resolveEventId();
    if (!eventId || this.isEndingSession()) return;

    this.isEndingSession.set(true);
    this.endSessionError.set('');

    try {
      const response = await this.socket.emitWithAck<EndSessionPayload, EndSessionResponse>('endSession', {
        eventId,
      });

      if (response.error) {
        this.endSessionError.set(response.error);
        this.isEndingSession.set(false);
        return;
      }
    } catch {
      this.isEndingSession.set(false);
      this.endSessionError.set('Une erreur est survenue. Veuillez réessayer.');
      return;
    }

    this.endSessionConfirmOpen.set(false);
    this.isEndingSession.set(false);
  }
}
