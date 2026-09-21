// SEAT 1. Properties to test: determinism (same inputs, same output), no mutation of inputs,
// and known small cases worked by hand.
import { describe, it } from 'vitest';

describe('timing optimiser', () => {
  it.todo('returns a non-endpoint year when the grant tier steps make the objective non-monotonic');
  it.todo('is deterministic');
});

describe('break-even solver', () => {
  it.todo('returns a frontier curve, not a single point');
  it.todo('grid winner flips across the frontier');
});

describe('strategy search', () => {
  it.todo('prunes infeasible choices early');
  it.todo('returns a ranked top 3 with reasons taken from engine outputs');
});

describe('backtest (later, FEATURE_BACKTEST)', () => {
  it.todo('replays every rolling window and reports a range, not a probability');
});
