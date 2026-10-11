// MOCK DATA ONLY. Nothing here is a real calculation or a real policy figure.
// It exists so seats 4 and 5 can build screens and Cypress tests before the engine is ready.
// Shape must match docs/API_CONTRACT.md and the Outcome typedef (CONTRACT v2) in
// server/src/engine/evaluate.contract.js. ALL money is integer cents, same as the contract.
// Growth rates are fractions (0.03 = 3%), the same unit the forms send and the contract uses.
// Delete or ignore once the real endpoint exists.
// Imports the server ruleset JSON by relative path on purpose: mock mode shows the same snapshot the API serves, with no copy to drift.
import rulesetSnapshot from '../../../../server/src/config/rulesets/ruleset-2026-08-24.json';

const GROWTH_STEPS = [0, 0.01, 0.02, 0.03, 0.04, 0.05];
const DEFAULT_BTO_WAIT_MONTHS = rulesetSnapshot.btoWaiting?.defaultMonths ?? 48;
const GRANT_SOURCES = rulesetSnapshot.grants?.checkSources ?? {};

function sourceUrlFor(testId) {
  return GRANT_SOURCES[testId] ?? null;
}

export function mockCompare(payload = {}) {
  const assumptions = payload.assumptions ?? {};
  const choiceA = payload.choiceA ?? { path: 'BTO', applicationYear: 2026 };
  const choiceB = payload.choiceB ?? { path: 'RESALE', applicationYear: 2026, livingArrangement: 'NEAR' };
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
    // Mock persona: SC+SC couple, $7,000/month household income (EHG income band $6,501-$7,000 -> $30,000,
    // per the live ruleset), buying a 2-4 room flat, declared as living NEAR their parents on the resale path.
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
          amountCents: 3_000_000,
          tests: [
            {
              id: 'EHG_INCOME_BAND',
              passed: true,
              reason: 'MOCK: household income band $6,501-$7,000 gets the $30,000 EHG tier.',
              sourceUrl: sourceUrlFor('EHG_INCOME_BAND'),
            },
          ],
        },
        {
          id: 'FAMILY',
          amountCents: 0,
          tests: [
            {
              id: 'FAMILY_RESALE_ONLY',
              passed: false,
              reason: 'MOCK: this grant applies to resale flats only.',
              sourceUrl: sourceUrlFor('FAMILY_RESALE_ONLY'),
            },
          ],
        },
        {
          id: 'PHG',
          amountCents: 0,
          tests: [
            {
              id: 'PHG_RESALE_ONLY',
              passed: false,
              reason: 'MOCK: this grant applies to resale flats only.',
              sourceUrl: sourceUrlFor('PHG_RESALE_ONLY'),
            },
          ],
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
          amountCents: 3_000_000,
          tests: [
            {
              id: 'EHG_INCOME_BAND',
              passed: true,
              reason: 'MOCK: household income band $6,501-$7,000 gets the $30,000 EHG tier.',
              sourceUrl: sourceUrlFor('EHG_INCOME_BAND'),
            },
          ],
        },
        {
          id: 'FAMILY',
          amountCents: 8_000_000,
          tests: [
            {
              id: 'FAMILY_HOUSEHOLD_TYPE',
              passed: true,
              reason: 'MOCK: SC+SC couple buying a 2- to 4-room resale flat gets $80,000.',
              sourceUrl: sourceUrlFor('FAMILY_HOUSEHOLD_TYPE'),
            },
          ],
        },
        {
          id: 'PHG',
          amountCents: 2_000_000,
          tests: [
            {
              id: 'PHG_LIVING_ARRANGEMENT',
              passed: true,
              reason: 'MOCK: you said you\u2019ll live near your parents.',
              sourceUrl: sourceUrlFor('PHG_LIVING_ARRANGEMENT'),
            },
          ],
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
  const waitMonths = choice.btoWaitMonths ?? DEFAULT_BTO_WAIT_MONTHS;
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
  const waitMonths = isResale ? 0 : choice.btoWaitMonths ?? DEFAULT_BTO_WAIT_MONTHS;
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
      assessmentRate: 0.03,
    },
    rulesetVersion: rulesetSnapshot.version,
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
    EHG: [{ id: 'EHG_INCOME_CEILING', passed: false, reason: 'MOCK: no grant calculation performed.', sourceUrl: sourceUrlFor('EHG_INCOME_CEILING') }],
    FAMILY: [{ id: 'FAMILY_INCOME_LIMIT', passed: false, reason: 'MOCK: no grant calculation performed.', sourceUrl: sourceUrlFor('FAMILY_INCOME_LIMIT') }],
    PHG: [{ id: 'PHG_AMOUNT', passed: false, reason: 'MOCK: no grant calculation performed.', sourceUrl: sourceUrlFor('PHG_AMOUNT') }],
  };
  return {
    mock: true,
    totalGrantsCents: 0,
    grants: Object.entries(testsByGrant).map(([id, tests]) => ({ id, amountCents: 0, tests })),
    rulesetVersion: ruleset.version,
    rulesetStatus: ruleset.status,
    assessmentDate: payload.assessmentDate ?? `${payload.choice.applicationYear}-01-01`,
  };
}

