// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md. Delete or ignore once the real endpoint exists.
import rulesetTemplate from '../../../../server/src/config/rulesets/ruleset.template.json';

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
  return {
    version: rulesetTemplate.version,
    status: 'TEMPLATE',
    effectiveDate: rulesetTemplate.effectiveDate,
    verifiedOn: rulesetTemplate.verifiedOn,
    verifiedBy: rulesetTemplate.verifiedBy,
    rules: rulesetTemplate,
  };
}

export function mockGrants(payload) {
  const ruleset = mockRuleset();
  return {
    mock: true,
    ehg: 0,
    familyGrant: 0,
    phg: 0,
    total: 0,
    eligibility: [],
    rulesetVersion: ruleset.version,
    rulesetStatus: ruleset.status,
    assessmentDate: payload.assessmentDate ?? new Date().toISOString().slice(0, 10),
  };
}
