// toCompareRequest: the one place the store's dollars become the contract's cents (D14), contract v2/v2.1.
import { describe, it, expect } from 'vitest';
import { toCompareRequest } from '../src/api/client.js';

const store = (over = {}) => ({
  profile: {
    applicants: [{ id: 'a1', age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 }],
    cashSavings: 20000,
    constraints: { moveInByYear: null },
  },
  choiceA: { path: 'BTO', applicationYear: 2027, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD', btoProjectId: null, btoPrice: null, btoWaitMonths: null, renovation: 0 },
  choiceB: { path: 'RESALE', applicationYear: 2027, town: 'BEDOK', flatType: '4 ROOM', livingArrangement: 'NONE', leaseBand: '80-89', renovation: 0 },
  assumptions: { annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02, horizonYear: null, monthlyHousingCostWhileWaiting: 0, loanTenureYears: null, loanType: null, legalFees: null, agentFees: null },
  ...over,
});

describe('toCompareRequest (contract v2/v2.1)', () => {
  it('sends money in cents with the contract names', () => {
    const s = store();
    s.choiceA = { ...s.choiceA, btoProjectId: 'tampines-bliss', btoPrice: 540500, renovation: 60000 };
    s.choiceB.renovation = 30000;
    s.assumptions.monthlyHousingCostWhileWaiting = 2500;
    s.profile.constraints.moveInByYear = 2031;
    const req = toCompareRequest(s);
    expect(req.profile.applicants[0]).toEqual({ age: 30, citizenship: 'SC', firstTimer: true, monthlyIncomeCents: 500_000, cpfOaBalanceCents: 4_000_000 });
    expect(req.profile.constraints).toEqual({ moveInByYear: 2031 });
    expect(req.choiceA).toMatchObject({ btoProjectId: 'tampines-bliss', btoPriceCents: 54_050_000, renovationCents: 6_000_000 });
    expect(req.choiceB.renovationCents).toBe(3_000_000);
    expect(req.assumptions.monthlyHousingCostWhileWaitingCents).toBe(250_000);
  });

  it('sends a resale asking price in cents, and leaves it out when blank so the server uses the median (D39)', () => {
    const s = store();
    s.choiceB = { ...s.choiceB, resalePrice: 650000 };
    const req = toCompareRequest(s);
    expect(req.choiceB.resalePriceCents).toBe(65_000_000);
    expect(req.choiceB).not.toHaveProperty('resalePrice');
    for (const blank of [null, '']) {
      const t = store();
      t.choiceB = { ...t.choiceB, resalePrice: blank };
      expect(toCompareRequest(t).choiceB).not.toHaveProperty('resalePriceCents');
    }
  });

  it('never sends dollar fields, and leaves out optional fields that are not set', () => {
    const req = toCompareRequest(store());
    expect(req.choiceA).not.toHaveProperty('btoPrice');
    expect(req.choiceA).not.toHaveProperty('renovation');
    expect(req.choiceA).not.toHaveProperty('btoPriceCents'); // server uses the range midpoint (D26)
    expect(req.choiceA).not.toHaveProperty('btoProjectId');
    expect(req.assumptions).not.toHaveProperty('horizonYear'); // server default
    expect(req.assumptions).not.toHaveProperty('legalFeesCents');
    expect(req.assumptions.monthlyHousingCostWhileWaitingCents).toBe(0);
    expect(req.choiceA.renovationCents).toBe(0);
    expect(req.profile.constraints).toEqual({});
  });
});