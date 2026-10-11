// SEAT 1. Properties to test: determinism (same inputs, same output), no mutation of inputs,
// and known small cases worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';
import { solveBreakEven } from '../../src/engine/solvers/breakEven.js';

// Timing optimiser tests: timingOptimiser.test.js and timingOptimiser.ranking.test.js

// Break-even properties. No hand-worked values: every expectation is either structural or checked
// against evaluate() itself, which has its own hand-worked fixture (evaluate.json).
// Scenario: the evaluate fixture's household, A = E2's BTO, B = E1's resale, one horizon. E2's BTO
// market value is lowered to $420,000 so the winner changes inside the grid (with E2's $600,000, A
// wins every cell); B applies a year after A.
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
const [E1, E2] = fixture.cases;

const STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];
const crossing = {
  profile: E1.inputs.profile,
  choiceA: { ...E2.inputs.choice, applicationYear: 2028, marketValueAtKeysCents: 42_000_000 },
  choiceB: { ...E1.inputs.choice, applicationYear: 2029 },
  assumptionsBase: { ...E1.inputs.assumptions, horizonYear: 2036 },
  priceGrowthSteps: STEPS,
  incomeGrowthSteps: STEPS,
  ruleset,
};
const crossingBefore = structuredClone(crossing); // snapshot before any solver call
const oneSided = { ...crossing, choiceA: { ...crossing.choiceA, marketValueAtKeysCents: 60_000_000 } };

// Margin straight from evaluate(), independent of the solver
const marginAt = (args, annualPriceGrowth, annualIncomeGrowth) => {
  const a = { ...args.assumptionsBase, annualPriceGrowth, annualIncomeGrowth };
  return evaluate(args.profile, args.choiceA, a, args.ruleset).netPositionCents
    - evaluate(args.profile, args.choiceB, a, args.ruleset).netPositionCents;
};
const winnerOf = (marginCents) => (marginCents > 0 ? 'A' : marginCents < 0 ? 'B' : 'TIE');

// Close to 0 on the frontier: $100. Near it the margin moves about $10,000 per percentage point of
// price growth, and the grid cells either side of it are thousands of dollars apart.
const FRONTIER_TOLERANCE_CENTS = 10_000;

describe('break-even solver', () => {
  let result;
  beforeAll(() => {
    result = solveBreakEven(crossing);
  });

  it('returns the contract grid: rows are income growth, columns are price growth', () => {
    expect(result.grid).toHaveLength(STEPS.length);
    result.grid.forEach((row, r) => {
      expect(row).toHaveLength(STEPS.length);
      row.forEach((cell, c) => {
        expect(Object.keys(cell).sort()).toEqual(['annualIncomeGrowth', 'annualPriceGrowth', 'marginCents', 'winner']);
        expect(cell.annualIncomeGrowth).toBe(STEPS[r]);
        expect(cell.annualPriceGrowth).toBe(STEPS[c]);
      });
    });
  });

  it('each cell is evaluate(A) − evaluate(B) at that cell, with the matching winner', () => {
    for (const row of result.grid) {
      for (const cell of row) {
        const margin = marginAt(crossing, cell.annualPriceGrowth, cell.annualIncomeGrowth);
        expect(cell.marginCents).toBe(margin);
        expect(Number.isSafeInteger(cell.marginCents)).toBe(true);
        expect(cell.winner).toBe(winnerOf(margin));
      }
    }
  });

  it('returns a frontier curve, not a single point', () => {
    expect(result.frontier.length).toBeGreaterThan(1);
    expect(new Set(result.frontier.map((p) => p.annualIncomeGrowth)).size).toBeGreaterThan(1);
    for (const p of result.frontier) {
      expect(Object.keys(p).sort()).toEqual(['annualIncomeGrowth', 'annualPriceGrowth']);
      expect(STEPS).toContain(p.annualIncomeGrowth);
      expect(p.annualPriceGrowth).toBeGreaterThanOrEqual(STEPS[0]);
      expect(p.annualPriceGrowth).toBeLessThanOrEqual(STEPS.at(-1));
    }
  });

  it('frontier is ordered by income growth, then price growth', () => {
    const key = (p) => [p.annualIncomeGrowth, p.annualPriceGrowth];
    const sorted = [...result.frontier].sort((p, q) => key(p)[0] - key(q)[0] || key(p)[1] - key(q)[1]);
    expect(result.frontier).toEqual(sorted);
  });

  it('grid winner flips across the frontier', () => {
    for (const p of result.frontier) {
      const row = result.grid[STEPS.indexOf(p.annualIncomeGrowth)];
      const below = row.filter((cell) => cell.annualPriceGrowth < p.annualPriceGrowth).at(-1);
      const above = row.find((cell) => cell.annualPriceGrowth > p.annualPriceGrowth);
      expect(below && above).toBeTruthy();
      expect(below.winner).not.toBe(above.winner);
    }
  });

  it('every winner change along a row has a frontier point between the two cells', () => {
    result.grid.forEach((row) => {
      for (let c = 1; c < row.length; c += 1) {
        const [left, right] = [row[c - 1], row[c]];
        if (left.winner === right.winner) continue;
        const between = result.frontier.filter((p) => p.annualIncomeGrowth === left.annualIncomeGrowth
          && p.annualPriceGrowth >= left.annualPriceGrowth && p.annualPriceGrowth <= right.annualPriceGrowth);
        expect(between.length).toBeGreaterThan(0);
      }
    });
  });

  it('margin is close to 0 on the frontier', () => {
    for (const p of result.frontier) {
      const margin = marginAt(crossing, p.annualPriceGrowth, p.annualIncomeGrowth);
      expect(Math.abs(margin)).toBeLessThanOrEqual(FRONTIER_TOLERANCE_CENTS);
    }
  });

  it('has no frontier when one path wins every cell', () => {
    const { grid, frontier } = solveBreakEven(oneSided);
    expect(frontier).toEqual([]);
    expect(new Set(grid.flat().map((cell) => cell.winner))).toEqual(new Set(['A']));
  });

  it('is deterministic and does not mutate its inputs', () => {
    expect(solveBreakEven(crossing)).toEqual(result);
    expect(crossing).toEqual(crossingBefore);
  });
});

describe('strategy search', () => {
  it.todo('prunes infeasible choices early');
  it.todo('returns a ranked top 3 with reasons taken from engine outputs');
});

describe('backtest (later, FEATURE_BACKTEST)', () => {
  it.todo('replays every rolling window and reports a range, not a probability');
});
