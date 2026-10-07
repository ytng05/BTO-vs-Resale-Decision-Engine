// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md. Delete or ignore once the real endpoint exists.

export function mockCompare() {
  const priceGrowth = [0, 1, 2, 3, 4, 5]; // percent per year (mock axis)
  const incomeGrowth = [0, 1, 2, 3, 4, 5];
  const grid = incomeGrowth.map((ig, r) =>
    priceGrowth.map((pg, c) => {
      const margin = (c - r) * 10000; // arbitrary mock pattern
      return {
        priceGrowth: pg,
        incomeGrowth: ig,
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
    frontier: priceGrowth.map((p) => ({ priceGrowth: p, incomeGrowth: p })),
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

