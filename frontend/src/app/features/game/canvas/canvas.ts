import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { UiStateService } from '../../../core/services/ui-state.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { GridPrivacy, GridStatePayload } from '../../../types/entities';

@Component({
  selector: 'app-canvas-board',
  templateUrl: './canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasComponent implements AfterViewInit {
  private readonly socket = inject(SocketService);
  private readonly ui = inject(UiStateService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly gridTypeChange = output<GridPrivacy>();
  readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  readonly roomName = signal('');
  readonly scale = signal(1);
  readonly position = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);

  private readonly pixelSize = 20;
  private dragStart = { x: 0, y: 0 };
  private hasMoved = false;
  private pointerDownPos = { x: 0, y: 0 };
  private pinchDist: number | null = null;
  private isPinching = false;

  ngAfterViewInit(): void {
    this.socket.emit('joinRoom', { roomId: this.roomId() });

    const onGridState = (data: GridStatePayload) => this.renderGrid(data);
    const onDrawPixel = (data: { x: number; y: number; color: string }) => this.drawSinglePixel(data);
    const onRoomClosed = (data: { roomId: string }) => {
      if (data.roomId === this.roomId()) {
        this.ui.exitGame();
      }
    };

    this.socket.on<GridStatePayload>('gridState', onGridState);
    this.socket.on<{ x: number; y: number; color: string }>('drawPixel', onDrawPixel);
    this.socket.on<{ roomId: string }>('roomClosed', onRoomClosed);

    this.destroyRef.onDestroy(() => {
      this.socket.off('gridState', onGridState as (...args: unknown[]) => void);
      this.socket.off('drawPixel', onDrawPixel as (...args: unknown[]) => void);
      this.socket.off('roomClosed', onRoomClosed as (...args: unknown[]) => void);
    });
  }

  handleDraw(event: PointerEvent): void {
    if (this.hasMoved || event.button === 1 || this.isPinching) {
      this.hasMoved = false;
      return;
    }

    const canvas = this.canvasEl().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const coordX = (event.clientX - rect.left) / this.scale();
    const coordY = (event.clientY - rect.top) / this.scale();
    const x = Math.floor(coordX / this.pixelSize);
    const y = Math.floor(coordY / this.pixelSize);

    this.socket.emitWithAck<{ x: number; y: number; color: string; roomId: string }, { gold: number }>(
      'pixelPlaced',
      { x, y, color: this.ui.selectedColor(), roomId: this.roomId() }
    ).then((response) => {
      if (typeof response?.gold === 'number') {
        this.auth.setGold(response.gold);
      }
    });

    this.hasMoved = false;
  }

  handleWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.scale.set(Math.min(this.scale() * 1.1, 2));
    } else {
      this.scale.set(Math.max(this.scale() / 1.1, 0.5));
    }
  }

  handlePointerDown(event: PointerEvent): void {
    if (event.button === 1 || event.pointerType === 'touch') {
      this.isPinching = false;
      this.isDragging.set(true);
      this.hasMoved = false;
      this.pointerDownPos = { x: event.clientX, y: event.clientY };
      this.dragStart = {
        x: event.clientX - this.position().x,
        y: event.clientY - this.position().y
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

  handlePointerUp(event: PointerEvent): void {
    this.isDragging.set(false);
    this.pinchDist = null;
  }

  handleTouchZoomStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      this.pinchDist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      this.isPinching = true;
      this.isDragging.set(false);
    }
  }

  handleTouchZoom(event: TouchEvent): void {
    if (event.touches.length === 2 && this.pinchDist) {
      const currentDist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const diff = currentDist - this.pinchDist;
      this.scale.set(Math.min(Math.max(this.scale() + diff * 0.01, 0.5), 3));
      this.pinchDist = currentDist;
    }
  }

  private renderGrid(data: GridStatePayload): void {
    const canvas = this.canvasEl().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = data.width;
    const height = data.height;
    this.roomName.set(data.name);
    this.gridTypeChange.emit(data.type);

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
