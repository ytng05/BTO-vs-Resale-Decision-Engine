// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/buyer-stamp-duty.json, worked in
// bsd-worked-template-v2.xlsx under D20), NOT from the code under test or from AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeBuyerStampDuty } from '../../src/engine/costs/transactionCosts.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/buyer-stamp-duty.json', import.meta.url), 'utf8'),
);

// The fixture's own copy of the tiers, in the ruleset's shape, so a ruleset update can't change these results.
const ruleset = { transactionCosts: { buyerStampDutyTiers: fixture.tiers } };

describe('computeBuyerStampDuty: hand-worked fixture cases', () => {
  it.each(fixture.cases.map((c) => [c.id, c]))('%s', (_id, c) => {
    expect(computeBuyerStampDuty(c.priceCents, ruleset)).toBe(c.expectedBsdCents);
  });
});

describe('computeBuyerStampDuty: input guard', () => {
  it.each([0, -100, NaN, undefined, null, 12.5, '55000000'])('throws for %s', (bad) => {
    expect(() => computeBuyerStampDuty(bad, ruleset)).toThrow(RangeError);
  });
});

describe('buyer stamp duty tiers: fixture vs live ruleset', () => {
  // The fixture keeps its own copy of the tiers so the hand-worked values can't drift. This test makes a
  // rate change in the live ruleset fail loudly, forcing the cases to be re-worked by hand (D20).
  it('the live ruleset tiers equal the fixture tiers the cases were worked against', () => {
    expect(loadRuleset().ruleset.transactionCosts.buyerStampDutyTiers).toEqual(fixture.tiers);
  });
});

