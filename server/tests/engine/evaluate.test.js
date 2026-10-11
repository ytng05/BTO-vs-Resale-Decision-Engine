// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/evaluate.json, worked in
// evaluate-template.xlsx under the contract v2 notes and D28–D32), NOT from the code under test or from
// AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);

// Live ruleset plus the fixture's overrides (keys not yet merged, and D28/D30 assumptions).
const merge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
};
const ruleset = merge(loadRuleset().ruleset, fixture.rulesetOverrides);

const run = (c) => evaluate(c.inputs.profile, c.inputs.choice, c.inputs.assumptions, ruleset);

// TODO(#41): un-skip with evaluate() v2. The v2 fixture (per-buyer retention, BTO grants at signing)
// lands first, so these stay skipped until the code that matches it is in.
describe.skip.each(fixture.cases.map((c) => [c.id, c]))('evaluate: %s', (_id, c) => {
  it('headline figures, timeline, affordability and warnings', () => {
    expect(run(c)).toMatchObject(c.expected);
  });

  it('grants by id', () => {
    const byId = Object.fromEntries(run(c).grants.map((g) => [g.id, g.amountCents]));
    expect(byId).toEqual(c.expectedGrants);
  });

  it('cost breakdown lines', () => {
    const lines = run(c).costBreakdown;
    for (const want of c.expectedCostLines) {
      expect(lines.find((l) => l.id === want.id)).toMatchObject(want);
    }
  });

  it('yearly cash flow, every row', () => {
    expect(run(c).yearlyCashFlow).toEqual(c.expectedYearlyCashFlow);
  });

  it('net position is the D1 sum of its parts', () => {
    const o = run(c);
    expect(o.netPositionCents).toBe(
      o.marketValueAtHorizonCents - o.outstandingLoanAtHorizonCents - o.cpfRefundPrincipalCents
        - o.cpfAccruedInterestCents - o.clawbackCents - o.housingCashSpentCents,
    );
  });
});

describe('evaluate: out of scope and missing ruleset keys', () => {
  const e1 = fixture.cases[0].inputs;

  it("throws for a 'BANK' loan (not modelled yet, D32)", () => {
    const assumptions = { ...e1.assumptions, loanType: 'BANK' };
    expect(() => evaluate(e1.profile, e1.choice, assumptions, ruleset)).toThrow(/D32/);
  });

  it.each([
    ['btoWaiting', 'monthsToAgreementForLease'],
    ['loans', 'hdbLoanOaRetention'],
  ])('throws, naming the key, when %s.%s is missing', (section, key) => {
    const broken = { ...ruleset, [section]: { ...ruleset[section] } };
    delete broken[section][key];
    expect(() => evaluate(e1.profile, e1.choice, e1.assumptions, broken)).toThrow(`${section}.${key}`);
  });
});
