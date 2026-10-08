// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md. Delete or ignore once the real endpoint exists.
import rulesetSnapshot from '../../../../server/src/config/rulesets/ruleset-2026-08-24.json';

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
    rulesetVersion: rulesetSnapshot.version,
    breakEvenSentence: 'MOCK: the two paths are equal where price growth matches income growth.',
    grid,
    frontier: priceGrowth.map((p) => ({ priceGrowth: p, incomeGrowth: p })),
  };
}

export function mockRuleset() {
  return {
    version: rulesetSnapshot.version,
    status: 'VERIFIED',
    effectiveDate: rulesetSnapshot.effectiveDate,
    verifiedOn: rulesetSnapshot.verifiedOn,
    verifiedBy: rulesetSnapshot.verifiedBy,
    rules: rulesetSnapshot,
  };
}

export function mockGrants(payload) {
  const ruleset = mockRuleset();
  const testsByGrant = {
    EHG: [{ id: 'EHG_INCOME_CEILING', passed: false, reason: 'MOCK: no grant calculation performed.' }],
    FAMILY: [{ id: 'FAMILY_INCOME_LIMIT', passed: false, reason: 'MOCK: no grant calculation performed.' }],
    PHG: [{ id: 'PHG_AMOUNT', passed: false, reason: 'MOCK: no grant calculation performed.' }],
  };
  return {
    mock: true,
    totalGrantsCents: 0,
    grants: Object.entries(testsByGrant).map(([id, tests]) => ({ id, amountCents: 0, tests })),
    rulesetVersion: ruleset.version,
    rulesetStatus: ruleset.status,
    assessmentDate: payload.assessmentDate ?? `${payload.choice.purchaseYear}-01-01`,
  };
}
