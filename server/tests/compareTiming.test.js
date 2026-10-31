// POST /api/compare and POST /api/timing (seat 1). data.gov.sg is replaced by a small set of fake
// transactions, so these run offline. No hand-worked values: every expectation is structural, a rule from
// the contract (D7, D16, D17, D22, D26, D33), or checked against evaluate() itself, which has its own
// hand-worked fixture.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Fake resale transactions per town: three near-new (lease 90+), three in the 80s, one in the 60s.
// TENGAH has none (no resale stock); BEDOK's lookup fails as if data.gov.sg were down with nothing cached.
const tx = (price, lease) => ({ month: '2026-08', resale_price: String(price), floor_area_sqm: '93', remaining_lease: `${lease} years` });
const FAKE = {
  TAMPINES: [tx(700000, 95), tx(720000, 94), tx(740000, 93), tx(560000, 85), tx(580000, 84), tx(600000, 82), tx(450000, 65)],
  SEMBAWANG: [tx(520000, 96), tx(540000, 95), tx(430000, 75), tx(410000, 72)],
};
vi.mock('../src/services/datagov/resalePrice.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getResalePriceBasis: vi.fn(async ({ town, flatType, months, minLeaseYears, maxLeaseYears }) => {
      if (town === 'BEDOK') throw new Error('data.gov.sg unreachable');
      const lease = minLeaseYears !== undefined || maxLeaseYears !== undefined ? { leaseFilter: { minLeaseYears, maxLeaseYears } } : {};
      return {
        town, flatType, window: { from: '2025-09', to: '2026-08', months }, ...lease,
        ...actual.summariseResale(actual.filterByLease(FAKE[town] ?? [], { minLeaseYears, maxLeaseYears })),
        source: { name: 'fake' }, cached: true, stale: false, fetchedAt: '2026-10-01T00:00:00.000Z',
      };
    }),
  };
});

const { createApp } = await import('../src/app.js');
const { breakEvenSentence } = await import('../src/routes/analysis.js');
const { evaluate } = await import('../src/engine/index.js');
const { explainGap } = await import('../src/engine/explainGap.js');
const { WARNINGS } = await import('../src/engine/evaluate.contract.js');
const { WARNING_MESSAGES, warningMessagesFor } = await import('../src/services/warningMessages.js');
const { loadRuleset } = await import('../src/engine/rules/loadRuleset.js');
const { FEE_DEFAULTS, PRICE_GROWTH_STEPS, INCOME_GROWTH_STEPS, MAX_YEARS_AHEAD } = await import('../src/services/engineInputs.js');
const app = createApp();
const YEAR = new Date().getFullYear();

