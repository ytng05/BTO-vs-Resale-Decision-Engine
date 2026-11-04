// "How each purchase is paid" against the real engine on seat 1's hand-worked cases (E1 resale, E2 BTO, E3 = E1 bought
// S$70,000 above the median, D39). The card's "Stamp duty, fees and other costs" line is a remainder: cash − (price −
// grants − CPF − loan). These check that the remainder is never negative and is exactly the stamp duty, legal and agent
// fees in the engine's own cost breakdown, so grants are not taken off twice (cpfUsedAtPurchaseCents is own OA only)
// and nothing else hides in it. The expected figure is the engine's costBreakdown, whose values seat 1's tests pin to
// the hand-worked sheets; this test does not invent any figure.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../server/src/engine/index.js';
import { loadRuleset } from '../../server/src/engine/rules/loadRuleset.js';
import { purchaseCard } from '../src/utils/dashboardSummary.js';

const fixture = JSON.parse(readFileSync(new URL('../../server/src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const ruleset = loadRuleset().ruleset;
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs;
const E2 = fixture.cases.find((c) => c.id.startsWith('E2')).inputs;

const cases = [
  ['E1, resale', E1],
  ['E2, BTO', E2],
  ['E3, resale above the valuation', { ...E1, choice: { ...E1.choice, purchasePriceCents: 62_000_000 } }],
];

describe.each(cases)('purchaseCard on %s', (_name, c) => {
  const o = evaluate(c.profile, c.choice, c.assumptions, ruleset);
  const card = purchaseCard(o);
  const fees = ['BSD', 'LEGAL', 'AGENT'].reduce((sum, id) => sum + (o.costBreakdown.find((l) => l.id === id)?.amountCents ?? 0), 0);

  it('has a price, and the other-costs line is not negative', () => {
    expect(card.hasPrice).toBe(true);
    expect(card.otherCents).toBeGreaterThanOrEqual(0);
  });

  it('the other-costs line is exactly stamp duty + legal + agent fees', () => {
    expect(card.otherCents).toBe(fees);
  });

  it('every grant in these cases is used on the flat, so the grants line is the total and nothing is left over', () => {
    expect(card.grantsCents).toBe(o.totalGrantsCents);
    expect(card.unusedGrantsCents).toBe(0);
  });
});
