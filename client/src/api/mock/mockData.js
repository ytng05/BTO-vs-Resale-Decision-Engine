// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md and the Outcome typedef (CONTRACT v2) in
// server/src/engine/evaluate.contract.js. ALL money is integer cents, same as the contract.
// Growth rates are fractions (0.03 = 3%), the same unit the forms send and the contract uses.
// Delete or ignore once the real endpoint exists.
// Imports the server ruleset JSON by relative path on purpose: mock mode shows the same snapshot the API serves, with no copy to drift.
import rulesetSnapshot from '../../../../server/src/config/rulesets/ruleset-2026-08-24.json';

const GROWTH_STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];

export function mockCompare(payload = {}) {
  const assumptions = payload.assumptions ?? {};
  const choiceA = payload.choiceA ?? { path: 'BTO', applicationYear: 2026 };
  const choiceB = payload.choiceB ?? { path: 'RESALE', applicationYear: 2026 };
  const evaluationStartYear = assumptions.evaluationStartYear ?? 2026;

  // v2: both paths are measured at one common horizonYear (D1), not at a per-outcome holding period.
  const laterKeyYear = Math.max(
    keysYearFor(choiceA, evaluationStartYear),
    keysYearFor(choiceB, evaluationStartYear),
  );
  const horizonYear = assumptions.horizonYear ?? laterKeyYear + 10;

  // Rows are income growth, columns are price growth. marginCents = A minus B (positive: A ahead).
  const grid = GROWTH_STEPS.map((annualIncomeGrowth) =>
    GROWTH_STEPS.map((annualPriceGrowth) => {
      const marginCents = Math.round((annualPriceGrowth - annualIncomeGrowth) * 100_000_000); // arbitrary mock pattern
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
    rulesetVersion: rulesetSnapshot.version,
    horizonYear,
    breakEvenSentence: 'MOCK: the two paths are equal at the horizon year where price growth matches income growth.',
    grid,
    frontier: GROWTH_STEPS.map((g) => ({ annualPriceGrowth: g, annualIncomeGrowth: g })),
    outcomeA: mockOutcome({
      choice: choiceA,
      evaluationStartYear,
      horizonYear,
      netPositionCents: 18_500_000,
      cpfRefundPrincipalCents: 14_000_000,
      cpfAccruedInterestCents: 3_800_000,
      grants: [
        {
          id: 'EHG',
          amountCents: 5_000_000,
          tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'MOCK: household income is within the assessed range.', sourceUrl: null }],
        },
        {
          id: 'FAMILY',
          amountCents: 0,
          tests: [{ id: 'FAMILY_RESALE_ONLY', passed: false, reason: 'MOCK: this grant applies to resale flats only.', sourceUrl: null }],
        },
        {
          id: 'PHG',
          amountCents: 0,
          tests: [{ id: 'PHG_LIVING_ARRANGEMENT', passed: false, reason: 'MOCK: not living with or near parents.', sourceUrl: null }],
        },
      ],
      clawbackCents: 0,
    }),
    outcomeB: mockOutcome({
      choice: choiceB,
      evaluationStartYear,
      horizonYear,
      netPositionCents: 17_200_000,
      cpfRefundPrincipalCents: 21_000_000,
      cpfAccruedInterestCents: 5_200_000,
      grants: [
        {
          id: 'EHG',
          amountCents: 5_000_000,
          tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'MOCK: household income is within the assessed range.', sourceUrl: null }],
        },
        {
          id: 'FAMILY',
          amountCents: 4_000_000,
          tests: [{ id: 'FAMILY_RESALE_ONLY', passed: true, reason: 'MOCK: first-timer buying a resale flat.', sourceUrl: null }],
        },
        {
          id: 'PHG',
          amountCents: 0,
          tests: [{ id: 'PHG_LIVING_ARRANGEMENT', passed: false, reason: 'MOCK: no parents\u2019 postal code was given.', sourceUrl: null }],
        },
      ],
      clawbackCents: 0,
    }),
  };
}

// BTO keys = application + wait (months → whole years, rounded up); resale keys = applicationYear (D1).
function keysYearFor(choice, evaluationStartYear) {
  const applicationYear = choice.applicationYear ?? evaluationStartYear;
  if (choice.path === 'RESALE') return applicationYear;
  const waitMonths = choice.btoWaitMonths ?? 52;
  return applicationYear + Math.ceil(waitMonths / 12);
}

