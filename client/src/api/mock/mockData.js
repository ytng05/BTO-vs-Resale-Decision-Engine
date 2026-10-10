// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md and the Outcome type in server/src/engine/types.js.
// Growth rates are fractions (0.03 = 3%), the same unit the forms send and the contract uses.
// Delete or ignore once the real endpoint exists.
import rulesetSnapshot from '../../../../server/src/config/rulesets/ruleset-2026-08-24.json';

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
    rulesetVersion: rulesetSnapshot.version,
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
