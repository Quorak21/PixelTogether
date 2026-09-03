import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import {
  CELL_SIZE,
  COVERAGE,
  PIXEL_SPLASH_COLORS,
  getGridDimensions,
  pickRandomCells,
} from './grid-pixel-splash.util';

@Component({
  selector: 'app-grid-pixel-splash',
  templateUrl: './grid-pixel-splash.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none absolute inset-0 z-[1] block opacity-70',
    'aria-hidden': 'true',
  },
})
export class GridPixelSplashComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        const { width, height } = entry.contentRect;
        this.paint(width, height);
      });
      this.resizeObserver.observe(this.host.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private paint(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    const canvas = this.canvasEl().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { cols, rows } = getGridDimensions(width, height, CELL_SIZE);
    const cells = pickRandomCells(cols, rows, COVERAGE, PIXEL_SPLASH_COLORS);

    for (const { col, row, color } of cells) {
      ctx.fillStyle = color;
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}
