import { describe, expect, it } from 'vitest';
import { cashCover, largestFirst, monthYear, totalCpfOa } from '../src/utils/dashboardFormat.js';

describe('monthYear', () => {
  it('turns an ISO date into "May 2035"', () => {
    expect(monthYear('2035-05-01')).toBe('May 2035');
    expect(monthYear('2027-09-30')).toBe('Sep 2027');
  });
  it('gives a dash for anything else', () => {
    expect(monthYear(undefined)).toBe('—');
    expect(monthYear('not a date')).toBe('—');
    expect(monthYear('2035-13-01')).toBe('—');
  });
});

describe('totalCpfOa', () => {
  it('adds the buyers up and skips blanks', () => {
    expect(totalCpfOa([{ cpfOaBalance: 40000 }, { cpfOaBalance: 8200 }])).toBe(48200);
    expect(totalCpfOa([{ cpfOaBalance: 0 }, { cpfOaBalance: null }])).toBe(0);
  });
  it('is null when nobody has a balance entered', () => {
    expect(totalCpfOa([{ cpfOaBalance: null }])).toBeNull();
    expect(totalCpfOa(undefined)).toBeNull();
  });
});

describe('cashCover', () => {
  it('works out the share covered, never rounding a shortfall up to 100%', () => {
    const c = cashCover(32000, 4_500_000); // S$32,000 of S$45,000
    expect(c).toMatchObject({ state: 'short', pct: 71, diffCents: 1_300_000, text: 'S$13,000 short' });
    expect(cashCover(44999, 4_500_000).pct).toBe(99);
  });
  it('stops at 100% and says how much is spare', () => {
    expect(cashCover(50000, 4_500_000)).toMatchObject({ state: 'covered', pct: 100, diffCents: 500_000, text: 'Covered, S$5,000 to spare' });
    expect(cashCover(45000, 4_500_000).text).toBe('Covered exactly');
  });
  it('handles no cash needed and missing numbers', () => {
    expect(cashCover(1000, 0)).toMatchObject({ state: 'none', pct: 100 });
    expect(cashCover(null, 4_500_000)).toMatchObject({ state: 'unknown', pct: 0 });
    expect(cashCover(32000, undefined)).toMatchObject({ state: 'unknown' });
  });
});

describe('largestFirst', () => {
  it('sorts by the bigger of the two paths and keeps ties in order', () => {
    const rows = [
      { id: 'a', a: { amount: 100 }, b: null },
      { id: 'b', a: { amount: 50 }, b: { amount: 900 } },
      { id: 'c', a: null, b: { amount: 100 } },
    ];
    expect(largestFirst(rows).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});
