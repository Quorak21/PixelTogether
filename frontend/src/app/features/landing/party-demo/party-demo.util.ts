/** Mini-démo landing : 3 grilles 8×8 (null = case vide). */

export type DemoPhase = 'draw' | 'vote' | 'podium';

export const DEMO_PHASE_MS = 6000;
export const DEMO_FADE_MS = 450;
export const DEMO_GRID = 8;

/** Palette de la maison (phase dessin) — une couleur par joueur. */
export const DEMO_PLAYERS = [
  { name: 'Léa', color: '#6b4423' },
  { name: 'Tom', color: '#e11d48' },
  { name: 'Sam', color: '#16a34a' },
] as const;

const [DOOR, ROOF, WALLS] = DEMO_PLAYERS.map((p) => p.color);

/** Soleil — ciel indigo, astre or, horizon orange. */
const SUN = { sky: '#4f46e5', disc: '#fbbf24', ground: '#f97316' };

/** Montagnes de nuit — sommets lavande, massif émeraude, étoiles rose. */
const NIGHT = { peak: '#c4b5fd', massif: '#0f766e', star: '#fb7185' };

function cellsFrom(pixels: Array<[number, number, string]>): (string | null)[] {
  const cells: (string | null)[] = Array.from({ length: DEMO_GRID * DEMO_GRID }, () => null);
  for (const [x, y, color] of pixels) {
    cells[y * DEMO_GRID + x] = color;
  }
  return cells;
}

/** Coups de dessin collaboratif — maison : toit / murs / porte, une couleur par zone. */
export const DEMO_DRAW_STROKES: ReadonlyArray<{ i: number; color: string }> = (() => {
  const pixels: Array<[number, number, string]> = [
    [2, 5, WALLS], [3, 5, WALLS], [4, 5, WALLS], [5, 5, WALLS],
    [2, 4, WALLS], [5, 4, WALLS],
    [2, 3, ROOF], [5, 3, ROOF],
    [1, 2, ROOF], [2, 2, ROOF], [3, 2, ROOF], [4, 2, ROOF], [5, 2, ROOF], [6, 2, ROOF],
    [3, 1, ROOF], [4, 1, ROOF],
    [3, 3, ROOF], [4, 3, ROOF],
    [3, 4, DOOR], [4, 4, DOOR],
    [2, 6, WALLS], [3, 6, WALLS], [4, 6, WALLS], [5, 6, WALLS],
  ];
  return pixels.map(([x, y, color]) => ({ i: y * DEMO_GRID + x, color }));
})();

/** Trois œuvres : palettes exclusives, une couleur par zone (pas un damier). */
export const DEMO_ARTWORKS = [
  {
    label: 'Groupe 1',
    votes: 5,
    rank: 1,
    // Soleil / horizon — bandes : ciel, astre, sol
    cells: cellsFrom([
      [3, 0, SUN.sky], [4, 0, SUN.sky],
      [2, 1, SUN.sky], [3, 1, SUN.sky], [4, 1, SUN.sky], [5, 1, SUN.sky],
      [1, 2, SUN.sky], [2, 2, SUN.sky], [5, 2, SUN.sky], [6, 2, SUN.sky],
      [1, 3, SUN.disc], [6, 3, SUN.disc],
      [1, 4, SUN.disc], [2, 4, SUN.disc], [5, 4, SUN.disc], [6, 4, SUN.disc],
      [2, 5, SUN.disc], [3, 5, SUN.disc], [4, 5, SUN.disc], [5, 5, SUN.disc],
      [3, 6, SUN.ground], [4, 6, SUN.ground],
      [0, 3, SUN.disc], [7, 3, SUN.disc],
      [3, 7, SUN.ground], [4, 7, SUN.ground],
    ]),
  },
  {
    label: 'Groupe 2',
    votes: 3,
    rank: 2,
    // Maison — toit, murs, porte
    cells: cellsFrom([
      [3, 1, ROOF], [4, 1, ROOF],
      [2, 2, ROOF], [3, 2, ROOF], [4, 2, ROOF], [5, 2, ROOF],
      [1, 3, ROOF], [2, 3, ROOF], [3, 3, ROOF], [4, 3, ROOF], [5, 3, ROOF], [6, 3, ROOF],
      [2, 4, WALLS], [5, 4, WALLS],
      [2, 5, WALLS], [3, 5, WALLS], [4, 5, WALLS], [5, 5, WALLS],
      [2, 6, WALLS], [3, 6, WALLS], [4, 6, WALLS], [5, 6, WALLS],
      [3, 4, DOOR], [4, 4, DOOR],
    ]),
  },
  {
    label: 'Groupe 3',
    votes: 1,
    rank: 3,
    // Montagnes + étoiles — massif, sommets, constellation
    cells: cellsFrom([
      [1, 5, NIGHT.massif], [2, 5, NIGHT.massif], [3, 5, NIGHT.massif], [4, 5, NIGHT.massif], [5, 5, NIGHT.massif], [6, 5, NIGHT.massif],
      [2, 4, NIGHT.peak], [3, 4, NIGHT.peak], [4, 4, NIGHT.peak], [5, 4, NIGHT.peak],
      [3, 3, NIGHT.peak], [4, 3, NIGHT.peak],
      [0, 5, NIGHT.massif], [7, 5, NIGHT.massif],
      [1, 6, NIGHT.massif], [2, 6, NIGHT.massif], [3, 6, NIGHT.massif], [4, 6, NIGHT.massif], [5, 6, NIGHT.massif], [6, 6, NIGHT.massif],
      [1, 1, NIGHT.star],
      [0, 2, NIGHT.star], [2, 2, NIGHT.star],
      [1, 2, NIGHT.star],
      [1, 3, NIGHT.star],
      [6, 1, NIGHT.star], [5, 2, NIGHT.star], [7, 2, NIGHT.star], [6, 2, NIGHT.star], [6, 3, NIGHT.star],
    ]),
  },
] as const;

export function emptyGrid(): (string | null)[] {
  return Array.from({ length: DEMO_GRID * DEMO_GRID }, () => null);
}