// MOCK BTO projects (real one: GET /api/data/bto-projects, seat 3). Same shape as the route: prices in cents,
// before grants; top-level priceMinCents/priceMaxCents when one flatType is asked for. Filtered like the route.
const MOCK_BTO_PROJECTS = [
  { id: 'tampines-bliss', name: 'MOCK Tampines Bliss', town: 'TAMPINES', classification: 'STANDARD', launch: '2026-02', waitMonths: 23, subsidyRecoveryRate: 0,
    flats: [{ flatType: '3 ROOM', priceMinCents: 36_300_000, priceMaxCents: 44_400_000 }, { flatType: '4 ROOM', priceMinCents: 48_100_000, priceMaxCents: 60_000_000 }] },
  { id: 'tampines-nova', name: 'MOCK Tampines Nova', town: 'TAMPINES', classification: 'PLUS', launch: '2026-02', waitMonths: 32, subsidyRecoveryRate: 0.06,
    flats: [{ flatType: '4 ROOM', priceMinCents: 45_900_000, priceMaxCents: 60_200_000 }] },
  { id: 'ping-yi-court', name: 'MOCK Ping Yi Court', town: 'BEDOK', classification: 'STANDARD', launch: '2025-10', waitMonths: 33, subsidyRecoveryRate: 0,
    flats: [{ flatType: '4 ROOM', priceMinCents: 49_800_000, priceMaxCents: 62_400_000 }, { flatType: '5 ROOM', priceMinCents: 71_500_000, priceMaxCents: 85_700_000 }] },
].map((p) => ({ ...p, priceBasis: 'BEFORE_GRANTS', sourceUrl: 'https://www.hdb.gov.sg', sourceAccessed: '2026-10-11', verified: false }));

export function mockBtoProjects({ town, flatType, classification } = {}) {
  const projects = MOCK_BTO_PROJECTS
    .filter((p) => (!town || p.town === town) && (!classification || p.classification === classification))
    .map((p) => ({ ...p, flats: flatType ? p.flats.filter((f) => f.flatType === flatType) : p.flats }))
    .filter((p) => p.flats.length > 0)
    .map((p) => (p.flats.length === 1 ? { ...p, priceMinCents: p.flats[0].priceMinCents, priceMaxCents: p.flats[0].priceMaxCents } : p));
  return {
    mock: true,
    count: projects.length,
    projects,
    towns: [...new Set(MOCK_BTO_PROJECTS.map((p) => p.town))].sort(),
    dataAsOf: '2026-02',
    source: 'MOCK',
  };
}

// MOCK resale price basis (real one: GET /api/data/resale-price, seat 3). Money in cents (D14).
export function mockResalePrice({ town = 'MOCK TOWN', flatType = '4 ROOM' } = {}) {
  return {
    mock: true,
    town, flatType,
    window: { from: '2025-10', to: '2026-09', months: 12 },
    count: 100,
    medianPriceCents: 50_000_000, p25PriceCents: 45_000_000, p75PriceCents: 55_000_000,
    medianPricePerSqmCents: 500_000, medianFloorAreaSqm: 93, medianRemainingLeaseYears: 72.5,
    lowSample: false,
    source: { datasetId: 'MOCK', name: 'MOCK resale data' },
    cached: false, stale: false, fetchedAt: '2026-01-01T00:00:00.000Z',
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
    cached: false, stale: false, fetchedAt: '2026-01-01T00:00:00.000Z',
  };
}

// Mock auth: no real server, so accounts are "registered" into localStorage for the length of the
// browser session. Lets the login/register screens and the route guard be built and demoed before
// seat 3's /api/auth routes exist. Shape matches docs/API_CONTRACT.md: { token, user }.
// Errors mimic the axios shape (err.response.data.error.message) so auth.js handles mock and real
// errors identically.
const MOCK_USERS_KEY = 'hdb-app:mock-users';

function mockApiError(status, code, message) {
  const err = new Error(message);
  err.response = { status, data: { error: { code, message } } };
  return err;
}

function readMockUsers() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeMockUsers(users) {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch {
    // best-effort; mock mode is a dev convenience, not durable storage
  }
}

function mockToken(email) {
  return `mock.${btoa(email)}.${Date.now()}`;
}

export async function mockRegister({ name, email, password } = {}) {
  if (!name || !email || !password) throw mockApiError(400, 'VALIDATION_ERROR', 'Name, email and password are required.');
  if (password.length < 8) throw mockApiError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters.');
  const users = readMockUsers();
  if (users.some((u) => u.email === email)) throw mockApiError(409, 'EMAIL_TAKEN', 'That email is already registered.');
  users.push({ name, email, password }); // MOCK ONLY: plaintext in localStorage, never done server-side
  writeMockUsers(users);
  return { token: mockToken(email), user: { id: email, name, email } };
}

export async function mockLogin({ email, password } = {}) {
  const user = readMockUsers().find((u) => u.email === email && u.password === password);
  if (!user) throw mockApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  return { token: mockToken(email), user: { id: user.email, name: user.name, email: user.email } };
}
