// SEAT 1. D39 exact figures: E1 bought at S$620,000 today (S$638,600 in 2027) for a flat valued at the median,
// S$550,000 today (S$566,500 in 2027). Expected values come from seat 1's hand-worked case
// (cov-template.xlsx, 2026-10-31), NOT from the code under test or from AI-generated output.
// Rows 18 and 20 (own CPF refund, net position) are provisional until "E1 monthly" is re-run.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';
import { WARNINGS } from '../../src/engine/evaluate.contract.js';

const fixture = JSON.parse(readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs;
const ruleset = loadRuleset().ruleset;

describe('evaluate: E3, resale bought S$70,000 above the median (cash over valuation, D39)', () => {
  let o;
  beforeAll(() => {
    o = evaluate(E1.profile, { ...E1.choice, purchasePriceCents: 62_000_000 }, E1.assumptions, ruleset);
  });
  const line = (id) => o.costBreakdown.find((l) => l.id === id);

  it('the price paid is S$638,600 at purchase (S$620,000 grown 3% to 2027)', () => {
    expect(o.purchasePriceCents).toBe(63_860_000);
  });

  it('rows 3, 8, 9: max loan S$424,875 on the valuation (LTV binds), loan S$371,500, no shortfall', () => {
    expect(o.affordability).toMatchObject({
      maxLoanCents: 42_487_500, limitingRule: 'LTV',
      loanRequiredCents: 37_150_000, withinLimit: true, shortfallCents: 0,
    });
    expect(o.loanPrincipalCents).toBe(37_150_000);
  });

  it('row 5: grants S$125,000, unchanged by the price', () => {
    expect(o.totalGrantsCents).toBe(12_500_000);
  });

  it("rows 10-12: buyer's stamp duty S$13,758 on the price paid, from CPF; legal fees from CPF", () => {
    expect(line('BSD')).toMatchObject({ amountCents: 1_375_800, paidFrom: 'CPF' });
    expect(line('LEGAL')).toMatchObject({ amountCents: 250_000, paidFrom: 'CPF' });
  });

  it('row 13: CPF (own OA) used at purchase S$86,258', () => {
    expect(o.cpfUsedAtPurchaseCents).toBe(8_625_800);
  });

  it('rows 14-15: cash at purchase S$77,100 (COV S$72,100 + agent S$5,000), more than the S$50,000 saved', () => {
    expect(o.cashRequiredAtPurchaseCents).toBe(7_710_000);
    expect(o.warnings).toContain(WARNINGS.CASH_SHORTFALL_AT_PURCHASE);
  });

  it('rows 16-17: worth S$656,728.76 at the horizon (grown from the valuation); loan owed S$316,150.11', () => {
    expect(o.marketValueAtHorizonCents).toBe(65_672_876);
    expect(o.outstandingLoanAtHorizonCents).toBe(31_615_011);
  });

  it('row 19: housing cash spent to the horizon S$200,795.42', () => {
    expect(o.housingCashSpentCents).toBe(20_079_542);
  });

  it.todo('row 18: own CPF refund at the horizon (provisional S$123,715 + interest delta; re-run E1 monthly)');
  it.todo('row 20: net position at the horizon (provisional S$16,068.23 minus the same delta)');
});
