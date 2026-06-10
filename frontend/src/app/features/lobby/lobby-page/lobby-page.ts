import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { ActiveGridsPayload, EventGroupCard, LobbyRoom, SessionEndedPayload } from '../../../types/entities';
import {
  EndSessionPayload,
  EndSessionResponse,
  EventLobbyStatePayload,
  GroupPreviewUpdatedPayload,
} from '../../../types/socket-payloads';
import { GroupTransitionModalComponent } from '../../game/group-transition-modal/group-transition-modal';
import { RoomCardComponent } from '../room-card/room-card';
import { GridCreationModalComponent } from '../grid-creation-modal/grid-creation-modal';

@Component({
  selector: 'app-lobby-page',
  imports: [RoomCardComponent, GridCreationModalComponent, GroupTransitionModalComponent],
  templateUrl: './lobby-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyPageComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly eventId = signal(this.route.snapshot.paramMap.get('eventId')?.toUpperCase() ?? '');
  readonly isHostMode = computed(() => Boolean(this.eventId()));

  readonly rooms = signal<LobbyRoom[]>([]);
  readonly images = signal<Record<string, string>>({});
  readonly hostGroups = signal<EventGroupCard[]>([]);
  readonly hostPartyName = signal('');
  readonly hostTheme = signal('');
  readonly hostSessionCount = signal(1);
  readonly hostCurrentSession = signal(1);
  readonly hostSessionLabel = computed(
    () => `Session ${this.hostCurrentSession()}/${this.hostSessionCount()}`,
  );
  readonly transitionActive = signal(Boolean(this.ui.groupTransition()));
  readonly endSessionConfirmOpen = signal(false);
  readonly isEndingSession = signal(false);
  readonly endSessionError = signal('');

  constructor() {
    if (this.isHostMode()) {
      this.loadEventLobby();
      this.bindHostListeners();
    } else {
      this.refreshPublicLobby();
      this.bindPublicListeners();
    }
  }

  refreshRooms(): void {
    if (this.isHostMode()) {
      this.loadEventLobby();
    } else {
      this.refreshPublicLobby();
    }
  }

  openCreateModal(): void {
    this.ui.gridCreationOpen.set(true);
  }

  joinRoom(room: LobbyRoom): void {
    this.ui.joinWaitingRoom(room.id);
    void this.router.navigateByUrl(`/room/${room.id}`);
  }

  joinGroup(group: EventGroupCard): void {
    this.ui.setRole('host');
    this.ui.groupLabel.set(group.label);
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

    const response = await this.socket.emitWithAck<EndSessionPayload, EndSessionResponse>(
      'endSession',
      { eventId },
    );

    this.isEndingSession.set(false);

    if (response.error) {
      this.endSessionError.set(response.error);
      return;
    }

    this.closeEndSessionConfirm();
  }

  private handleSessionEnded(payload: SessionEndedPayload): void {
    if (payload.eventId !== this.eventId()) {
      return;
    }

    this.hostGroups.set([]);
    this.ui.exitGame();
    this.ui.joinWaitingRoom(payload.eventId);
    this.ui.partyName.set(payload.partyName);
    this.ui.gameTheme.set(payload.theme);
    this.ui.setRole('host');
    void this.router.navigateByUrl(`/room/${payload.eventId}`);
  }

  private refreshPublicLobby(): void {
    this.socket.emit('getActiveGrids');
  }

  private loadEventLobby(): void {
    const eventId = this.eventId();
    if (!eventId) {
      return;
    }

    void this.socket
      .emitWithAck<{ eventId: string }, EventLobbyStatePayload>('getEventLobby', { eventId })
      .then((response) => {
        if (response.error) {
          return;
        }
        this.hostPartyName.set(response.partyName);
        this.hostTheme.set(response.theme ?? response.name);
        this.hostSessionCount.set(response.sessionCount ?? 1);
        this.hostCurrentSession.set(response.currentSession ?? 1);
        this.hostGroups.set(response.groups ?? []);
        this.ui.gameTheme.set(response.theme ?? response.name);
      });
  }

  private bindPublicListeners(): void {
    const onActiveGrids = (data: ActiveGridsPayload) => {
      this.rooms.set(Object.values(data.activeGrids ?? {}).filter((room) => !!room?.id));
      this.images.set(data.images ?? {});
    };

    const onCreateCanvas = (data: LobbyRoom) => {
      this.rooms.update((previous) => {
        if (previous.some((room) => room.id === data.id)) {
          return previous;
        }
        return [...previous, data];
      });
    };

    const onRoomClosed = (data: { roomId: string }) => {
      this.rooms.update((previous) => previous.filter((room) => room.id !== data.roomId));
    };

    this.socket.on<ActiveGridsPayload>('activeGrids', onActiveGrids);
    this.socket.on<LobbyRoom>('createCanvas', onCreateCanvas);
    this.socket.on<{ roomId: string }>('roomClosed', onRoomClosed);

    const refreshInterval = window.setInterval(() => this.refreshPublicLobby(), 15000);

    this.destroyRef.onDestroy(() => {
      this.socket.off('activeGrids', onActiveGrids as (...args: unknown[]) => void);
      this.socket.off('createCanvas', onCreateCanvas as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      window.clearInterval(refreshInterval);
    });
  }

  private bindHostListeners(): void {
    const eventId = this.eventId();

    const onPreviewUpdated = (payload: GroupPreviewUpdatedPayload) => {
      if (payload.eventId !== eventId) {
        return;
      }
      this.hostGroups.update((groups) =>
        groups.map((group) =>
          group.groupCode === payload.groupCode ? { ...group, image: payload.image } : group,
        ),
      );
    };

    const onRoomClosed = (data: { eventId?: string; roomId?: string }) => {
      const closedId = data.eventId ?? data.roomId;
      if (closedId === eventId) {
        void this.router.navigateByUrl('/');
      }
    };

    const onSessionEnded = (payload: SessionEndedPayload) => this.handleSessionEnded(payload);

    this.socket.on<GroupPreviewUpdatedPayload>('groupPreviewUpdated', onPreviewUpdated);
    this.socket.on<{ eventId?: string; roomId?: string }>('roomClosed', onRoomClosed);
    this.socket.on<SessionEndedPayload>('sessionEnded', onSessionEnded);

    this.destroyRef.onDestroy(() => {
      this.socket.off('groupPreviewUpdated', onPreviewUpdated as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      this.socket.off('sessionEnded', onSessionEnded as (...args: unknown[]) => void);
    });
  }
}
