import { describe, it, expect } from 'vitest';
import { parseRpi, historicalAnnualGrowth } from '../src/services/datagov/rpi.js';

describe('parseRpi', () => {
  it('parses string indexes, sorts oldest first and drops malformed rows', () => {
    const raw = [
      { quarter: '2026-Q2', index: '202.8' },
      { quarter: '2026-Q1', index: '203.4' },
      { quarter: 'bad', index: '1' },
      { quarter: '2025-Q4', index: 'n/a' },
    ];
    expect(parseRpi(raw)).toEqual([
      { quarter: '2026-Q1', index: 203.4 },
      { quarter: '2026-Q2', index: 202.8 },
    ]);
  });
});

describe('historicalAnnualGrowth', () => {
  // 100 -> 161.051 over 5 years is exactly 10% a year (1.1^5 = 1.61051)
  const series = [
    { quarter: '2021-Q2', index: 100 },
    { quarter: '2023-Q4', index: 130 },
    { quarter: '2026-Q2', index: 161.051 },
  ];

  it('compounds from the same quarter N years before the latest', () => {
    expect(historicalAnnualGrowth(series, 5)).toBe(0.1);
  });

  it('returns null when the series does not go back far enough', () => {
    expect(historicalAnnualGrowth(series, 10)).toBeNull();
    expect(historicalAnnualGrowth([], 5)).toBeNull();
  });
});
