import { describe, expect, it } from 'vitest';
import { CELL_SIZE, COVERAGE, getGridDimensions, pickRandomCells } from './grid-pixel-splash.util';

describe('getGridDimensions', () => {
  it('computes cols and rows from viewport size', () => {
    expect(getGridDimensions(1920, 1080, CELL_SIZE)).toEqual({ cols: 96, rows: 54 });
    expect(getGridDimensions(100, 50, CELL_SIZE)).toEqual({ cols: 5, rows: 3 });
  });
});

describe('pickRandomCells', () => {
  it('returns ~3% of cells for a typical viewport', () => {
    const { cols, rows } = getGridDimensions(1920, 1080, CELL_SIZE);
    const cells = pickRandomCells(cols, rows, COVERAGE);
    const expected = Math.round(cols * rows * COVERAGE);

    expect(cells).toHaveLength(expected);
    expect(expected).toBe(156);
  });

  it('returns unique cells only', () => {
    const cells = pickRandomCells(50, 30, COVERAGE);
    const keys = cells.map(({ col, row }) => `${col},${row}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps cells within grid bounds', () => {
    const cols = 40;
    const rows = 25;
    const cells = pickRandomCells(cols, rows, COVERAGE);

    for (const { col, row } of cells) {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(cols);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(rows);
    }
  });

  it('uses injected random for deterministic output', () => {
    const random = (() => {
      let i = 0;
      const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      return () => values[i++ % values.length]!;
    })();

    const cells = pickRandomCells(10, 10, 0.1, ['#111111', '#222222'], random);

    expect(cells).toHaveLength(10);
    expect(cells[0]).toEqual({ col: 1, row: 2, color: '#111111' });
  });
});