function mockOutcome({
  choice,
  evaluationStartYear,
  horizonYear,
  netPositionCents,
  cpfRefundPrincipalCents,
  cpfAccruedInterestCents,
  grants,
  clawbackCents,
}) {
  const isResale = choice.path === 'RESALE';
  const applicationYear = choice.applicationYear ?? evaluationStartYear;
  const waitMonths = isResale ? 0 : choice.btoWaitMonths ?? 52;
  const keysYear = keysYearFor(choice, evaluationStartYear);
  const renovationCents = choice.renovationCents ?? 3_000_000;
  const totalGrantsCents = grants.reduce((sum, g) => sum + g.amountCents, 0);

  const yearlyCashFlow = [];
  for (let year = evaluationStartYear; year <= horizonYear; year += 1) {
    const hasKeys = year >= keysYear;
    yearlyCashFlow.push({
      year,
      housingCashOutCents: hasKeys ? 600_000 : 1_200_000,
      cpfUsedCents: hasKeys ? 1_440_000 : 0,
      loanBalanceEndCents: hasKeys ? Math.max(0, 45_000_000 - (year - keysYear) * 1_500_000) : 0,
      marketValueEndCents: hasKeys ? 60_000_000 + (year - keysYear) * 1_500_000 : 0,
      cpfObligationEndCents: hasKeys ? 8_000_000 + (year - keysYear) * 1_700_000 : 0,
    });
  }

  const costBreakdown = [
    { id: 'BSD', label: "Buyer's stamp duty", amountCents: 1_110_000, paidFrom: 'CPF' },
    { id: 'LEGAL', label: 'Legal fees', amountCents: 300_000, paidFrom: 'CASH' },
    ...(isResale ? [{ id: 'AGENT', label: "Agent's fees", amountCents: 400_000, paidFrom: 'CASH' }] : []),
    { id: 'RENOVATION', label: 'Renovation', amountCents: renovationCents, paidFrom: 'CASH' },
    { id: 'RENT_WHILE_WAITING', label: 'Rent while waiting', amountCents: isResale ? 0 : 3_300_000, paidFrom: 'CASH' },
    { id: 'LOAN_INTEREST', label: 'Loan interest', amountCents: 8_000_000, paidFrom: 'CPF' },
    { id: 'CPF_ACCRUED_INTEREST', label: 'CPF accrued interest owed', amountCents: cpfAccruedInterestCents, paidFrom: 'NONE' },
    ...(clawbackCents > 0
      ? [{ id: 'CLAWBACK', label: 'Subsidy clawback', amountCents: clawbackCents, paidFrom: 'NONE' }]
      : []),
  ];

  const housingCashSpentCents = costBreakdown
    .filter((line) => line.paidFrom === 'CASH')
    .reduce((sum, line) => sum + line.amountCents, 0);

  return {
    horizonYear,
    timeline: {
      applicationDate: `${applicationYear}-01-01`,
      keyCollectionDate: `${keysYear}-${isResale ? '01' : '05'}-01`,
      monthsWaiting: waitMonths,
      earliestSaleDate: `${keysYear + 5}-${isResale ? '01' : '05'}-01`,
    },
    totalGrantsCents,
    grants,
    affordability: {
      maxLoanCents: 48_000_000,
      loanRequiredCents: 45_000_000,
      withinLimit: true,
      shortfallCents: 0,
      limitingRule: 'MSR',
    },
    cashRequiredAtPurchaseCents: 4_500_000,
    cpfUsedAtPurchaseCents: 8_000_000,
    loanPrincipalCents: 45_000_000,
    marketValueAtHorizonCents: 72_000_000,
    outstandingLoanAtHorizonCents: 30_000_000,
    cpfRefundPrincipalCents,
    cpfAccruedInterestCents,
    clawbackCents,
    housingCashSpentCents,
    costBreakdown,
    yearlyCashFlow,
    netPositionCents,
    resolvedRates: {
      oaRate: 0.025,
      hdbConcessionaryRate: 0.026,
      accruedInterestCompounding: 'ANNUAL',
      ltvApplied: 0.75,
    },
    rulesetVersion: '0.0.0-template',
    warnings: isResale ? [] : ['BTO_WAIT_ASSUMED'],
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