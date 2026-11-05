// POST /api/compare and POST /api/timing (seat 1). data.gov.sg is replaced by a small set of fake
// transactions, so these run offline. No hand-worked values: every expectation is structural, a rule from
// the contract (D7, D16, D17, D22, D26, D33), or checked against evaluate() itself, which has its own
// hand-worked fixture.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Fake resale transactions per town. TAMPINES: five near-new (lease 90+, enough on its own, D41), three in the
// 80s, one in the 60s. BISHAN: no near-new, so its BTO value pools TOA PAYOH and ANG MO KIO's (D41).
// TENGAH and the Jurong towns have none; BEDOK's lookup fails as if data.gov.sg were down with nothing cached.
const tx = (price, lease) => ({ month: '2026-08', resale_price: String(price), floor_area_sqm: '93', remaining_lease: `${lease} years` });
const FAKE = {
  TAMPINES: [tx(700000, 95), tx(710000, 96), tx(720000, 94), tx(730000, 92), tx(740000, 93),
    tx(560000, 85), tx(580000, 84), tx(600000, 82), tx(450000, 65)],
  SEMBAWANG: [tx(520000, 96), tx(540000, 95), tx(430000, 75), tx(410000, 72)],
  BISHAN: [tx(600000, 70), tx(650000, 85)],
  'TOA PAYOH': [tx(1000000, 95), tx(1100000, 94), tx(1050000, 96), tx(500000, 60)],
  'ANG MO KIO': [tx(990000, 93), tx(1020000, 92)],
};
vi.mock('../src/services/datagov/resalePrice.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getResalePriceBasis: vi.fn(async ({ town, towns, flatType, months, minLeaseYears, maxLeaseYears }) => {
      const list = towns ?? [town];
      if (list.includes('BEDOK')) throw new Error('data.gov.sg unreachable');
      const lease = minLeaseYears !== undefined || maxLeaseYears !== undefined ? { leaseFilter: { minLeaseYears, maxLeaseYears } } : {};
      return {
        town: list[0], ...(towns ? { towns } : {}), flatType, window: { from: '2025-09', to: '2026-08', months }, ...lease,
        ...actual.summariseResale(actual.filterByLease(list.flatMap((t) => FAKE[t] ?? []), { minLeaseYears, maxLeaseYears })),
        source: { name: 'fake' }, cached: true, stale: false, fetchedAt: '2026-10-01T00:00:00.000Z',
      };
    }),
  };
});


