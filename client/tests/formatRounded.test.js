// The one rounding rule (utils/format.js): summaries round to the nearest S$1,000, from cents.
import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyRounded } from '../src/utils/format.js';

describe('formatMoneyRounded', () => {
  it('rounds cents to the nearest S$1,000', () => {
    expect(formatMoneyRounded(51_095_900)).toBe('S$511,000');
    expect(formatMoneyRounded(40_665_600)).toBe('S$407,000');
    expect(formatMoneyRounded(49_900)).toBe('S$0');
  });

  it('keeps the sign with a true minus', () => {
    expect(formatMoneyRounded(-12_345_600)).toBe('−S$123,000');
  });

  it('shows a dash for anything that is not a number', () => {
    expect(formatMoneyRounded(null)).toBe('—');
    expect(formatMoneyRounded(Number.NaN)).toBe('—');
  });

  it('agrees with formatMoney on whole thousands', () => {
    expect(formatMoneyRounded(10_400_000)).toBe(formatMoney(104_000));
  });
});
