import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { SessionTokenService } from '../../core/services/session-token.service';
import { EndSessionPayload, EndSessionResponse } from '../../types/socket-payloads';
import { formatRemainingMs } from '../../core/utils/time';
import { AvatarPlaceholderComponent } from '../avatar-placeholder/avatar-placeholder';


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
  private readonly sessionToken = inject(SessionTokenService);
  private readonly destroyRef = inject(DestroyRef);

  /** Timestamp courant mis à jour chaque seconde pour le chrono. */
  private readonly now = signal(Date.now());

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

  // --- Chrono session (ADD-39) ---

  /** Libellé formaté du temps restant (ex: « 4:32 »). Null si pas de timer actif. */
  readonly sessionTimerLabel = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null || !this.ui.gameMode()) return null;
    return formatRemainingMs(endsAt - this.now());
  });

  /** Vrai s'il reste moins d'1 minute → urgence critique. */
  readonly sessionTimerUrgent = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return false;
    return endsAt - this.now() <= 60_000;
  });

  /** Vrai s'il reste entre 1 et 5 minutes → avertissement. */
  readonly sessionTimerWarning = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) return false;
    const remaining = endsAt - this.now();
    return remaining > 60_000 && remaining <= 300_000;
  });

  /** Classes Tailwind du badge chrono selon l'urgence. */
  readonly timerColorClasses = computed(() => {
    if (this.sessionTimerUrgent()) {
      // 🔴 Urgent : rouge/coral (< 1 min)
      return 'border-brand-coral/70 bg-brand-coral/15 text-brand-coral shadow-[0_0_24px_rgba(244,63,94,0.35)]';
    }
    if (this.sessionTimerWarning()) {
      // 🟠 Warning : ambre (1–5 min)
      return 'border-warning/70 bg-warning/15 text-warning shadow-[0_0_24px_rgba(245,158,11,0.3)]';
    }
    // 🟢 Normal : violet/indigo (> 5 min)
    return 'border-brand-violet/60 bg-brand-violet/15 text-[#A5B4FC] shadow-[0_0_16px_rgba(99,102,241,0.25)]';
  });

  constructor() {
    // Rafraîchit le timestamp chaque seconde pour le chrono
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
