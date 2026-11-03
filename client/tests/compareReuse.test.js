// createCompareReuse (api/client.js): /preview and /results share one /compare answer for the same inputs (#110).
import { describe, it, expect } from 'vitest';
import { createCompareReuse } from '../src/api/client.js';

const store = () => ({
  profile: {
    applicants: [{ id: 'a1', age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 }],
    cashSavings: 20000,
    constraints: { moveInByYear: null },
  },
  choiceA: { path: 'BTO', applicationYear: 2027, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD', btoProjectId: null, btoPrice: null, btoWaitMonths: null, renovation: 0 },
  choiceB: { path: 'RESALE', applicationYear: 2027, town: 'BEDOK', flatType: '4 ROOM', livingArrangement: 'NONE', leaseBand: '80-89', renovation: 0 },
  assumptions: { annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02, horizonYear: null, monthlyHousingCostWhileWaiting: 0, loanTenureYears: null, loanType: null, legalFees: null, agentFees: null },
});

function setup() {
  let calls = 0;
  let clock = 0;
  const reuse = createCompareReuse(async () => { calls += 1; return { n: calls }; }, { now: () => clock, keepMs: 1000 });
  return { reuse, calls: () => calls, tick: (ms) => { clock += ms; } };
}

describe('createCompareReuse', () => {
  it('asks once for the same inputs, one page after the other', async () => {
    const t = setup();
    const s = store();
    expect(await t.reuse(s)).toEqual({ n: 1 });
    expect(await t.reuse(s)).toEqual({ n: 1 });
    expect(t.calls()).toBe(1);
  });

  it('asks again when any input changes', async () => {
    const t = setup();
    const s = store();
    await t.reuse(s);
    s.choiceB.leaseBand = '70-79';
    expect(await t.reuse(s)).toEqual({ n: 2 });
  });

  it('asks again once the kept answer is too old', async () => {
    const t = setup();
    const s = store();
    await t.reuse(s);
    t.tick(1000);
    expect(await t.reuse(s)).toEqual({ n: 2 });
  });

  it('never keeps a failure: a retry asks again', async () => {
    let calls = 0;
    const reuse = createCompareReuse(async () => { calls += 1; if (calls === 1) throw new Error('offline'); return { ok: true }; });
    await expect(reuse(store())).rejects.toThrow('offline');
    expect(await reuse(store())).toEqual({ ok: true });
    expect(calls).toBe(2);
  });
});
