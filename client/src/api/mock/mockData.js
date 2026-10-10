// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md and the Outcome type in server/src/engine/types.js.
// Growth rates are fractions (0.03 = 3%), the same unit the forms send and the contract uses.
// Delete or ignore once the real endpoint exists.

const GROWTH_STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

export function mockCompare(payload = {}) {
  const horizonYears = payload.assumptions?.horizonYears ?? 10;

  // Rows are income growth, columns are price growth. margin = A minus B (positive: A ahead).
  const grid = GROWTH_STEPS.map((incomeGrowth, r) =>
    GROWTH_STEPS.map((priceGrowth, c) => {
      const margin = (c - r) * 10000; // arbitrary mock pattern
      return {
        priceGrowth,
        incomeGrowth,
        winner: margin > 0 ? 'A' : margin < 0 ? 'B' : 'TIE',
        margin,
      };
    }),
  );

  return {
    mock: true,
    rulesetVersion: '0.0.0-template',
    breakEvenSentence: 'MOCK: the two paths are equal where price growth matches income growth.',
    grid,
    frontier: GROWTH_STEPS.map((g) => ({ priceGrowth: g, incomeGrowth: g })),
    horizonYears,
    outcomeA: mockOutcome({
      netFinancialPosition: 185000,
      cpfRefund: { principal: 140000, accruedInterest: 38000 },
      grants: { ehg: 50000, familyGrant: 0, phg: 0 },
      eligibility: [
        { grant: 'EHG', passed: true, reason: 'MOCK: household income is within the assessed range.' },
        { grant: 'FAMILY_GRANT', passed: false, reason: 'MOCK: this grant applies to resale flats only.' },
        { grant: 'PHG', passed: false, reason: 'MOCK: this grant applies to resale flats only.' },
      ],
      subsidyClawback: 0,
    }),
    outcomeB: mockOutcome({
      netFinancialPosition: 172000,
      cpfRefund: { principal: 210000, accruedInterest: 52000 },
      grants: { ehg: 50000, familyGrant: 40000, phg: 0 },
      eligibility: [
        { grant: 'EHG', passed: true, reason: 'MOCK: household income is within the assessed range.' },
        { grant: 'FAMILY_GRANT', passed: true, reason: 'MOCK: first-timer buying a resale flat.' },
        { grant: 'PHG', passed: false, reason: 'MOCK: no parents’ postal code was given.' },
      ],
      subsidyClawback: 0,
    }),
  };
}

function mockOutcome({ netFinancialPosition, cpfRefund, grants, eligibility, subsidyClawback }) {
  return {
    netFinancialPosition,
    cpfRefund: { ...cpfRefund, total: cpfRefund.principal + cpfRefund.accruedInterest },
    grants: { ...grants, total: grants.ehg + grants.familyGrant + grants.phg },
    eligibility,
    subsidyClawback,
    rulesetVersion: '0.0.0-template',
  };
}

export function mockRuleset() {
  return { version: '0.0.0-template', status: 'TEMPLATE', effectiveDate: null, verifiedOn: null };
}

export function mockBtoProjects() {
  return {
    mock: true,
    count: 1,
    projects: [{
      _id: 'mock-1', name: 'MOCK Project', town: 'MOCK TOWN', classification: 'STANDARD',
      mopYears: 0, subsidyRecoveryRate: 0,
      flats: [{ flatType: '4 ROOM', indicativePriceLow: 0, indicativePriceHigh: 0 }],
      sourceName: 'MOCK', sourceAccessed: '2026-01-01',
    }],
  };
}

export function mockResalePrice() {
  return {
    mock: true,
    town: 'MOCK TOWN', flatType: '4 ROOM',
    window: { from: '2025-11', to: '2026-10', months: 12 },
    count: 100, median: 500000, p25: 450000, p75: 550000, medianPricePerSqm: 5000, lowSample: false,
    source: { datasetId: 'MOCK', name: 'MOCK resale data' },
    cached: false, fetchedAt: '2026-01-01T00:00:00.000Z',
  };
}

export function mockRpi() {
  return {
    mock: true,
    base: '2009-Q1 = 100',
    latest: { quarter: '2026-Q2', index: 100 },
    historicalAnnualGrowth: { '5y': 0.03, '10y': 0.03, '20y': 0.03 },
    count: 4,
    series: [
      { quarter: '2025-Q3', index: 97 }, { quarter: '2025-Q4', index: 98 },
      { quarter: '2026-Q1', index: 99 }, { quarter: '2026-Q2', index: 100 },
    ],
    source: { datasetId: 'MOCK', name: 'MOCK Resale Price Index' },
    cached: false, fetchedAt: '2026-01-01T00:00:00.000Z',
  };
}

