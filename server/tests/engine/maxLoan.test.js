// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/max-loan.json, worked in
// max-loan-template-v3.xlsx under the affordability note in evaluate.contract.js), NOT from the code
// under test or from AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeMaxLoan } from '../../src/engine/loan/affordability.js';

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

  it.todo('A5: LTV pro-rated below 95 (ltvApplied, ltvLoanCents, maxLoanCents) once seat 2 supplies the formula');
  it.todo('live ruleset loan keys equal the fixture copy, once seat 2 adds hdbLoanTenure and stressTestRate');
});
