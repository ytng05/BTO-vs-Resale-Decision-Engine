// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md and the Outcome typedef in
// server/src/engine/evaluate.contract.js. ALL money is integer cents, same as the contract.
// Growth rates are fractions (0.03 = 3%), the same unit the forms send and the contract uses.
// Delete or ignore once the real endpoint exists.

const GROWTH_STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

export function mockCompare(payload = {}) {
  const holdingPeriodYears = payload.assumptions?.holdingPeriodYears ?? 10;

  // Rows are income growth, columns are price growth. marginCents = A minus B (positive: A ahead).
  const grid = GROWTH_STEPS.map((annualIncomeGrowth, r) =>
    GROWTH_STEPS.map((annualPriceGrowth, c) => {
      const marginCents = (c - r) * 1_000_000; // arbitrary mock pattern, in cents ($10,000 steps)
      return {
        annualPriceGrowth,
        annualIncomeGrowth,
        winner: marginCents > 0 ? 'A' : marginCents < 0 ? 'B' : 'TIE',
        marginCents,
      };
    }),
  );

  return {
    mock: true,
    rulesetVersion: '0.0.0-template',
    breakEvenSentence: 'MOCK: the two paths are equal where price growth matches income growth.',
    grid,
    frontier: GROWTH_STEPS.map((g) => ({ annualPriceGrowth: g, annualIncomeGrowth: g })),
    holdingPeriodYears,
    outcomeA: mockOutcome({
      netPositionCents: 18_500_000,
      cpfRefundPrincipalCents: 14_000_000,
      cpfAccruedInterestCents: 3_800_000,
      grants: [
        {
          id: 'EHG',
          amountCents: 5_000_000,
          tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'MOCK: household income is within the assessed range.' }],
        },
        {
          id: 'FAMILY',
          amountCents: 0,
          tests: [{ id: 'FAMILY_RESALE_ONLY', passed: false, reason: 'MOCK: this grant applies to resale flats only.' }],
        },
        {
          id: 'PHG',
          amountCents: 0,
          tests: [{ id: 'PHG_LIVING_ARRANGEMENT', passed: false, reason: 'MOCK: not living with or near parents.' }],
        },
      ],
      clawbackCents: 0,
    }),
    outcomeB: mockOutcome({
      netPositionCents: 17_200_000,
      cpfRefundPrincipalCents: 21_000_000,
      cpfAccruedInterestCents: 5_200_000,
      grants: [
        {
          id: 'EHG',
          amountCents: 5_000_000,
          tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'MOCK: household income is within the assessed range.' }],
        },
        {
          id: 'FAMILY',
          amountCents: 4_000_000,
          tests: [{ id: 'FAMILY_RESALE_ONLY', passed: true, reason: 'MOCK: first-timer buying a resale flat.' }],
        },
        {
          id: 'PHG',
          amountCents: 0,
          tests: [{ id: 'PHG_LIVING_ARRANGEMENT', passed: false, reason: 'MOCK: no parents\u2019 postal code was given.' }],
        },
      ],
      clawbackCents: 0,
    }),
  };
}

function mockOutcome({ netPositionCents, cpfRefundPrincipalCents, cpfAccruedInterestCents, grants, clawbackCents }) {
  const totalGrantsCents = grants.reduce((sum, g) => sum + g.amountCents, 0);
  return {
    totalGrantsCents,
    grants,
    cashRequiredAtPurchaseCents: 4_500_000,
    cpfUsedAtPurchaseCents: 8_000_000,
    loanPrincipalCents: 45_000_000,
    totalInterestPaidCents: 12_000_000,
    salePriceCents: 72_000_000,
    cpfRefundPrincipalCents,
    cpfAccruedInterestCents,
    outstandingLoanAtSaleCents: 30_000_000,
    transactionCostsCents: 1_800_000,
    clawbackCents,
    netPositionCents,
    resolvedRates: {
      oaRate: 0.025,
      hdbConcessionaryRate: 0.026,
      accruedInterestCompounding: 'ANNUAL',
      ltvApplied: 0.75,
    },
    rulesetVersion: '0.0.0-template',
    warnings: [],
  };
}

export function mockRuleset() {
  return { version: '0.0.0-template', status: 'TEMPLATE', effectiveDate: null, verifiedOn: null };
}