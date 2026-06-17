import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { SessionTokenService } from '../../../core/services/session-token.service';
import { ReconnectService } from '../../../core/services/reconnect.service';
import { GridStatePayload, SessionEndedPayload } from '../../../types/entities';

@Component({
  selector: 'app-canvas-board',
  templateUrl: './canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// canvas 75×75 : joinGroup au mount, draw local optimiste via drawPixel broadcast
export class CanvasComponent implements AfterViewInit {
  private readonly socket = inject(SocketService);
  readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionToken = inject(SessionTokenService);
  private readonly reconnect = inject(ReconnectService);

  readonly eventId = input.required<string>();
  readonly groupCode = input.required<string>();
  readonly viewportEl = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  readonly scale = signal(1);
  readonly position = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);

  private readonly pixelSize = 20;
  private dragStart = { x: 0, y: 0 };
  private hasMoved = false;
  private pointerDownPos = { x: 0, y: 0 };

  ngAfterViewInit(): void {
    const onJoinRoomError = (data: { error: string }) => {
      this.ui.setGameCanvasReady();
      const eventId = this.eventId();
      if (data.error.includes('pas encore démarré') && eventId) {
        this.ui.joinWaitingRoom(eventId);
        void this.router.navigateByUrl(`/room/${eventId}`);
        return;
      }

      this.ui.exitGame();
      this.ui.joinRoomError.set(data.error);
      void this.router.navigateByUrl('/');
    };
    const onGridState = (data: GridStatePayload) => {
      this.reconnect.hydrateGridState(data);
      this.renderGrid(data);
    };
    const onDrawPixel = (data: { x: number; y: number; color: string }) => this.drawSinglePixel(data);
    const onRoomClosed = (data: { eventId?: string; roomId?: string }) => {
      const closedId = data.eventId ?? data.roomId;
      if (closedId === this.eventId()) {
        this.sessionToken.clear();
        this.ui.exitGame();
        void this.router.navigateByUrl('/');
      }
    };
    const onManagerAbsent = (_data: { eventId?: string; roomId?: string }) => {
      // navigation gérée globalement par app.ts
    };
    const onSessionEnded = (payload: SessionEndedPayload) => {
      if (payload.eventId !== this.eventId()) {
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

    this.socket.on<{ error: string }>('joinRoomError', onJoinRoomError);
    this.socket.on<GridStatePayload>('gridState', onGridState);
    this.socket.on<{ x: number; y: number; color: string }>('drawPixel', onDrawPixel);
    this.socket.on<{ eventId?: string; roomId?: string }>('roomClosed', onRoomClosed);
    this.socket.on<{ eventId?: string; roomId?: string }>('managerAbsent', onManagerAbsent);
    this.socket.on<SessionEndedPayload>('sessionEnded', onSessionEnded);

    this.destroyRef.onDestroy(() => {
      this.ui.setGameCanvasReady();
      this.socket.off('joinRoomError', onJoinRoomError as (...args: unknown[]) => void);
      this.socket.off('gridState', onGridState as (...args: unknown[]) => void);
      this.socket.off('drawPixel', onDrawPixel as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
      this.socket.off('managerAbsent', onManagerAbsent as (...args: unknown[]) => void);
      this.socket.off('sessionEnded', onSessionEnded as (...args: unknown[]) => void);
    });

    void this.bootstrapCanvas();
  }

  /** Reconnexion token puis joinGroup si nécessaire. */
  private async bootstrapCanvas(): Promise<void> {
    const session = this.sessionToken.read();

    if (session?.token) {
      const response = await this.reconnect.reconnect();

      // Manager en observation : phase lobby → rejoindre le groupe choisi dans l'URL
      if (response?.phase === 'lobby' && session.role === 'manager') {
        this.ui.setRole('manager');
        this.ui.joinGame(this.eventId(), this.groupCode());
        this.emitJoinGroup();
        return;
      }

      if (response?.phase === 'game' && response.gridState) {
        const sameGroup = response.groupCode === this.groupCode();
        if (sameGroup || session.role === 'player') {
          this.reconnect.hydrateGridState(response.gridState);
          this.renderGrid(response.gridState);
          return;
        }
      }

      if (response && response.phase !== 'game') {
        await this.reconnect.resumeAndNavigate(response);
        return;
      }
    }

    this.emitJoinGroup();
  }

  private emitJoinGroup(): void {
    this.socket.emit('joinGroup', {
      eventId: this.eventId(),
      groupCode: this.groupCode(),
    });
  }

  handleDraw(event: PointerEvent): void {
    const managerCanDraw = this.ui.isCoopParty() && this.ui.isManager();
    if ((this.ui.isManager() && !managerCanDraw) || this.hasMoved || event.button !== 0) {
      this.hasMoved = false;
      return;
    }

    const canvas = this.canvasEl().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const x = Math.floor(relX * (canvas.width / this.pixelSize));
    const y = Math.floor(relY * (canvas.height / this.pixelSize));

    const color = this.ui.selectedColor();
    if (!this.ui.colors().includes(color)) {
      return;
    }

    this.socket.emit('pixelPlaced', {
      x,
      y,
      color,
      eventId: this.eventId(),
      groupCode: this.groupCode(),
    });

    this.hasMoved = false;
  }

  handleWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.scale.set(Math.min(this.scale() * 1.1, 3));
    } else {
      this.scale.set(Math.max(this.scale() / 1.1, 0.1));
    }
  }

  handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  handlePointerDown(event: PointerEvent): void {
    if (event.button === 2) {
      event.preventDefault();
      this.isDragging.set(true);
      this.hasMoved = false;
      this.pointerDownPos = { x: event.clientX, y: event.clientY };
      this.dragStart = {
        x: event.clientX - this.position().x,
        y: event.clientY - this.position().y,
      };
    }
  }

  handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }

    const dist = Math.hypot(event.clientX - this.pointerDownPos.x, event.clientY - this.pointerDownPos.y);
    if (dist > 10) {
      this.hasMoved = true;
    }

    let newX = event.clientX - this.dragStart.x;
    let newY = event.clientY - this.dragStart.y;

    const canvas = this.canvasEl().nativeElement;
    if (this.hasMoved) {
      const boundX = Math.max(0, (canvas.width * this.scale() - window.innerWidth) / 2) + 150;
      const boundY = Math.max(0, (canvas.height * this.scale() - window.innerHeight) / 2) + 150;
      newX = Math.max(-boundX, Math.min(boundX, newX));
      newY = Math.max(-boundY, Math.min(boundY, newY));
      this.position.set({ x: newX, y: newY });
    }
  }

  handlePointerUp(_event?: PointerEvent): void {
    this.isDragging.set(false);
  }

  // trace la grille complète + pixels existants (appelé une fois au gridState)
  private renderGrid(data: GridStatePayload): void {
    requestAnimationFrame(() => {
      const canvas = this.canvasEl().nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.ui.setGameCanvasReady();
        return;
      }

      const width = data.width;
      const height = data.height;

      if (data.colors?.length) {
        this.ui.setColorsFromGrid(data.colors);
      }

      canvas.width = width * this.pixelSize;
      canvas.height = height * this.pixelSize;

      ctx.beginPath();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 1) {
        ctx.moveTo(x * this.pixelSize, 0);
        ctx.lineTo(x * this.pixelSize, height * this.pixelSize);
      }
      for (let y = 0; y <= height; y += 1) {
        ctx.moveTo(0, y * this.pixelSize);
        ctx.lineTo(width * this.pixelSize, y * this.pixelSize);
      }
      ctx.stroke();

      for (const [coords, color] of Object.entries(data.pixels)) {
        const [x, y] = coords.split(',').map((value) => Number(value));
        ctx.fillStyle = color;
        ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
      }

      this.fitGridToViewport();
      this.ui.setGameCanvasReady();
    });
  }

  private fitGridToViewport(): void {
    queueMicrotask(() => {
      const viewport = this.viewportEl().nativeElement;
      const canvas = this.canvasEl().nativeElement;
      if (!canvas.width || !canvas.height) {
        return;
      }

      const margin = 16;
      const availableWidth = viewport.clientWidth - margin;
      const availableHeight = viewport.clientHeight - margin;
      const fitScale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);

      this.scale.set(fitScale);
      this.position.set({ x: 0, y: 0 });
    });
  }

  // incrémental — broadcast drawPixel des autres joueurs (et le sien via le serveur)
  private drawSinglePixel(data: { x: number; y: number; color: string }): void {
    const canvas = this.canvasEl().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = data.color;
    ctx.fillRect(data.x * this.pixelSize, data.y * this.pixelSize, this.pixelSize, this.pixelSize);
    if (data.color.startsWith('#ffffff')) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.strokeRect(data.x * this.pixelSize, data.y * this.pixelSize, this.pixelSize, this.pixelSize);
    }
  }
}
