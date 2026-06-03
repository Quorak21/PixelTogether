import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActiveGridsPayload, LobbyRoom } from '../../../types/entities';
import { RoomCardComponent } from '../room-card/room-card';
import { GridCreationModalComponent } from '../grid-creation-modal/grid-creation-modal';
import { GalleryModalComponent } from '../gallery-modal/gallery-modal';
import { ResumeGridResponse } from '../../../types/socket-payloads';

@Component({
  selector: 'app-lobby-page',
  imports: [RoomCardComponent, GridCreationModalComponent, GalleryModalComponent],
  templateUrl: './lobby-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyPageComponent {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly rooms = signal<LobbyRoom[]>([]);
  readonly images = signal<Record<string, string>>({});

  constructor() {
    this.refreshRooms();

    const onActiveGrids = (data: ActiveGridsPayload) => {
      this.rooms.set(Object.values(data.activeGrids ?? {}).filter((room) => !!room?.id));
      this.images.set(data.images ?? {});
      if (typeof data.gold === 'number') {
        this.auth.setGold(data.gold);
      }
    };

    const onCreateCanvas = (data: LobbyRoom & { image?: Record<string, string> }) => {
      this.rooms.update((previous) => {
        if (previous.some((room) => room.id === data.id)) {
          return previous;
        }
        return [...previous, data];
      });
      if (data.image) {
        this.images.set(data.image);
      }
    };

    const onRoomClosed = (data: { roomId: string; image?: Record<string, string> }) => {
      this.rooms.update((previous) => previous.filter((room) => room.id !== data.roomId));
      if (data.image) {
        this.images.set(data.image);
      }
    };

    this.socket.on<ActiveGridsPayload>('activeGrids', onActiveGrids);
    this.socket.on<LobbyRoom & { image?: Record<string, string> }>('createCanvas', onCreateCanvas);
    this.socket.on<{ roomId: string; image?: Record<string, string> }>('roomClosed', onRoomClosed);

    const refreshInterval = window.setInterval(() => this.refreshRooms(), 15000);

    this.destroyRef.onDestroy(() => {
      this.socket.off('activeGrids', onActiveGrids as (...args: unknown[]) => void);
      this.socket.off('createCanvas', onCreateCanvas as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      window.clearInterval(refreshInterval);
    });
  }

  refreshRooms(): void {
    this.socket.emit('getActiveGrids');
  }

  async handleMainAction(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigateByUrl('/');
      return;
    }

    if (user.gridID) {
      await this.handleResume();
      return;
    }

    this.ui.gridCreationOpen.set(true);
  }

  async handleResume(): Promise<void> {
    const response = await this.socket.emitWithAck<Record<string, never>, ResumeGridResponse>(
      'resumeGrid',
      {}
    );
    if (!response.id || !response.host || response.error) {
      return;
    }
    this.ui.joinGame(response.id, response.host);
    this.router.navigateByUrl(`/game/${response.id}`);
  }

  joinRoom(room: LobbyRoom): void {
    this.ui.joinGame(room.id, room.host);
    this.router.navigateByUrl(`/game/${room.id}`);
  }

  showResumeImage(): string | null {
    const user = this.auth.currentUser();
    if (!user?.gridID) {
      return null;
    }
    return this.images()[user.gridID] ?? user.userImg ?? null;
  }

  mainActionTitle(): string {
    const user = this.auth.currentUser();
    if (!user) {
      return 'Se connecter';
    }
    return user.gridID ? 'Continuer' : 'Nouvelle grille';
  }

  mainActionButton(): string {
    const user = this.auth.currentUser();
    if (!user) {
      return 'Connexion';
    }
    return user.gridID ? 'Reprendre' : 'Creer';
  }

  mainActionIcon(): string {
    const user = this.auth.currentUser();
    if (!user) {
      return '🔐';
    }
    return user.gridID ? '▶' : '+';
  }
}
