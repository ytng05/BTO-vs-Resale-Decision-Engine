// D39 property tests: cash over valuation (COV). No expected amounts here: the exact figures come from seat 1's
// hand-worked case (cov-template.xlsx) in its own test. These compare runs of evaluate() with each other.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The repo-specific lines: the engine, the ruleset loader and the two fixture cases
// (E1 = resale Tampines 4-room at the median; E2 = the BTO case used by the existing exact-figure test).
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs;
const BTO_CASE = fixture.cases.find((c) => c.id.startsWith('E2')).inputs;

const ruleset = loadRuleset().ruleset;
const run = (fixture, choicePatch = {}) =>
  evaluate(fixture.profile, { ...fixture.choice, ...choicePatch }, fixture.assumptions, ruleset);

const OVERPAY_CENTS = 7_000_000; // S$70,000 above the median, in today's prices
const medianCents = E1.choice.marketValueAtKeysCents;

// Everything that depends on how the purchase is funded, and nothing that depends on the flat's worth.
const funding = (o) => ({
  affordability: o.affordability,
  loanPrincipalCents: o.loanPrincipalCents,
  cashRequiredAtPurchaseCents: o.cashRequiredAtPurchaseCents,
  cpfUsedAtPurchaseCents: o.cpfUsedAtPurchaseCents,
  outstandingLoanAtHorizonCents: o.outstandingLoanAtHorizonCents,
  cpfRefundPrincipalCents: o.cpfRefundPrincipalCents,
  housingCashSpentCents: o.housingCashSpentCents,
  costBreakdown: o.costBreakdown,
});

test('E1 is bought at the median (precondition for the COV tests)', () => {
  assert.equal(E1.choice.path, 'RESALE');
  assert.equal(E1.choice.purchasePriceCents, medianCents);
});

const atMedian = run(E1);
const overpaid = run(E1, { purchasePriceCents: medianCents + OVERPAY_CENTS });
// COV at purchase: the overpayment grown to the purchase date, the same way evaluate() grows prices (D31)
const covCents = overpaid.purchasePriceCents - atMedian.purchasePriceCents;

test('COV: the loan limit and the loan do not change', () => {
  assert.ok(covCents >= OVERPAY_CENTS, `COV at purchase (${covCents}) should be at least the overpayment`);
  assert.deepEqual(overpaid.affordability, atMedian.affordability);
  assert.equal(overpaid.loanPrincipalCents, atMedian.loanPrincipalCents);
  assert.equal(overpaid.outstandingLoanAtHorizonCents, atMedian.outstandingLoanAtHorizonCents);
});

test('COV: cash at purchase rises by at least the cash over valuation', () => {
  const rise = overpaid.cashRequiredAtPurchaseCents - atMedian.cashRequiredAtPurchaseCents;
  assert.ok(rise >= covCents, `cash at purchase rose by ${rise}, less than the COV of ${covCents}`);
  assert.ok(rise >= OVERPAY_CENTS);
});

test("COV: the flat's worth is the same and the net position falls by at least the COV", () => {
  assert.equal(overpaid.marketValueAtHorizonCents, atMedian.marketValueAtHorizonCents);
  assert.deepEqual(
    overpaid.yearlyCashFlow.map((y) => y.marketValueEndCents),
    atMedian.yearlyCashFlow.map((y) => y.marketValueEndCents),
  );
  const fall = atMedian.netPositionCents - overpaid.netPositionCents;
  assert.ok(fall >= covCents, `net position fell by ${fall}, less than the COV of ${covCents}`);
  assert.ok(fall >= OVERPAY_CENTS);
});

test('Paying below the median creates no COV: the valuation changes no funding figure', () => {
  // If any COV were charged, a price below the valuation would fund differently from a price equal to it.
  const lowCents = medianCents - 5_000_000; // S$50,000 below the median
  const belowMedian = run(E1, { purchasePriceCents: lowCents });
  const valuedAtPrice = run(E1, { purchasePriceCents: lowCents, marketValueAtKeysCents: lowCents });
  assert.deepEqual(funding(belowMedian), funding(valuedAtPrice));
});

test('BTO has no COV: a market value below the price changes no funding figure', () => {
  // Exact BTO figures are checked by the existing BTO test; this catches the valuation cap leaking into BTO.
  const asIs = run(BTO_CASE);
  const lowValue = run(BTO_CASE, { marketValueAtKeysCents: Math.round(BTO_CASE.choice.purchasePriceCents / 2) });
  assert.deepEqual(funding(lowValue), funding(asIs));
});
