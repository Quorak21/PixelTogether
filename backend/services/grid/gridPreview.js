import { createCanvas } from 'canvas';

// node-canvas → data URL PNG (fond blanc, compatible export ZIP)
export function generateGridImage(pixels, gridSize, pixelSize = 20) {
  const canvas = createCanvas(gridSize * pixelSize, gridSize * pixelSize);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const coords in pixels) {
    const pixelColor = pixels[coords];
    const [x, y] = coords.split(',');
    ctx.fillStyle = pixelColor;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
  }

  return canvas.toDataURL('image/png');
}