const { createApp } = await import('../src/app.js');
const { breakEvenSentence, btoPriceSentence } = await import('../src/routes/analysis.js');
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
    ['a line elsewhere on the heatmap, but not at the user\'s income growth', true, false, /With income growing 2\.5% a year, BTO .* every price growth .* lies at other income growth rates/],
    ['no line anywhere tested', false, false, /Under every combination tested/],
  ])('the sentence (unit): %s', (_name, gridHasLine, userRowHasLine, expected) => {
    const cell = (p, i, winner) => ({ annualPriceGrowth: p, annualIncomeGrowth: i, winner, marginCents: winner === 'A' ? 1 : -1 });
    const row = (i, crossing) => [cell(0.01, i, crossing ? 'B' : 'A'), cell(0.02, i, 'A')];
    const surface = { grid: [row(0.02, gridHasLine), row(0.03, false)], frontier: gridHasLine ? [{ annualPriceGrowth: 0.012, annualIncomeGrowth: 0.02 }] : [] };
    const userRow = { grid: [row(0.025, userRowHasLine)], frontier: userRowHasLine ? [{ annualPriceGrowth: 0.015, annualIncomeGrowth: 0.025 }] : [] };
    const sentence = breakEvenSentence(surface, userRow, { horizonYear: 2040, annualIncomeGrowth: 0.025, nameA: 'BTO', nameB: 'resale' });
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

  
  it("BTO value: the town's own near-new median when it has at least 5 such sales (D41)", () => {
    expect(res.body.resolvedA.marketValueData).toMatchObject({
      towns: ['TAMPINES'], fellBackToNearbyTowns: false, fellBackToAllLeases: false, transactions: 5,
    });
  });

  it('BTO value: too few near-new sales in the town pools its nearby towns, never all leases (D41)', async () => {
    const r = await compare(body({ choiceA: { ...bto, town: 'BISHAN', classification: 'PRIME' } }));
    expect(r.status).toBe(200);
    // Bishan has no 90+ sales; Toa Payoh's three and Ang Mo Kio's two are pooled: 990k 1,000k 1,020k 1,050k 1,100k.
    // Bishan's own older sales (600k, 650k) and Toa Payoh's 60-year sale are never used.
    expect(r.body.resolvedA.marketValueAtKeysCents).toBe(102000000);
    expect(r.body.resolvedA.marketValueData).toMatchObject({
      towns: ['BISHAN', 'TOA PAYOH', 'ANG MO KIO'], fellBackToNearbyTowns: true, fellBackToAllLeases: false, transactions: 5,
    });
  });

  it('BTO value: too few near-new sales even with the nearby towns is a 400 naming them (D41)', async () => {
    const r = await compare(body({ choiceA: { ...bto, town: 'JURONG EAST', flatType: '5 ROOM' } }));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Too few near-new 5 ROOM resale sales in JURONG EAST, JURONG WEST, BUKIT BATOK/);
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

  it('returns the BTO price at which the verdict flips, against the launch\'s HDB range (D40)', () => {
    const be = res.body.btoPriceBreakEven;
    expect(be).not.toBeNull();
    expect(be.hdbRangeCents).toEqual({ min: res.body.btoProjectA.priceMinCents, max: res.body.btoProjectA.priceMaxCents });
    // The winner at the price used agrees with the outcomes: BTO is ahead at or below the flip price.
    const margin = res.body.outcomeA.netPositionCents - res.body.outcomeB.netPositionCents;
    if (be.priceCents !== null) expect(margin >= 0).toBe(res.body.resolvedA.purchasePriceCents <= be.priceCents);
    expect(res.body.btoPriceSentence).toMatch(/net financial position/);
    expect(res.body.btoPriceSentence).toMatch(/not a price forecast/);
  });

  it('no BTO price break-even when path A is not a BTO (D40)', async () => {
    const r = await compare(body({ choiceA: resale }));
    expect(r.status).toBe(200);
    expect(r.body.btoPriceBreakEven).toBeNull();
    expect(r.body.btoPriceSentence).toBeNull();
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

describe('btoPriceSentence (D40)', () => {
  const range = { min: 48_100_000, max: 60_000_000 };
  const opts = { horizonYear: 2040, flatType: '4 ROOM', projectName: 'Tampines Bliss' };
  const be = (over) => ({ priceCents: null, atHdbMin: 'A', atHdbMax: 'B', hdbRangeCents: range, bracketCents: { min: 24_050_000, max: 90_000_000 }, ...over });

  it('inside the range: BTO ahead under the flip price, rounded down to the $1,000', () => {
    const s = btoPriceSentence(be({ priceCents: 58_579_900 }), opts);
    expect(s).toContain('as long as the 4-room costs under $585,000; above that, resale does');
    expect(s).toContain("HDB's range for Tampines Bliss ($481,000 to $600,000)");
    expect(s).toMatch(/at the end of 2040/);
    expect(s).toMatch(/today's terms\. This is not a price forecast\.$/);
  });

  it('BTO ahead across the whole range, and how far above it', () => {
    const s = btoPriceSentence(be({ priceCents: 71_234_500, atHdbMax: 'A' }), opts);
    expect(s).toMatch(/^BTO leaves the household with at least as high a net financial position as resale/);
    expect(s).toContain('at any price in HDB\'s range');
    expect(s).toContain('up to about $712,000');
    expect(btoPriceSentence(be({ atHdbMax: 'A' }), opts)).not.toContain('up to about');
  });

  it('a tie at HDB\'s maximum reads as "at least as high", not as resale ahead', () => {
    expect(btoPriceSentence(be({ priceCents: 60_000_000, atHdbMax: 'TIE' }), opts)).toContain('at least as high');
  });

  it('resale ahead even at HDB\'s minimum, and what BTO would need to cost', () => {
    const s = btoPriceSentence(be({ priceCents: 41_299_900, atHdbMin: 'B' }), opts);
    expect(s).toMatch(/^Resale leaves the household with the higher net financial position at the end of 2040 even at the cheapest price/);
    expect(s).toContain('would need to cost under $412,000');
    expect(btoPriceSentence(be({ atHdbMin: 'B' }), opts)).not.toContain('would need to cost');
  });

  it('never uses forbidden wording', () => {
    for (const over of [{ priceCents: 50_000_000 }, { atHdbMax: 'A' }, { atHdbMin: 'B' }]) {
      expect(btoPriceSentence(be(over), opts)).not.toMatch(/profit|probability|predict|will be/i);
    }
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
