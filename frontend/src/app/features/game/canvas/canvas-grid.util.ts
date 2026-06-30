import { CANVAS_BG_WHITE, isPaintedWhite } from '../../../core/config/session-config';

const GRID_STROKE = '#ddd';

export function getCellColor(pixelMap: Map<string, string>, x: number, y: number): string | null {
  return pixelMap.get(`${x},${y}`) ?? null;
}

/** Détermine si une arête entre deux cellules doit être tracée. */
export function shouldDrawEdge(colorA: string | null, colorB: string | null): boolean {
  if (colorA === null && colorB === null) {
    return true;
  }
  if (isPaintedWhite(colorA) && isPaintedWhite(colorB)) {
    return false;
  }
  if (colorA !== null && colorB !== null && colorA.toLowerCase() === colorB.toLowerCase()) {
    return false;
  }
  return true;
}

/** Trace les arêtes internes et le contour de la grille selon les couleurs adjacentes. */
export function strokeSelectiveGrid(
  ctx: CanvasRenderingContext2D,
  pixelMap: Map<string, string>,
  width: number,
  height: number,
  pixelSize: number,
): void {
  ctx.beginPath();
  ctx.strokeStyle = GRID_STROKE;
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const left = x === 0 ? null : getCellColor(pixelMap, x - 1, y);
      const right = x === width ? null : getCellColor(pixelMap, x, y);
      if (!shouldDrawEdge(left, right)) {
        continue;
      }
      const lineX = x * pixelSize;
      ctx.moveTo(lineX, y * pixelSize);
      ctx.lineTo(lineX, (y + 1) * pixelSize);
    }
  }

  for (let y = 0; y <= height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const top = y === 0 ? null : getCellColor(pixelMap, x, y - 1);
      const bottom = y === height ? null : getCellColor(pixelMap, x, y);
      if (!shouldDrawEdge(top, bottom)) {
        continue;
      }
      const lineY = y * pixelSize;
      ctx.moveTo(x * pixelSize, lineY);
      ctx.lineTo((x + 1) * pixelSize, lineY);
    }
  }

  ctx.stroke();
}

/** Fond blanc, pixels peints, puis contours conditionnels. */
export function paintGridContent(
  ctx: CanvasRenderingContext2D,
  pixelMap: Map<string, string>,
  width: number,
  height: number,
  pixelSize: number,
): void {
  ctx.fillStyle = CANVAS_BG_WHITE;
  ctx.fillRect(0, 0, width * pixelSize, height * pixelSize);

  for (const [coords, color] of pixelMap) {
    const [x, y] = coords.split(',').map((value) => Number(value));
    ctx.fillStyle = color;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
  }

  strokeSelectiveGrid(ctx, pixelMap, width, height, pixelSize);
}
