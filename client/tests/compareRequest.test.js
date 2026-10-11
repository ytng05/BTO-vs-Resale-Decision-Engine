// toCompareRequest: the one place the store's dollars become the contract's cents (D14).
import { describe, it, expect } from 'vitest';
import { toCompareRequest } from '../src/api/client.js';

const plan = (overrides = {}) => ({
  profile: { applicants: [], cashSavings: 20000 },
  choiceA: { path: 'BTO', town: 'TAMPINES', flatType: '4 ROOM' },
  choiceB: { path: 'RESALE', town: 'BEDOK', flatType: '4 ROOM' },
  assumptions: { priceGrowth: 0.03, incomeGrowth: 0.02 },
  ...overrides,
});

describe('toCompareRequest: rent while waiting and renovation (contract v2)', () => {
  it('sends rent as monthlyHousingCostWhileWaitingCents and renovation as renovationCents per choice', () => {
    const req = toCompareRequest(plan({
      choiceA: { path: 'BTO', town: 'TAMPINES', renovation: 60000 },
      choiceB: { path: 'RESALE', town: 'BEDOK', renovation: 30000 },
      assumptions: { priceGrowth: 0.03, incomeGrowth: 0.02, monthlyHousingCostWhileWaiting: 2500 },
    }));
    expect(req.assumptions.monthlyHousingCostWhileWaitingCents).toBe(250_000);
    expect(req.choiceA).toEqual({ path: 'BTO', town: 'TAMPINES', renovationCents: 6_000_000 });
    expect(req.choiceB.renovationCents).toBe(3_000_000);
  });

  it('defaults both to 0 when the plan leaves them out', () => {
    const req = toCompareRequest(plan());
    expect(req.assumptions.monthlyHousingCostWhileWaitingCents).toBe(0);
    expect(req.choiceA.renovationCents).toBe(0);
    expect(req.choiceB.renovationCents).toBe(0);
    expect(req.choiceA).not.toHaveProperty('renovation'); // dollars never leave the browser
  });
});