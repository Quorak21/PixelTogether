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
import { GridStatePayload } from '../../../types/entities';

@Component({
  selector: 'app-canvas-board',
  templateUrl: './canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit {
  private readonly socket = inject(SocketService);
  private readonly ui = inject(UiStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
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
    this.socket.emit('joinRoom', { roomId: this.roomId() });

    const onJoinRoomError = (data: { error: string }) => {
      const roomId = this.roomId();
      if (data.error.includes('pas encore démarré') && roomId) {
        this.ui.joinWaitingRoom(roomId);
        void this.router.navigateByUrl(`/room/${roomId}`);
        return;
      }

      this.ui.exitGame();
      this.ui.joinRoomError.set(data.error);
      this.ui.joinRoomOpen.set(true);
      void this.router.navigateByUrl('/');
    };
    const onGridState = (data: GridStatePayload) => {
      this.ui.setRole(data.role);
      this.ui.gameTheme.set(data.name);
      this.renderGrid(data);
    };
    const onDrawPixel = (data: { x: number; y: number; color: string }) => this.drawSinglePixel(data);
    const onRoomClosed = (data: { roomId: string }) => {
      if (data.roomId === this.roomId()) {
        this.ui.exitGame();
        this.router.navigateByUrl('/lobby');
      }
    };

    this.socket.on<{ error: string }>('joinRoomError', onJoinRoomError);
    this.socket.on<GridStatePayload>('gridState', onGridState);
    this.socket.on<{ x: number; y: number; color: string }>('drawPixel', onDrawPixel);
    this.socket.on<{ roomId: string }>('roomClosed', onRoomClosed);

    this.destroyRef.onDestroy(() => {
      this.socket.off('joinRoomError', onJoinRoomError as (...args: unknown[]) => void);
      this.socket.off('gridState', onGridState as (...args: unknown[]) => void);
      this.socket.off('drawPixel', onDrawPixel as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
    });
  }

  handleDraw(event: PointerEvent): void {
    if (this.hasMoved || event.button !== 0) {
      this.hasMoved = false;
      return;
    }

    const canvas = this.canvasEl().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const x = Math.floor(relX * (canvas.width / this.pixelSize));
    const y = Math.floor(relY * (canvas.height / this.pixelSize));

    this.socket.emit('pixelPlaced', {
      x,
      y,
      color: this.ui.selectedColor(),
      roomId: this.roomId(),
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

  private renderGrid(data: GridStatePayload): void {
    const canvas = this.canvasEl().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
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
