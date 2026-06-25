/** Must stay in sync with `before:bg-[length:20px_20px]` on landing/waiting/lobby pages. */
export const CELL_SIZE = 20;

export const COVERAGE = 0.006;

export const PIXEL_SPLASH_COLORS = [
  '#000000',
  '#6b4423',
  '#38b764',
  '#f4b41b',
  '#ffffff',
  '#e53b44',
  '#f18d2d',
  '#a3a7c2',
  '#3e8948',
  '#215d5e',
  '#f7e26b',
  '#b13e53',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#ef7d57',
] as const;

export interface GridCell {
  col: number;
  row: number;
  color: string;
}

export function getGridDimensions(
  width: number,
  height: number,
  cellSize: number = CELL_SIZE,
): { cols: number; rows: number } {
  return {
    cols: Math.ceil(width / cellSize),
    rows: Math.ceil(height / cellSize),
  };
}

export function pickRandomCells(
  cols: number,
  rows: number,
  coverage: number = COVERAGE,
  colors: readonly string[] = PIXEL_SPLASH_COLORS,
  random: () => number = Math.random,
): GridCell[] {
  const maxCells = cols * rows;
  if (maxCells <= 0) {
    return [];
  }

  const count = Math.min(Math.round(maxCells * coverage), maxCells);
  const picked = new Set<string>();
  const cells: GridCell[] = [];

  while (cells.length < count) {
    const col = Math.floor(random() * cols);
    const row = Math.floor(random() * rows);
    const key = `${col},${row}`;
    if (picked.has(key)) {
      continue;
    }
    picked.add(key);
    const color = colors[Math.floor(random() * colors.length)]!;
    cells.push({ col, row, color });
  }

  return cells;
}