const profile = {
  applicants: [
    { age: 30, citizenship: 'SC', firstTimer: true, monthlyIncomeCents: 350000, cpfOaBalanceCents: 6000000 },
    { age: 31, citizenship: 'SC', firstTimer: true, monthlyIncomeCents: 350000, cpfOaBalanceCents: 5000000 },
  ],
  cashSavingsCents: 5000000,
};
const bto = { path: 'BTO', applicationYear: YEAR, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD' };
const resale = { path: 'RESALE', applicationYear: YEAR, town: 'TAMPINES', flatType: '4 ROOM', classification: null, leaseBand: '80-89', livingArrangement: 'NEAR' };
const assumptions = { annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02 };
const body = (over = {}) => ({ profile, choiceA: bto, choiceB: resale, assumptions, ...over });
const compare = (b) => request(app).post('/api/compare').send(b);

describe('POST /api/compare', () => {
  let res;
  beforeAll(async () => {
    res = await compare(body());
  });

  it('returns the whole grid, the frontier and both outcomes in one call', () => {
    expect(res.status).toBe(200);
    expect(res.body.grid).toHaveLength(INCOME_GROWTH_STEPS.length);
    res.body.grid.forEach((row) => expect(row).toHaveLength(PRICE_GROWTH_STEPS.length));
    expect(res.body.grid[0].map((c) => c.annualPriceGrowth)).toEqual(PRICE_GROWTH_STEPS); // includes falling prices
    expect(Array.isArray(res.body.frontier)).toBe(true);
    expect(typeof res.body.outcomeA.netPositionCents).toBe('number');
    expect(typeof res.body.outcomeB.netPositionCents).toBe('number');
    expect(res.body.rulesetVersion).toBe(loadRuleset().version);
    expect(res.body.breakEvenSentence).toMatch(/net financial position/);
    expect(res.body.breakEvenSentence).toMatch(/not a price forecast/);
  });

  it("the grid cell at the user's own growth rates is outcomeA minus outcomeB", () => {
    const cell = res.body.grid[INCOME_GROWTH_STEPS.indexOf(0.02)][PRICE_GROWTH_STEPS.indexOf(0.03)];
    expect(cell.marginCents).toBe(res.body.outcomeA.netPositionCents - res.body.outcomeB.netPositionCents);
  });

  it("widens the axes in 1-point steps so the user's own growth rates are on the heatmap (D33)", async () => {
    const r = await compare(body({ assumptions: { ...assumptions, annualPriceGrowth: -0.045, annualIncomeGrowth: 0.071 } }));
    expect(r.status).toBe(200);
    const prices = r.body.grid[0].map((c) => c.annualPriceGrowth);
    const incomes = r.body.grid.map((row) => row[0].annualIncomeGrowth);
    expect(prices).toEqual([-0.05, -0.04, -0.03, ...PRICE_GROWTH_STEPS]);
    expect(incomes).toEqual([...INCOME_GROWTH_STEPS, 0.06, 0.07, 0.08]);
  });

  it.each([
    ['a break-even line at the user\'s exact income growth', true, true, /With income growing 2\.5% a year, they are level at about 1\.5% price growth/],
    ['a line elsewhere on the heatmap, but not at the user\'s income growth', true, false, /With income growing 2\.5% a year, Path A .* every price growth .* lies at other income growth rates/],
    ['no line anywhere tested', false, false, /Under every combination tested/],
  ])('the sentence (unit): %s', (_name, gridHasLine, userRowHasLine, expected) => {
    const cell = (p, i, winner) => ({ annualPriceGrowth: p, annualIncomeGrowth: i, winner, marginCents: winner === 'A' ? 1 : -1 });
    const row = (i, crossing) => [cell(0.01, i, crossing ? 'B' : 'A'), cell(0.02, i, 'A')];
    const surface = { grid: [row(0.02, gridHasLine), row(0.03, false)], frontier: gridHasLine ? [{ annualPriceGrowth: 0.012, annualIncomeGrowth: 0.02 }] : [] };
    const userRow = { grid: [row(0.025, userRowHasLine)], frontier: userRowHasLine ? [{ annualPriceGrowth: 0.015, annualIncomeGrowth: 0.025 }] : [] };
    const sentence = breakEvenSentence(surface, userRow, { horizonYear: 2040, annualIncomeGrowth: 0.025, nameA: 'Path A (BTO)', nameB: 'Path B (resale)' });
    expect(sentence).toMatch(expected);
    expect(sentence).toMatch(/not a price forecast/);
  });

  it('BTO: newest Tampines project with 4-room flats, midpoint price, its wait, lease 99, near-new market value (D7, D16, D26, D33)', () => {
    const { btoProjectA, resolvedA } = res.body;
    expect(btoProjectA.id).toBe('tampines-bliss');
    expect(resolvedA.purchasePriceCents).toBe(Math.round((btoProjectA.priceMinCents + btoProjectA.priceMaxCents) / 2));
    expect(resolvedA.btoWaitMonths).toBe(btoProjectA.waitMonths);
    expect(resolvedA.remainingLeaseYears).toBe(99);
    expect(resolvedA.marketValueAtKeysCents).toBe(72000000); // median of the three 90+ year sales
    expect(resolvedA.marketValueData.leaseFilter).toEqual({ minLeaseYears: 90 });
    expect(res.body.btoProjectB).toBeNull();
  });

  it("resale: median of the lease band's sales, band's lower bound as the lease (D16)", () => {
    const { resolvedB } = res.body;
    expect(resolvedB.purchasePriceCents).toBe(58000000); // median of the three 80-89 year sales
    expect(resolvedB.marketValueAtKeysCents).toBe(58000000);
    expect(resolvedB.medianPriceCents).toBe(58000000); // no asking price: pays the median
    expect(resolvedB.remainingLeaseYears).toBe(80);
    expect(resolvedB.priceData.fellBackToAllLeases).toBe(false);
  });

  it('fills defaults and echoes them: horizon = later keys + 10, HDB loan, 25 years, rent 0, start year = this year (D17, D22, D33)', () => {
    const keyYearA = YEAR + Math.floor(res.body.resolvedA.btoWaitMonths / 12);
    expect(res.body.horizonYear).toBe(Math.max(keyYearA, YEAR) + 10);
    expect(res.body.assumptions).toMatchObject({
      loanType: 'HDB', loanTenureYears: 25, monthlyHousingCostWhileWaitingCents: 0, evaluationStartYear: YEAR,
    });
  });

  it('fee defaults differ by path; a fee in the request applies to both (D17, D33)', async () => {
    expect(res.body.resolvedA).toMatchObject(FEE_DEFAULTS.BTO);
    expect(res.body.resolvedB).toMatchObject(FEE_DEFAULTS.RESALE);
    const fee = (o, id) => o.costBreakdown.find((l) => l.id === id).amountCents;
    expect(fee(res.body.outcomeB, 'AGENT')).toBe(FEE_DEFAULTS.RESALE.agentFeesCents);
    expect(fee(res.body.outcomeA, 'AGENT')).toBe(FEE_DEFAULTS.BTO.agentFeesCents);

    const own = await compare(body({ assumptions: { ...assumptions, legalFeesCents: 300000, agentFeesCents: 100000 } }));
    expect(own.body.resolvedA).toMatchObject({ legalFeesCents: 300000, agentFeesCents: 100000 });
    expect(own.body.resolvedB).toMatchObject({ legalFeesCents: 300000, agentFeesCents: 100000 });
    expect(fee(own.body.outcomeA, 'LEGAL')).toBe(300000);
  });

  it('returns the gap breakdown of the two outcomes (D34): 11 lines that sum to outcomeA minus outcomeB', () => {
    const gap = res.body.gapBreakdown;
    expect(gap).toEqual(explainGap(res.body.outcomeA, res.body.outcomeB));
    expect(gap.horizonYear).toBe(res.body.horizonYear);
    expect(gap.marginCents).toBe(res.body.outcomeA.netPositionCents - res.body.outcomeB.netPositionCents);
    expect(gap.lines.map((l) => l.id)).toEqual([
      'MARKET_VALUE', 'LOAN_OWED', 'CPF_PRINCIPAL', 'CPF_INTEREST', 'CLAWBACK',
      'RENT_WHILE_WAITING', 'RENOVATION', 'BSD', 'LEGAL', 'AGENT', 'CASH_PURCHASE',
    ]);
    expect(gap.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(gap.marginCents);
    expect(gap.totalGrants).toEqual({ aCents: res.body.outcomeA.totalGrantsCents, bCents: res.body.outcomeB.totalGrantsCents });
  });

  it('returns a plain-English message for each warning code in either outcome, and no others', () => {
    const codes = new Set([...res.body.outcomeA.warnings, ...res.body.outcomeB.warnings]);
    expect(new Set(Object.keys(res.body.warningMessages))).toEqual(codes);
    for (const code of codes) expect(res.body.warningMessages[code]).toBe(WARNING_MESSAGES[code]);
  });

  it('a household with no cash gets the cash-shortfall message', async () => {
    const broke = await compare(body({ profile: { ...profile, cashSavingsCents: 0 } }));
    expect(broke.body.outcomeA.warnings).toContain('CASH_SHORTFALL_AT_PURCHASE');
    expect(broke.body.warningMessages.CASH_SHORTFALL_AT_PURCHASE).toBe(WARNING_MESSAGES.CASH_SHORTFALL_AT_PURCHASE);
  });

  it('the outcomes are exactly what evaluate() gives for the resolved inputs', () => {
    const { ruleset } = loadRuleset();
    const choiceA = { ...bto, classification: 'STANDARD', ...res.body.resolvedA };
    delete choiceA.marketValueData;
    const direct = evaluate(profile, choiceA, res.body.assumptions, ruleset);
    expect(res.body.outcomeA.netPositionCents).toBe(direct.netPositionCents);
  });

  it('uses the price slider when it is inside the range, and a picked project (D26)', async () => {
    const r = await compare(body({ choiceA: { ...bto, btoProjectId: 'tampines-bliss', btoPriceCents: 50000000 } }));
    expect(r.status).toBe(200);
    expect(r.body.resolvedA.purchasePriceCents).toBe(50000000);
  });

  it("resale asking price: pays the listing's price, but the flat is still worth the median", async () => {
    const r = await compare(body({ choiceB: { ...resale, resalePriceCents: 65000000 } }));
    expect(r.status).toBe(200);
    expect(r.body.resolvedB.purchasePriceCents).toBe(65000000);
    expect(r.body.resolvedB.medianPriceCents).toBe(58000000);
    expect(r.body.resolvedB.marketValueAtKeysCents).toBe(58000000);
    // Paying S$70,000 over the median leaves the resale path worse off than paying the median.
    expect(r.body.outcomeB.netPositionCents).toBeLessThan(res.body.outcomeB.netPositionCents);
  });

  it("a lease band with no sales falls back to the town's whole median and says so", async () => {
    const r = await compare(body({ choiceB: { ...resale, leaseBand: '70-79' } }));
    expect(r.status).toBe(200);
    expect(r.body.resolvedB.priceData.fellBackToAllLeases).toBe(true);
    expect(r.body.resolvedB.priceData.leaseFilter).toBeNull();
    expect(r.body.resolvedB.remainingLeaseYears).toBe(70);
  });

  it.each([
    ['no profile', { profile: undefined }, /profile/],
    ['three buyers', { profile: { ...profile, applicants: [...profile.applicants, profile.applicants[0]] } }, /exactly two/],
    ['PR + PR', { profile: { ...profile, applicants: profile.applicants.map((a) => ({ ...a, citizenship: 'PR' })) } }, /Singapore Citizen/],
    ['money in dollars', { profile: { ...profile, cashSavingsCents: 50000.5 } }, /cashSavingsCents/],
    ['a 2-room flat', { choiceA: { ...bto, flatType: '2 ROOM' } }, /flatType/],
    ['an unknown town', { choiceB: { ...resale, town: 'ATLANTIS' } }, /HDB town/],
    ['a town with no BTO launch', { choiceA: { ...bto, town: 'PUNGGOL' } }, /No recent BTO launch/],
    ['a BTO town not in the seed (checked against the seed, not resale towns)', { choiceA: { ...bto, town: 'TENGAH' } }, /No recent BTO launch in TENGAH/],
    ['an unknown project', { choiceA: { ...bto, btoProjectId: 'nope' } }, /not a seeded BTO project/],
    ['a project in another town', { choiceA: { ...bto, btoProjectId: 'sembawang-brook' } }, /not TAMPINES/],
    ['a price outside the range', { choiceA: { ...bto, btoPriceCents: 1 } }, /within/],
    ['the wrong classification', { choiceA: { ...bto, classification: 'PRIME' } }, /No recent BTO launch in TAMPINES offers PRIME 4 ROOM/],
    ['no lease band on resale', { choiceB: { ...resale, leaseBand: undefined } }, /leaseBand/],
    ['a resale asking price of 0', { choiceB: { ...resale, resalePriceCents: 0 } }, /resalePriceCents/],
    ['a resale asking price in dollars and cents', { choiceB: { ...resale, resalePriceCents: 650000.5 } }, /resalePriceCents/],
    ['a negative resale asking price', { choiceB: { ...resale, resalePriceCents: -1 } }, /resalePriceCents/],
    ['an application year in the past', { choiceA: { ...bto, applicationYear: YEAR - 1 } }, /applicationYear/],
    ['growth as a percentage', { assumptions: { ...assumptions, annualPriceGrowth: 3 } }, /annualPriceGrowth/],
    ['a horizon before the BTO keys', { assumptions: { ...assumptions, horizonYear: YEAR } }, /before a path's keys/],
    ['a bank loan (D32)', { assumptions: { ...assumptions, loanType: 'BANK' } }, /D32/],
    ['no resale sales at all', { choiceB: { ...resale, town: 'PUNGGOL' } }, /No 4 ROOM resale transactions/],
  ])('400 VALIDATION_ERROR for %s', async (_name, over, message) => {
    const r = await compare(body(over));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
    expect(r.body.error.message).toMatch(message);
  });

  it('503 DATA_UNAVAILABLE when data.gov.sg is down and nothing is cached', async () => {
    const r = await compare(body({ choiceB: { ...resale, town: 'BEDOK' } }));
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('DATA_UNAVAILABLE');
  });
});

describe('POST /api/timing', () => {
  const timing = (b) => request(app).post('/api/timing').send(b);
  const years = [YEAR, YEAR + 1, YEAR + 2];
  let res;
  beforeAll(async () => {
    res = await timing({ profile, choiceBase: bto, candidateYears: years, assumptions });
  });

  it('ranks each candidate year and picks the highest net position', () => {
    expect(res.status).toBe(200);
    const ranked = [...res.body.all.map((e) => e.year), ...res.body.skipped.map((s) => s.year)].sort();
    expect(ranked).toEqual(years);
    const top = Math.max(...res.body.all.map((e) => e.outcome.netPositionCents));
    expect(res.body.best.outcome.netPositionCents).toBe(top);
    expect(res.body.best.year).toBe(res.body.all.find((e) => e.outcome.netPositionCents === top).year); // ties: earliest
  });

  it('returns a plain-English message for each warning code in a ranked year and each skip reason', () => {
    const codes = new Set([
      ...res.body.all.flatMap((e) => e.outcome.warnings),
      ...res.body.skipped.map((s) => s.reason),
    ]);
    expect(new Set(Object.keys(res.body.warningMessages))).toEqual(codes);
    for (const code of codes) expect(res.body.warningMessages[code]).toBe(WARNING_MESSAGES[code]);
  });

  it('one horizon for every year: the last candidate\'s keys + 10, and plain-language lines', () => {
    const lastKeys = YEAR + 2 + Math.floor(res.body.resolved.btoWaitMonths / 12);
    expect(res.body.horizonYear).toBe(lastKeys + 10);
    res.body.all.forEach((e) => expect(e.outcome.horizonYear).toBe(res.body.horizonYear));
    expect(res.body.explanation[0]).toMatch(/Under these assumptions, applying in \d{4}/);
    expect(res.body.explanation.at(-1)).toMatch(/not a price forecast/);
  });

  it('defaults to this year and the next five', async () => {
    const r = await timing({ profile, choiceBase: bto, assumptions });
    expect(r.status).toBe(200);
    expect(r.body.all.length + r.body.skipped.length).toBe(6);
  });

  it('skips years whose keys miss the move-in year, and says why', async () => {
    const r = await timing({ profile: { ...profile, constraints: { moveInByYear: YEAR + 1 } }, choiceBase: { ...resale }, candidateYears: years, assumptions });
    expect(r.status).toBe(200);
    expect(r.body.skipped).toEqual([{ year: YEAR + 2, reason: 'MOVE_IN_DEADLINE_MISSED' }]);
    expect(r.body.explanation.join(' ')).toMatch(/Not ranked: \d{4} \(keys come after the move-in year\)/);
  });

  it.each([
    ['years out of order', { candidateYears: [YEAR + 1, YEAR] }, /candidateYears/],
    ['no years', { candidateYears: [] }, /candidateYears/],
    ['a later year out of range', { candidateYears: [YEAR, YEAR + MAX_YEARS_AHEAD + 1] }, new RegExp(`${YEAR + MAX_YEARS_AHEAD + 1} is not`)],
    ['a bad choice', { choiceBase: { ...bto, flatType: 'EXECUTIVE' } }, /flatType/],
  ])('400 for %s', async (_name, over, message) => {
    const r = await timing({ profile, choiceBase: bto, candidateYears: years, assumptions, ...over });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(message);
  });
});

describe('warning messages', () => {
  it('every engine warning code has a plain-English message that does not show the code', () => {
    for (const code of Object.values(WARNINGS)) {
      expect(typeof WARNING_MESSAGES[code]).toBe('string');
      expect(WARNING_MESSAGES[code].length).toBeGreaterThan(20);
      expect(WARNING_MESSAGES[code]).not.toContain(code);
    }
  });

  it('warningMessagesFor keeps each known code once and leaves out unknown codes', () => {
    expect(warningMessagesFor(['LOAN_ABOVE_LIMIT', 'NOT_A_CODE', 'LOAN_ABOVE_LIMIT'])).toEqual({
      LOAN_ABOVE_LIMIT: WARNING_MESSAGES.LOAN_ABOVE_LIMIT,
    });
    expect(warningMessagesFor([])).toEqual({});
  });
});
