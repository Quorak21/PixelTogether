import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { SessionTokenService } from '../../core/services/session-token.service';
import { EndSessionPayload, EndSessionResponse } from '../../types/socket-payloads';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder';

function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

@Component({
  selector: 'app-navbar',
  imports: [AvatarPlaceholderComponent],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionToken = inject(SessionTokenService);

  private readonly now = signal(Date.now());

  // décompte basé sur sessionEndsAt serveur (inclut la marge transition au lancement)
  readonly sessionTimerLabel = computed(() => {
    if (this.ui.isCoopParty()) return null;
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return null;
    }
    return formatRemainingMs(endsAt - this.now());
  });

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
    () => this.ui.gameMode() && this.ui.isCoopParty() && this.ui.isManager(),
  );

  readonly endSessionConfirmTitle = computed(() => {
    if (this.ui.currentSession() >= this.ui.sessionCount()) {
      return 'Terminer la session actuelle ?';
    }
    return 'Terminer la session actuelle et passer à la suivante ?';
  });

  readonly endSessionConfirmOpen = signal(false);
  readonly isEndingSession = signal(false);
  readonly endSessionError = signal('');

  constructor() {
    const interval = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
    });
  }

  // sortie contextuelle : WR = quitter la partie ; en jeu manager = retour lobby sans couper la session
  handleExitToLobby(): void {
    const eventId = this.resolveEventId();

    if (eventId) {
      if (this.ui.waitingMode()) {
        if (this.ui.isManager()) {
          this.socket.emit('closeRoom', { eventId, roomId: eventId });
          this.sessionToken.clear();
        } else {
          this.socket.emit('leaveWaitingRoom', { eventId, roomId: eventId });
          this.sessionToken.clear();
        }
        this.ui.exitWaitingRoom();
        void this.router.navigateByUrl('/');
        return;
      }

      if (this.ui.gameMode()) {
        if (this.ui.isManager() && this.ui.isCompetitiveParty()) {
          this.ui.leaveGroupView(eventId);
          void this.router.navigateByUrl(`/lobby/${eventId}`);
          return;
        }

        this.socket.emit('exitGame', {
          eventId,
          groupCode: this.ui.currentGroupCode(),
          roomId: eventId,
        });
        this.ui.exitGame();
        void this.router.navigateByUrl('/');
        return;
      }

      // Manager compétitif hors canvas
      if (this.ui.isManager() && this.ui.isCompetitiveParty()) {
        this.ui.leaveGroupView(eventId);
        void this.router.navigateByUrl(`/lobby/${eventId}`);
        return;
      }
    }

    void this.router.navigateByUrl('/');
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

    const response = await this.socket.emitWithAck<EndSessionPayload, EndSessionResponse>('endSession', {
      eventId,
    });

    if (response.error) {
      this.endSessionError.set(response.error);
      this.isEndingSession.set(false);
      return;
    }

    this.endSessionConfirmOpen.set(false);
    this.isEndingSession.set(false);
  }
}
