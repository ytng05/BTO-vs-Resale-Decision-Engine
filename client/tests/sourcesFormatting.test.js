import { describe, expect, it } from 'vitest';
import { formatRuleValue } from '../src/views/sourcesFormatting.js';

describe('Sources view rule value formatting', () => {
  it('formats percent-unit BSD rates without scaling', () => {
    expect(formatRuleValue('transactionCosts.buyerStampDutyTiers.ratePercent', 1)).toBe('1%');
  });

  it('formats fractional CPF interest rates as percentage points', () => {
    expect(formatRuleValue('cpf.oaInterestRate', 0.025)).toBe('2.5%');
  });
});
