import { createCanvas } from 'canvas';

/**
 * Génère une image au format PNG (Data URL) à partir de la grille de pixels dessinée.
 * Utilise la bibliothèque node-canvas pour peindre en arrière-plan.
 * Cette image sert à générer les miniatures pour le lobby du manager et le vote des joueurs.
 * Le fond de l'image est peint en blanc pour assurer une bonne visibilité et compatibilité 
 * lors de l'export ZIP final.
 * 
 * @param {Object} pixels - L'objet contenant les pixels du groupe sous forme de clé `"x,y"` et de valeur `"#couleur"`.
 * @param {number} gridSize - La taille de la grille (75x75 pixels).
 * @param {number} [pixelSize=20] - La taille physique en pixels écran pour chaque pixel logique du canvas.
 * @returns {string} L'URL de données contenant le PNG encodé en Base64.
 */
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
