// SEAT 1 (D36). Household income ceilings, checked at the HFE application (seat 2's ruleset keys, #78):
// a new flat needs income at or below eligibility.newFlatIncomeCeiling.family, an HDB loan at or below
// loans.hdbLoanIncomeCeiling.family. Rule tests only: thresholds come from the ruleset, no money figures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { optimiseTiming } from '../../src/engine/solvers/timingOptimiser.js';
import { WARNINGS } from '../../src/engine/evaluate.contract.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);
const merge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
};
const ruleset = merge(loadRuleset().ruleset, fixture.rulesetOverrides);
const NEW_FLAT_CEILING_CENTS = ruleset.eligibility.newFlatIncomeCeiling.family * 100;
const HDB_LOAN_CEILING_CENTS = ruleset.loans.hdbLoanIncomeCeiling.family * 100;

const caseById = (id) => fixture.cases.find((c) => c.id === id);
const BTO = caseById('E2-bto-standard-hdb-loan'); // applies in 2026, the start year
const RESALE = caseById('E1-resale-hdb-loan'); // buys in 2027, a year after the start

// Run a fixture case with the household's total monthly income (cents) split across the two buyers.
function run(c, householdCents, { growth = 0, rules = ruleset, applicationYear } = {}) {
  const half = Math.floor(householdCents / 2);
  const [a, b] = c.inputs.profile.applicants;
  const profile = {
    ...c.inputs.profile,
    applicants: [{ ...a, monthlyIncomeCents: half }, { ...b, monthlyIncomeCents: householdCents - half }],
  };
  const choice = { ...c.inputs.choice, ...(applicationYear ? { applicationYear } : {}) };
  return evaluate(profile, choice, { ...c.inputs.assumptions, annualIncomeGrowth: growth, horizonYear: 2045 }, rules);
}
const has = (outcome, code) => outcome.warnings.includes(code);

describe('income ceilings (D36)', () => {
  it('reads both ceilings from the ruleset', () => {
    expect(Number.isInteger(NEW_FLAT_CEILING_CENTS) && NEW_FLAT_CEILING_CENTS > 0).toBe(true);
    expect(Number.isInteger(HDB_LOAN_CEILING_CENTS) && HDB_LOAN_CEILING_CENTS > 0).toBe(true);
  });

  it('BTO: at the ceiling is allowed; one cent above, neither the flat nor the HDB loan is', () => {
    const at = run(BTO, NEW_FLAT_CEILING_CENTS);
    expect(has(at, WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE)).toBe(false);
    expect(has(at, WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(false);

    const above = run(BTO, Math.max(NEW_FLAT_CEILING_CENTS, HDB_LOAN_CEILING_CENTS) + 1);
    expect(has(above, WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE)).toBe(true);
    expect(has(above, WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(true);
  });

  it('resale: the new-flat ceiling never applies; above the HDB loan ceiling it warns about the loan', () => {
    expect(has(run(RESALE, HDB_LOAN_CEILING_CENTS), WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(false);
    const above = run(RESALE, HDB_LOAN_CEILING_CENTS + 1);
    expect(has(above, WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(true);
    expect(has(above, WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE)).toBe(false);
  });

  it('checks income projected to the application year, not today\'s', () => {
    // Resale buys a year after the start: below the ceiling today, above it after a year of 5% growth.
    const today = HDB_LOAN_CEILING_CENTS - 40000; // S$400 under
    expect(has(run(RESALE, today, { growth: 0 }), WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(false);
    expect(has(run(RESALE, today, { growth: 0.05 }), WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(true);
  });

  it('follows the ruleset: a higher ceiling lifts the warning', () => {
    const higher = merge(ruleset, {
      eligibility: { newFlatIncomeCeiling: { family: 20000 } },
      loans: { hdbLoanIncomeCeiling: { family: 20000 } },
    });
    const outcome = run(BTO, NEW_FLAT_CEILING_CENTS + 1, { rules: higher });
    expect(has(outcome, WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE)).toBe(false);
    expect(has(outcome, WARNINGS.HDB_LOAN_INCOME_CEILING_BREACHED)).toBe(false);
  });

  it('only warns: the outcome is still worked out', () => {
    const outcome = run(BTO, NEW_FLAT_CEILING_CENTS + 1);
    expect(Number.isInteger(outcome.netPositionCents)).toBe(true);
  });

  it('timing: skips BTO application years once projected income passes the new-flat ceiling', () => {
    // 2% growth from just under the ceiling: 2026 and 2027 are under it, 2028 and 2029 over it.
    const household = NEW_FLAT_CEILING_CENTS - 50000; // S$500 under in 2026
    const half = Math.floor(household / 2);
    const [a, b] = BTO.inputs.profile.applicants;
    const result = optimiseTiming({
      profile: { ...BTO.inputs.profile, applicants: [{ ...a, monthlyIncomeCents: half }, { ...b, monthlyIncomeCents: household - half }] },
      choiceBase: BTO.inputs.choice,
      candidateYears: [2026, 2027, 2028, 2029],
      assumptions: { ...BTO.inputs.assumptions, annualIncomeGrowth: 0.02, horizonYear: 2045 },
      ruleset,
    });
    expect(result.all.map((e) => e.year)).toEqual([2026, 2027]);
    expect(result.skipped).toEqual([
      { year: 2028, reason: WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE },
      { year: 2029, reason: WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE },
    ]);
  });
});
