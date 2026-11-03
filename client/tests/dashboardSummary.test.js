import { describe, expect, it } from 'vitest';
import { bars, cashCard, cashSentence, priceFlip, purchaseCard, sideBySide, versus, whatIfChanges } from '../src/utils/dashboardSummary.js';

describe('bars', () => {
  it('scales both from S$0 to the larger amount', () => {
    expect(bars(77_247_800, 32_010_800)).toEqual({ a: 100, b: 41.4 });
    expect(bars(-1, 500)).toEqual({ a: 0, b: 100 });
  });
});

describe('cashCard', () => {
  const a = { cashRequiredAtPurchaseCents: 16_459_900 };
  const b = { cashRequiredAtPurchaseCents: 23_859_500 };
  it('says how much of each path the savings cover', () => {
    const card = cashCard(a, b, 40_000);
    expect(card.bothShort).toBe(true);
    expect(card.rows[0]).toMatchObject({ coveredPct: 24, shortText: 'S$125,000 short', text: 'S$40,000 of S$165,000 covered' });
  });
  it('is covered when the savings are enough, and absent without savings', () => {
    expect(cashCard(a, b, 300_000).anyShort).toBe(false);
    expect(cashCard(a, b, null)).toBeNull();
  });
});

describe('sideBySide', () => {
  const A = { netPositionCents: 77_247_800, cashRequiredAtPurchaseCents: 16_459_900, housingCashSpentCents: 45_079_800, totalGrantsCents: 1_000_000, timeline: { keyCollectionDate: '2031-04-01' } };
  const B = { netPositionCents: 32_010_800, cashRequiredAtPurchaseCents: 23_859_500, housingCashSpentCents: 65_780_600, totalGrantsCents: 9_000_000, timeline: { keyCollectionDate: '2027-01-01' } };
  const rows = sideBySide(A, B, 2041);
  const row = (id) => rows.find((r) => r.id === id);
  it('rounds to S$1,000 and names the path each row favours', () => {
    expect(row('net')).toMatchObject({ label: 'Net position in 2041', a: 'S$772,000', favours: 'a', diff: 'BTO ahead by S$452,000' });
    expect(row('cash')).toMatchObject({ favours: 'a', diff: 'BTO needs less by S$74,000' });
    expect(row('keys')).toMatchObject({ favours: 'b', diff: 'Resale 4 years 3 months sooner' });
  });
  it('never favours grants (D1)', () => {
    expect(row('grants')).toMatchObject({ favours: null, diff: 'S$80,000 more with resale' });
  });
});

describe('purchaseCard', () => {
  it('goes from the price to the cash, the other costs being the remainder', () => {
    const c = purchaseCard({ purchasePriceCents: 65_714_000, totalGrantsCents: 1_000_000, cpfUsedAtPurchaseCents: 600_000, loanPrincipalCents: 49_285_500, cashRequiredAtPurchaseCents: 16_459_900 });
    expect(c.otherCents).toBe(1_631_400);
    expect(c.lines).toMatchObject({ price: 'S$657,140', loan: '−S$492,855', other: '+S$16,314', cash: 'S$164,599' });
    expect(c.shares.loan + c.shares.aid + c.shares.cash).toBe(100);
    expect(c.hasPrice).toBe(true);
  });
  it('leaves out the price and the remainder when there is no price', () => {
    const c = purchaseCard({ totalGrantsCents: 1_000_000, cashRequiredAtPurchaseCents: 4_500_000 });
    expect(c.hasPrice).toBe(false);
    expect(c.otherCents).toBe(0);
  });
});

describe('versus and cashSentence', () => {
  it('compares a figure with the other path', () => {
    expect(versus(82_400_000, 65_714_000, 'BTO')).toBe('S$167,000 more than BTO');
    expect(versus(100, 100, 'BTO')).toBe('');
  });
  it('says which path needs more cash, and why', () => {
    const a = { cashCents: 16_459_900, grantsCents: 1_000_000, priceCents: 65_714_000 };
    const b = { cashCents: 23_859_500, grantsCents: 9_000_000, priceCents: 82_400_000 };
    expect(cashSentence(a, b)).toBe('Resale needs S$74,000 more cash up front, even with S$80,000 more in grants, because its price is S$167,000 higher.');
  });
});

describe('whatIfChanges', () => {
  it('lists only what moved', () => {
    const plan = { annualPriceGrowth: 0.03, applicationYear: 2027, btoPrice: null };
    expect(whatIfChanges({ ...plan, annualPriceGrowth: 0.045 }, plan)).toEqual(['flat price growth 3% → 4.5% a year']);
    expect(whatIfChanges(plan, plan)).toEqual([]);
  });
});

describe('priceFlip', () => {
  const cell = (p, i, winner) => ({ annualPriceGrowth: p, annualIncomeGrowth: i, winner });
  const result = {
    frontier: [{ annualPriceGrowth: 0.06, annualIncomeGrowth: 0.02 }, { annualPriceGrowth: 0.05, annualIncomeGrowth: 0.03 }],
    grid: [[cell(0.05, 0.02, 'A'), cell(0.07, 0.02, 'B')], [cell(0.04, 0.03, 'A'), cell(0.06, 0.03, 'B')]],
  };
  it('finds where the answer flips at the user\'s income growth, and who wins above it', () => {
    expect(priceFlip(result, 0.02)).toEqual({ atPct: 6, winnerAbove: 'Resale', approx: false });
  });
  it('uses the nearest income row tested, and says so', () => {
    expect(priceFlip(result, 0.028)).toEqual({ atPct: 5, winnerAbove: 'Resale', approx: true });
  });
  it('is null with no break-even line, or one outside the slider', () => {
    expect(priceFlip({ frontier: [], grid: [] }, 0.02)).toBeNull();
    expect(priceFlip({ frontier: [{ annualPriceGrowth: 0.09, annualIncomeGrowth: 0.02 }], grid: [] }, 0.02)).toBeNull();
  });
});
