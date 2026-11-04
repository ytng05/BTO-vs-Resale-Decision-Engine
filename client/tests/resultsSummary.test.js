import { describe, expect, it } from 'vitest';
import { gridSummary } from '../src/utils/resultsSummary.js';

const cell = (winner) => ({ winner, marginCents: 1 });

describe('gridSummary', () => {
  it('turns the grid top-down (highest income growth first) and says BTO wins every combination', () => {
    const grid = [[cell('A'), cell('A')], [cell('A'), cell('B')]]; // row 0 = lowest income growth
    const g = gridSummary(grid);
    expect(g.rows).toEqual([['A', 'B'], ['A', 'A']]);
    expect(g).toMatchObject({ cols: 2, total: 4, a: 3, b: 1 });
    expect(g.line).toBe('BTO is ahead in 3 of the 4 growth combinations we tested, resale in 1.');
    expect(gridSummary([[cell('A'), cell('A')]]).line).toBe('BTO stays ahead in every growth combination we tested.');
    expect(gridSummary([[cell('B')]]).line).toBe('Resale stays ahead in every growth combination we tested.');
  });
  it('says nothing without a grid', () => {
    expect(gridSummary(null)).toMatchObject({ total: 0, line: '' });
  });
});
