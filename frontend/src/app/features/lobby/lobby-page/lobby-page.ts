import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { SessionTokenService } from '../../../core/services/session-token.service';
import { ReconnectService } from '../../../core/services/reconnect.service';
import { EventGroupCard } from '../../../types/entities';
import { SessionEndedPayload } from '../../../types/entities';
import {
  EndSessionPayload,
  EndSessionResponse,
  EventLobbyStatePayload,
  GroupPreviewUpdatedPayload,
} from '../../../types/socket-payloads';
import { GroupTransitionModalComponent } from '../../game/group-transition-modal/group-transition-modal';
import { RoomCardComponent } from '../room-card/room-card';
import { preloadGameRoutes } from '../../../core/utils/preload-game';
import { formatRemainingMs } from '../../../core/utils/time';


@Component({
  selector: 'app-lobby-page',
  imports: [RoomCardComponent, GroupTransitionModalComponent],
  templateUrl: './lobby-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// vue manager : previews live + spectate n'importe quel groupe
export class LobbyPageComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly reconnect = inject(ReconnectService);

  readonly eventId = signal(this.route.snapshot.paramMap.get('eventId')?.toUpperCase() ?? '');
  readonly managerGroups = signal<EventGroupCard[]>([]);
  readonly managerPartyName = signal('');
  readonly managerTheme = signal('');
  readonly managerSessionCount = signal(1);
  readonly managerCurrentSession = signal(1);
  readonly managerSessionLabel = computed(
    () => `Session ${this.managerCurrentSession()}/${this.managerSessionCount()}`,
  );
  readonly isLastSession = computed(
    () => this.managerCurrentSession() >= this.managerSessionCount(),
  );
  readonly endSessionButtonLabel = computed(() =>
    this.isLastSession() ? 'Terminer la partie' : 'Terminer la session',
  );
  readonly transitionActive = signal(Boolean(this.ui.groupTransition()));
  readonly endSessionConfirmOpen = signal(false);
  readonly isEndingSession = signal(false);
  readonly endSessionError = signal('');

  private readonly now = signal(Date.now());

  readonly sessionTimerLabel = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return null;
    }
    return formatRemainingMs(endsAt - this.now());
  });

  readonly sessionTimerUrgent = computed(() => {
    const endsAt = this.ui.sessionEndsAt();
    if (endsAt === null) {
      return false;
    }
    return endsAt - this.now() <= 60_000;
  });

  constructor() {
    const interval = window.setInterval(() => {
      this.now.set(Date.now());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      window.clearInterval(interval);
    });

    this.loadEventLobby();
    this.bindManagerListeners();
    preloadGameRoutes();

    this.reconnect.setLobbyResyncHandler((state) => this.applyLobbyState(state));
    this.destroyRef.onDestroy(() => {
      this.reconnect.setLobbyResyncHandler(null);
    });
  }

  private async tryReconnectLobby(): Promise<boolean> {
    const session = this.sessionToken.read();
    if (!session?.token) return false;

    const response = await this.reconnect.reconnect();
    if (!response) return false;

    if (response.phase === 'lobby' && response.lobbyState) {
      this.applyLobbyState(response.lobbyState);
      return true;
    }

    if (response.phase === 'game' || response.phase === 'waiting' || response.phase === 'voting') {
      await this.reconnect.resumeAndNavigate(response);
      return true;
    }

    return false;
  }

  private applyLobbyState(response: EventLobbyStatePayload): void {
    const eventId = this.eventId();
    this.managerPartyName.set(response.partyName);
    this.managerTheme.set(response.theme ?? response.name);
    this.managerSessionCount.set(response.sessionCount ?? 1);
    this.managerCurrentSession.set(response.currentSession ?? 1);
    this.managerGroups.set(response.groups ?? []);
    this.ui.gameTheme.set(response.theme ?? response.name);
    this.ui.partyName.set(response.partyName);
    this.ui.setSessionMeta(response.sessionCount ?? 1, response.currentSession ?? 1, true);
    this.ui.currentEventId.set(eventId);
    this.ui.setRole('manager');
    if (response.sessionEndsAt) {
      this.ui.setSessionEndsAt(response.sessionEndsAt);
    }
  }

  joinGroup(group: EventGroupCard): void {
    this.ui.setRole('manager');
    this.ui.groupLabel.set(group.label);
    this.ui.beginGameCanvasLoading();
    this.ui.joinGame(group.eventId, group.groupCode);
    void this.router.navigateByUrl(`/game/${group.eventId}/${group.groupCode}`);
  }

  onTransitionDismissed(): void {
    this.transitionActive.set(false);
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
    const eventId = this.eventId();
    if (!eventId || this.isEndingSession()) {
      return;
    }

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

  // recharge l'état lobby (groupes, timer) — reconnexion ou getEventLobby
  private loadEventLobby(): void {
    const eventId = this.eventId();
    if (!eventId) {
      return;
    }

    void this.tryReconnectLobby().then((reconnected) => {
      if (reconnected) return;

      void this.socket
        .emitWithAck<{ eventId: string }, EventLobbyStatePayload>('getEventLobby', { eventId })
        .then((response) => {
          if (response.error) {
            this.sessionToken.clear();
            this.ui.exitGame();
            void this.router.navigateByUrl('/');
            return;
          }
          this.applyLobbyState(response);
        })
        .catch(() => {
          this.sessionToken.clear();
          this.ui.exitGame();
          void this.router.navigateByUrl('/');
        });
    });
  }

  // groupPreviewUpdated = refresh vignette sans re-fetch getEventLobby
  private bindManagerListeners(): void {
    const eventId = this.eventId();

    const onPreviewUpdated = (payload: GroupPreviewUpdatedPayload) => {
      if (payload.eventId !== eventId) {
        return;
      }
      this.managerGroups.update((groups) =>
        groups.map((group) =>
          group.groupCode === payload.groupCode ? { ...group, image: payload.image } : group,
        ),
      );
    };

    const onSessionEnded = (payload: SessionEndedPayload) => {
      if (payload.eventId !== eventId) {
        return;
      }
      this.ui.clearSessionEndsAt();
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
      this.ui.leaveCanvasForWaitingRoom(payload.eventId);
      void this.router.navigateByUrl(`/room/${payload.eventId}`);
    };

    const onRoomClosed = (data: { eventId?: string; roomId?: string }) => {
      const closedId = data.eventId ?? data.roomId;
      if (closedId === eventId) {
        this.sessionToken.clear();
        this.ui.exitGame();
        void this.router.navigateByUrl('/');
      }
    };

    const onManagerAbsent = (_data: { eventId?: string; roomId?: string }) => {
      // navigation gérée globalement par app.ts
    };

    this.socket.on<GroupPreviewUpdatedPayload>('groupPreviewUpdated', onPreviewUpdated);
    this.socket.on<SessionEndedPayload>('sessionEnded', onSessionEnded);
    this.socket.on<{ eventId?: string; roomId?: string }>('roomClosed', onRoomClosed);
    this.socket.on<{ eventId?: string; roomId?: string }>('managerAbsent', onManagerAbsent);

    this.destroyRef.onDestroy(() => {
      this.socket.off('groupPreviewUpdated', onPreviewUpdated as (...args: unknown[]) => void);
      this.socket.off('sessionEnded', onSessionEnded as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      this.socket.off('managerAbsent', onManagerAbsent as (...args: unknown[]) => void);
    });
  }
}
