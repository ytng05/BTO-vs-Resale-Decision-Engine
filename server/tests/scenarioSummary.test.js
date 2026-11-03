// The summary fields My scenarios filters on (GET /api/scenarios), from a saved scenario's inputs and result.
import { describe, it, expect } from 'vitest';
import { scenarioSummary } from '../src/services/scenarioSummary.js';

const choiceA = { town: 'TAMPINES', flatType: '4 ROOM' };
const choiceB = { town: 'BEDOK', flatType: '5 ROOM' };
const result = {
  gapBreakdown: { marginCents: 1_250_000 },
  resolvedA: { purchasePriceCents: 54_050_000 },
  resolvedB: { purchasePriceCents: 68_000_000 },
  outcomeA: { purchasePriceCents: 55_671_500 },
  outcomeB: { purchasePriceCents: 70_040_000 },
};

describe('scenarioSummary', () => {
  it('takes both towns, both flat types, the path ahead and today\'s prices', () => {
    expect(scenarioSummary({ choiceA, choiceB, result })).toEqual({
      btoTown: 'TAMPINES',
      btoFlatType: '4 ROOM',
      resaleTown: 'BEDOK',
      resaleFlatType: '5 ROOM',
      ahead: 'A',
      btoPriceCents: 54_050_000,
      resalePriceCents: 68_000_000,
    });
  });

  it.each([
    [-1, 'B'],
    [0, 'TIE'],
  ])('margin %i means %s is ahead', (marginCents, ahead) => {
    expect(scenarioSummary({ choiceA, choiceB, result: { gapBreakdown: { marginCents } } }).ahead).toBe(ahead);
  });

  it('falls back to the outcome prices for a scenario saved before resolvedA/B existed', () => {
    const old = { gapBreakdown: result.gapBreakdown, outcomeA: result.outcomeA, outcomeB: result.outcomeB };
    const summary = scenarioSummary({ choiceA, choiceB, result: old });
    expect(summary.btoPriceCents).toBe(55_671_500);
    expect(summary.resalePriceCents).toBe(70_040_000);
  });

  it('gives nulls, not errors, for a scenario saved without a result or with empty choices', () => {
    expect(scenarioSummary({ choiceA: { town: '', flatType: null }, choiceB: {} })).toEqual({
      btoTown: null,
      btoFlatType: null,
      resaleTown: null,
      resaleFlatType: null,
      ahead: null,
      btoPriceCents: null,
      resalePriceCents: null,
    });
    expect(scenarioSummary().ahead).toBeNull();
  });
});
