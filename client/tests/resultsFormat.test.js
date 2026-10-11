// Unit tests for results-page formatting and heatmap helpers (Vitest).
import { describe, it, expect } from 'vitest';
import { formatMoney, formatPercent } from '../src/utils/format.js';
import { axes, nearestCell } from '../src/utils/heatmap.js';
import { mockCompare } from '../src/api/mock/mockData.js';

describe('formatMoney', () => {
  it('uses S$, thousands separators and no decimals', () => {
    expect(formatMoney(120000)).toBe('S$120,000');
    expect(formatMoney(1234.6)).toBe('S$1,235');
    expect(formatMoney(0)).toBe('S$0');
  });
  it('puts a minus sign before S$ for negative amounts', () => {
    expect(formatMoney(-5000)).toBe('−S$5,000');
  });
  it('shows a dash for missing values instead of NaN', () => {
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('turns fractions into percentages', () => {
    expect(formatPercent(0.03)).toBe('3%');
    expect(formatPercent(0.025)).toBe('2.5%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(-0.01)).toBe('−1%');
  });
  it('does not show floating-point noise', () => {
    expect(formatPercent(0.07)).toBe('7%'); // 0.07 * 100 = 7.000000000000001
  });
});

describe('heatmap helpers', () => {
  const { grid } = mockCompare();

  it('reads the axes from the grid', () => {
    expect(axes(grid).priceGrowth).toEqual([0, 0.01, 0.02, 0.03, 0.04, 0.05]);
    expect(axes(grid).incomeGrowth).toEqual([0, 0.01, 0.02, 0.03, 0.04, 0.05]);
    expect(axes([])).toEqual({ priceGrowth: [], incomeGrowth: [] });
  });

  it('finds the cell for the user’s assumptions', () => {
    expect(nearestCell(grid, { priceGrowth: 0.03, incomeGrowth: 0.02 })).toEqual({ row: 2, col: 3, outside: false });
    expect(nearestCell(grid, { priceGrowth: 0.031, incomeGrowth: 0.019 })).toEqual({ row: 2, col: 3, outside: false });
  });

  it('flags assumptions outside the grid and snaps to the edge', () => {
    expect(nearestCell(grid, { priceGrowth: 0.12, incomeGrowth: -0.05 })).toEqual({ row: 0, col: 5, outside: true });
  });

  it('returns null when the user has no assumptions', () => {
    expect(nearestCell(grid, { priceGrowth: null, incomeGrowth: 0.02 })).toBeNull();
    expect(nearestCell(grid, null)).toBeNull();
  });
});

describe('mock compare response', () => {
  it('matches the contract: fractions on the axes, outcomes for both paths', () => {
    const res = mockCompare({ assumptions: { horizonYear: 2050 } });
    expect(res.grid[0][1].annualPriceGrowth).toBe(0.01);
    expect(res.horizonYear).toBe(2050);
    for (const o of [res.outcomeA, res.outcomeB]) {
      expect(o.totalGrantsCents).toBe(o.grants.reduce((sum, g) => sum + g.amountCents, 0));
      expect(typeof o.cpfRefundPrincipalCents).toBe('number');
      expect(typeof o.cpfAccruedInterestCents).toBe('number');
      const allTests = o.grants.flatMap((g) => g.tests);
      expect(allTests.length).toBeGreaterThan(0);
    }
  });
});