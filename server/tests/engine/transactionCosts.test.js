// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/buyer-stamp-duty.json, worked in
// bsd-worked-template-v2.xlsx under D20), NOT from the code under test or from AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeBuyerStampDuty } from '../../src/engine/costs/transactionCosts.js';

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
