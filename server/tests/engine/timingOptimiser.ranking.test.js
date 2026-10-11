// SEAT 1. Timing optimiser ranking with evaluate() replaced by fixed outcomes, so ties and skips can be set up
// exactly. Separate file because vi.mock replaces evaluate() for the whole file.
import { describe, it, expect, vi } from 'vitest';

// Net position per application year; 2027 and 2028 tie for the top
const NET = { 2026: 100, 2027: 300, 2028: 300, 2029: 200 };
vi.mock('../../src/engine/index.js', () => ({
  evaluate: (_profile, choice) => ({ netPositionCents: NET[choice.applicationYear], warnings: [] }),
}));

const { optimiseTiming } = await import('../../src/engine/solvers/timingOptimiser.js');

const args = {
  profile: { applicants: [] },
  choiceBase: { path: 'RESALE' },
  candidateYears: [2026, 2027, 2028, 2029],
  assumptions: { evaluationStartYear: 2026 },
  ruleset: {},
};

describe('timing optimiser ranking', () => {
  it('a tie goes to the earlier year', () => {
    expect(optimiseTiming(args).best.year).toBe(2027);
  });

  it('keeps all in candidate-year order, not ranked', () => {
    expect(optimiseTiming(args).all.map((r) => r.year)).toEqual([2026, 2027, 2028, 2029]);
  });
});
