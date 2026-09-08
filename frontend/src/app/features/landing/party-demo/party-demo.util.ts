/** Mini-démo landing : 3 grilles 8×8 (null = case vide). */

export type DemoPhase = 'draw' | 'vote' | 'podium';

export const DEMO_PHASE_MS = 6000;
export const DEMO_FADE_MS = 450;
export const DEMO_GRID = 8;

export const DEMO_PLAYERS = [
  { name: 'Léa', color: '#7c3aed' },
  { name: 'Tom', color: '#f43f5e' },
  { name: 'Sam', color: '#14b8a6' },
] as const;

const [A, B, C] = DEMO_PLAYERS.map((p) => p.color);

function cellsFrom(pixels: Array<[number, number, string]>): (string | null)[] {
  const cells: (string | null)[] = Array.from({ length: DEMO_GRID * DEMO_GRID }, () => null);
  for (const [x, y, color] of pixels) {
    cells[y * DEMO_GRID + x] = color;
  }
  return cells;
}

/** Coups de dessin collaboratif (ordre d’apparition) — maison multi-couleurs. */
export const DEMO_DRAW_STROKES: ReadonlyArray<{ i: number; color: string }> = (() => {
  const pixels: Array<[number, number, string]> = [
    [2, 5, A], [3, 5, B], [4, 5, C], [5, 5, A],
    [2, 4, B], [5, 4, C],
    [2, 3, A], [5, 3, B],
    [1, 2, C], [2, 2, A], [3, 2, B], [4, 2, C], [5, 2, A], [6, 2, B],
    [3, 1, A], [4, 1, C],
    [3, 3, B], [4, 3, A],
    [3, 4, C], [4, 4, B],
    [2, 6, A], [3, 6, C], [4, 6, B], [5, 6, A],
  ];
  return pixels.map(([x, y, color]) => ({ i: y * DEMO_GRID + x, color }));
})();

/** Trois œuvres finales : chaque grille mélange les 3 palettes. */
export const DEMO_ARTWORKS = [
  {
    label: 'Groupe 1',
    votes: 5,
    rank: 1,
    // Soleil / ciel — formes rondes, couleurs mélangées
    cells: cellsFrom([
      [3, 0, A], [4, 0, B],
      [2, 1, C], [3, 1, A], [4, 1, B], [5, 1, C],
      [1, 2, A], [2, 2, B], [5, 2, A], [6, 2, C],
      [1, 3, B], [6, 3, A],
      [1, 4, C], [2, 4, A], [5, 4, B], [6, 4, C],
      [2, 5, B], [3, 5, C], [4, 5, A], [5, 5, B],
      [3, 6, A], [4, 6, C],
      [0, 3, A], [7, 3, B],
      [3, 7, B], [4, 7, A],
    ]),
  },
  {
    label: 'Groupe 2',
    votes: 3,
    rank: 2,
    // Maison — toit + murs + porte, 3 couleurs
    cells: cellsFrom([
      [3, 1, A], [4, 1, B],
      [2, 2, C], [3, 2, A], [4, 2, B], [5, 2, C],
      [1, 3, A], [2, 3, B], [3, 3, C], [4, 3, A], [5, 3, B], [6, 3, C],
      [2, 4, A], [5, 4, B],
      [2, 5, C], [3, 5, A], [4, 5, B], [5, 5, C],
      [2, 6, A], [3, 6, B], [4, 6, C], [5, 6, A],
      [3, 4, B], [4, 4, A],
    ]),
  },
  {
    label: 'Groupe 3',
    votes: 1,
    rank: 3,
    // Montagnes + étoile — large, pas de forme allongée centrale
    cells: cellsFrom([
      [1, 5, A], [2, 5, B], [3, 5, C], [4, 5, A], [5, 5, B], [6, 5, C],
      [2, 4, A], [3, 4, B], [4, 4, C], [5, 4, A],
      [3, 3, C], [4, 3, A],
      [0, 5, B], [7, 5, A],
      [1, 6, C], [2, 6, A], [3, 6, B], [4, 6, C], [5, 6, A], [6, 6, B],
      [1, 1, A],
      [0, 2, B], [2, 2, C],
      [1, 2, A],
      [1, 3, B],
      [6, 1, C], [5, 2, A], [7, 2, B], [6, 2, C], [6, 3, A],
    ]),
  },
] as const;

export function emptyGrid(): (string | null)[] {
  return Array.from({ length: DEMO_GRID * DEMO_GRID }, () => null);
}
