// SEAT 1. Timing optimiser properties. No hand-worked values: every expectation is structural or checked against
// evaluate() itself, which has its own hand-worked fixture (evaluate.json). Scenarios reuse that fixture's household.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';
import { optimiseTiming } from '../../src/engine/solvers/timingOptimiser.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);
const ruleset = loadRuleset().ruleset;
const [E1, E2] = fixture.cases;

// E1's resale flat, bought in any of 2026-2029, measured at 2035
const resale = {
  profile: E1.inputs.profile,
  choiceBase: E1.inputs.choice,
  candidateYears: [2026, 2027, 2028, 2029],
  assumptions: { ...E1.inputs.assumptions, horizonYear: 2035 },
  ruleset,
};
const resaleBefore = structuredClone(resale); // snapshot before any optimiser call

const outcomeFor = (args, year) =>
  evaluate(args.profile, { ...args.choiceBase, applicationYear: year }, args.assumptions, args.ruleset);
const hasWarning = (outcome, code) => outcome.warnings.includes(code);

describe('timing optimiser', () => {
  let result;
  beforeAll(() => {
    result = optimiseTiming(resale);
  });

  it('evaluates every kept year with only applicationYear changed', () => {
    expect(result.all.map((r) => r.year)).toEqual(resale.candidateYears);
    for (const { year, outcome } of result.all) {
      expect(outcome).toEqual(outcomeFor(resale, year));
    }
    expect(result.skipped).toEqual([]);
  });

  it('best is the highest net position, ties to the earlier year', () => {
    const top = Math.max(...result.all.map((r) => r.outcome.netPositionCents));
    const firstTop = result.all.find((r) => r.outcome.netPositionCents === top);
    expect(result.best).toEqual(firstTop);
  });

  it('skips years whose keys miss moveInByYear', () => {
    // E2's BTO waits 31 months: applying in 2026 / 2027 / 2028 gets keys in 2028 / 2029 / 2030
    const args = {
      profile: { ...E2.inputs.profile, constraints: { moveInByYear: 2029 } },
      choiceBase: E2.inputs.choice,
      candidateYears: [2026, 2027, 2028],
      assumptions: { ...E2.inputs.assumptions, horizonYear: 2035 },
      ruleset,
    };
    const { all, skipped, best } = optimiseTiming(args);
    expect(skipped).toEqual([{ year: 2028, reason: 'MOVE_IN_DEADLINE_MISSED' }]);
    expect(all.map((r) => r.year)).toEqual([2026, 2027]);
    expect(all.every((r) => !hasWarning(r.outcome, 'MOVE_IN_DEADLINE_MISSED'))).toBe(true);
    expect([2026, 2027]).toContain(best.year);
  });

  it('skips a cash shortfall only in the start year; later years keep it as a warning (D19)', () => {
    // No cash today: E1's $5,000 agent fee alone is a shortfall in every year
    const args = { ...resale, profile: { ...resale.profile, cashSavingsCents: 0 }, candidateYears: [2026, 2027, 2028] };
    const { all, skipped } = optimiseTiming(args);
    expect(skipped).toEqual([{ year: 2026, reason: 'CASH_SHORTFALL_AT_PURCHASE' }]);
    expect(all.map((r) => r.year)).toEqual([2027, 2028]);
    expect(all.every((r) => hasWarning(r.outcome, 'CASH_SHORTFALL_AT_PURCHASE'))).toBe(true);
  });

  it('returns best: null when every year is skipped', () => {
    const args = { ...resale, profile: { ...resale.profile, cashSavingsCents: 0 }, candidateYears: [2026] };
    const { best, all, skipped } = optimiseTiming(args);
    expect(best).toBeNull();
    expect(all).toEqual([]);
    expect(skipped).toEqual([{ year: 2026, reason: 'CASH_SHORTFALL_AT_PURCHASE' }]);
  });

  it.each([
    ['empty', []],
    ['not ascending', [2028, 2027]],
    ['repeated', [2027, 2027]],
    ['not a whole year', [2027.5]],
    ['before the start year', [2025, 2026]],
  ])('rejects candidateYears that are %s', (_label, candidateYears) => {
    expect(() => optimiseTiming({ ...resale, candidateYears })).toThrow(RangeError);
  });

  it('is deterministic and does not mutate its inputs', () => {
    expect(optimiseTiming(resale)).toEqual(result);
    expect(resale).toEqual(resaleBefore);
  });

  // Needs D1 settled first: under the current measure, a year with FEWER grants can come out best,
  // because a grant counts as a CPF refund debt with no matching OA asset. See the D1 note.
  it.todo('returns a non-endpoint year when the grant tier steps make the objective non-monotonic (hand-picked case)');
});
