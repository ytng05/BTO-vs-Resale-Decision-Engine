// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/max-loan.json, worked in
// max-loan-template-v4.xlsx under the affordability note in evaluate.contract.js), NOT from the code
// under test or from AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeMaxLoan } from '../../src/engine/loan/affordability.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/max-loan.json', import.meta.url), 'utf8'),
);
const byId = (id) => fixture.cases.find((c) => c.id === id);

describe('computeMaxLoan: hand-worked cases', () => {
  it.each(fixture.cases.map((c) => [c.id, c]))('%s', (_id, c) => {
    expect(computeMaxLoan(c.inputs, fixture.ruleset)).toMatchObject(c.expected);
  });
});

describe('computeMaxLoan: conventions', () => {
  it('max loan is a whole number of dollars', () => {
    for (const c of fixture.cases.filter((x) => 'maxLoanCents' in x.expected)) {
      expect(computeMaxLoan(c.inputs, fixture.ruleset).maxLoanCents % 100).toBe(0);
    }
  });

  it('a bank loan reports a TDSR loan; an HDB loan does not', () => {
    expect(computeMaxLoan(byId('A3-bank-30-years').inputs, fixture.ruleset).tdsrLoanCents).toEqual(expect.any(Number));
    expect(computeMaxLoan(byId('A1-hdb-ltv-binds').inputs, fixture.ruleset).tdsrLoanCents).toBeNull();
  });

  it.each(['A5-hdb-short-lease', 'A6-hdb-float-check'])('%s: LTV pro-rated below 95', (id) => {
    const { expected, inputs } = byId(id);
    const out = computeMaxLoan(inputs, fixture.ruleset);
    expect(out.ltvProrated).toBe(true);
    expect(out.ltvApplied).toBe(expected.ltvApplied);
    expect(out.ltvLoanCents).toBe(expected.ltvLoanCents);
    expect(out.maxLoanCents).toBe(expected.maxLoanCents);
  });

  it('throws, naming the key, when leaseProRating.percentPerYearShort is missing', () => {
    const ruleset = structuredClone(fixture.ruleset);
    delete ruleset.loans.ltv.hdbLoan.leaseProRating.percentPerYearShort;
    expect(() => computeMaxLoan(byId('A5-hdb-short-lease').inputs, ruleset)).toThrow(
      'loans.ltv.hdbLoan.leaseProRating.percentPerYearShort',
    );
  });

  it('throws when an HDB loan has no numeric loanRate, rather than assessing at the floor', () => {
    expect(() => computeMaxLoan({ ...byId('A1-hdb-ltv-binds').inputs, loanRate: null }, fixture.ruleset)).toThrow(RangeError);
  });

  // The fixture keeps its own copy so a ruleset update can't silently change the expected values; this test
  // makes such an update fail loudly instead, so the hand-worked cases get re-checked.
  it('live ruleset loan keys equal the fixture copy', () => {
    expect(loadRuleset().ruleset.loans).toMatchObject(fixture.ruleset.loans);
  });
});
