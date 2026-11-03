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

  const result = {
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
              reason: 'MOCK: you said you’ll live near your parents.',
              sourceUrl: sourceUrlFor('PHG_LIVING_ARRANGEMENT'),
            },
          ],
        },
      ],
      clawbackCents: 0,
    }),
  };

  // D34: the real route adds gapBreakdown next to the outcomes (docs/API_CONTRACT.md "POST /api/compare").
  result.gapBreakdown = mockGapBreakdown(result.outcomeA, result.outcomeB);
  // D26 / D33: which launch and price the route used, and the resale median's basis.
  const project = mockPickProject(choiceA);
  const flat = project?.flats.find((f) => f.flatType === choiceA.flatType);
  if (project && flat) {
    result.btoProjectA = { id: project.id, name: project.name, launch: project.launch, waitMonths: project.waitMonths, priceMinCents: flat.priceMinCents, priceMaxCents: flat.priceMaxCents, sourceUrl: project.sourceUrl };
    result.resolvedA = { purchasePriceCents: choiceA.btoPriceCents ?? Math.round((flat.priceMinCents + flat.priceMaxCents) / 2), btoWaitMonths: project.waitMonths };
    // D40: the BTO price at which the verdict flips. Mock: 80% of the way up HDB's range, so the "split" case shows.
    const priceCents = Math.floor((flat.priceMinCents + 0.8 * (flat.priceMaxCents - flat.priceMinCents)) / 100) * 100;
    result.btoPriceBreakEven = {
      priceCents,
      atHdbMin: 'A',
      atHdbMax: 'B',
      hdbRangeCents: { min: flat.priceMinCents, max: flat.priceMaxCents },
      bracketCents: { min: Math.round(flat.priceMinCents * 0.5), max: Math.round(flat.priceMaxCents * 1.5) },
    };
    const dollars = (c) => `$${Math.round(c / 100).toLocaleString('en-SG')}`;
    result.btoPriceSentence = `MOCK: BTO leaves the household with the higher net financial position at the end of ${horizonYear} as long as the ${choiceA.flatType.toLowerCase().replace(' room', '-room')} costs under ${dollars(Math.floor(priceCents / 100_000) * 100_000)}; above that, resale does. That is inside HDB's range for ${project.name} (${dollars(flat.priceMinCents)} to ${dollars(flat.priceMaxCents)}). Prices are in today's terms. This is not a price forecast.`;
  } else {
    result.btoPriceBreakEven = null;
    result.btoPriceSentence = null;
  }
  result.resolvedB = {
    purchasePriceCents: choiceB.resalePriceCents ?? 66_500_000,
    medianPriceCents: 66_500_000,
    priceData: { source: 'MOCK resale prices', window: { from: '2025-10', to: '2026-09', months: 12 }, transactions: 120, leaseFilter: { minLeaseYears: 80, maxLeaseYears: 89 }, fellBackToAllLeases: false, lowSample: false },
  };
  // ...and warningMessages, a sentence for each warning code that occurs.
  result.warningMessages = mockWarningMessages([...result.outcomeA.warnings, ...result.outcomeB.warnings]);
  return result;
}

// The route's BTO pick (D33): the chosen launch, else the town's newest offering the flat type (and classification).
function mockPickProject(choice) {
  if (choice.btoProjectId) return MOCK_BTO_PROJECTS.find((p) => p.id === choice.btoProjectId) ?? null;
  return MOCK_BTO_PROJECTS
    .filter((p) => p.town === choice.town && (!choice.classification || p.classification === choice.classification))
    .filter((p) => p.flats.some((f) => f.flatType === choice.flatType))
    .sort((a, b) => String(b.launch).localeCompare(String(a.launch)))[0] ?? null;
}

// MOCK: /api/compare warningMessages. Wording copied from server/src/services/warningMessages.js, only for the
// codes the mock outcomes raise; add a line here if a mock outcome gains another code.
const MOCK_WARNING_MESSAGES = {
  BTO_WAIT_ASSUMED:
    "We don't have this project's waiting time, so the usual BTO wait from the ruleset is assumed. Your key date may differ.",
};

function mockWarningMessages(codes) {
  return Object.fromEntries(codes.filter((c) => MOCK_WARNING_MESSAGES[c]).map((c) => [c, MOCK_WARNING_MESSAGES[c]]));
}

// MOCK: /api/compare gapBreakdown (D34). Same shape as explainGap() in the server: 11 lines in a fixed order,
// signed so positive helps Path A, summing exactly to marginCents (= outcomeA minus outcomeB). The figures are
// invented for the mock (loosely modelled on server/src/engine/fixtures/gap-breakdown.json); the last line is
// worked out as the remainder, so the sum stays exact whatever the mock outcomes' net positions are.
function mockGapBreakdown(outcomeA, outcomeB) {
  const marginCents = outcomeA.netPositionCents - outcomeB.netPositionCents;
  const fixed = [
    { id: 'MARKET_VALUE', label: 'MOCK: Flat value at the horizon', amountCents: 6_300_000 },
    { id: 'LOAN_OWED', label: 'MOCK: Loan still owed', amountCents: 8_200_000 },
    { id: 'CPF_PRINCIPAL', label: 'MOCK: CPF savings to pay back', amountCents: -9_000_000 },
    { id: 'CPF_INTEREST', label: 'MOCK: CPF interest to pay back', amountCents: -1_200_000 },
    { id: 'CLAWBACK', label: 'MOCK: Subsidy clawback', amountCents: 0 },
    { id: 'RENT_WHILE_WAITING', label: 'MOCK: Rent while waiting for keys', amountCents: -2_850_000 },
    { id: 'RENOVATION', label: 'MOCK: Renovation', amountCents: -1_000_000 },
    { id: 'BSD', label: "MOCK: Buyer's stamp duty paid in cash", amountCents: 1_150_000 },
    { id: 'LEGAL', label: 'MOCK: Legal fees paid in cash', amountCents: 0 },
    { id: 'AGENT', label: "MOCK: Agent's fees", amountCents: 500_000 },
  ];
  const rest = marginCents - fixed.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    horizonYear: outcomeA.horizonYear,
    marginCents,
    lines: [...fixed, { id: 'CASH_PURCHASE', label: 'MOCK: Other cash paid for the flat', amountCents: rest }],
    totalGrants: { aCents: outcomeA.totalGrantsCents, bCents: outcomeB.totalGrantsCents },
  };
}

// MOCK: /api/timing — builds an Outcome per candidate year via mockOutcome(), the same helper
// mockCompare() uses, so the timing panel can be built before the real search exists.
// CONTRACT v2: see docs/API_CONTRACT.md "POST /api/timing".
export function mockTiming(payload = {}) {
  const assumptions = payload.assumptions ?? {};
  const choiceBase = payload.choiceBase ?? { path: 'BTO' };
  const isResale = choiceBase.path === 'RESALE';
  const evaluationStartYear = assumptions.evaluationStartYear ?? 2026;
  const thisYear = new Date().getFullYear();
  const candidateYears = payload.candidateYears
    ?? [thisYear, thisYear + 1, thisYear + 2, thisYear + 3, thisYear + 4, thisYear + 5];
  const moveInByYear = payload.profile?.constraints?.moveInByYear;

  const horizonYear = assumptions.horizonYear
    ?? keysYearFor({ ...choiceBase, applicationYear: candidateYears[candidateYears.length - 1] }, evaluationStartYear) + 10;

  const all = [];
  const skipped = [];

  candidateYears.forEach((year, i) => {
    const choice = { ...choiceBase, applicationYear: year };
    const keysYear = keysYearFor(choice, evaluationStartYear);

    if (moveInByYear && keysYear > moveInByYear) {
      skipped.push({ year, reason: 'MOVE_IN_DEADLINE_MISSED' });
      return;
    }

    const outcome = mockOutcome({
      choice,
      evaluationStartYear,
      horizonYear,
      netPositionCents: 15_000_000 + i * 700_000, // MOCK: arbitrary upward trend across candidate years
      cpfRefundPrincipalCents: isResale ? 21_000_000 : 14_000_000,
      cpfAccruedInterestCents: isResale ? 5_200_000 : 3_800_000,
      grants: [],
      clawbackCents: 0,
    });

    all.push({ year, outcome });
  });

  const best = all.length
    ? all.reduce((top, row) => (row.outcome.netPositionCents > top.outcome.netPositionCents ? row : top))
    : null;

  return {
    mock: true,
    rulesetVersion: rulesetSnapshot.version,
    horizonYear,
    best,
    all,
    skipped,
    explanation: [
      'MOCK: net financial position improves the later you apply, under these assumptions.',
      ...(skipped.length ? [`MOCK: ${skipped.length} candidate year(s) skipped (move-in deadline).`] : []),
    ],
    btoProject: null, // MOCK: fill in once seat 3's BTO project lookup is wired for a single choice
    assumptions,
    resolved: null, // MOCK: fill in once a single-choice resolved-lookup exists (compare() has resolvedA/B)
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

  // MOCK: the CPF savings refund (own OA money + interest, no grants) that net position uses (D1), derived so the
  // parts add up to netPositionCents exactly, as the real engine's do.
  const marketValueAtHorizonCents = 72_000_000;
  const outstandingLoanAtHorizonCents = 30_000_000;
  const cpfSavingsAccruedInterestCents = cpfAccruedInterestCents;
  const cpfSavingsRefundPrincipalCents = marketValueAtHorizonCents - outstandingLoanAtHorizonCents - (clawbackCents ?? 0)
    - housingCashSpentCents - netPositionCents - cpfSavingsAccruedInterestCents;

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
    marketValueAtHorizonCents,
    outstandingLoanAtHorizonCents,
    cpfSavingsRefundPrincipalCents,
    cpfSavingsAccruedInterestCents,
    cpfRefundPrincipalCents, // deprecated combined totals (savings + grants), as the server still sends them
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
// before grants, floor area as { min, max } m^2 ; top-level priceMinCents/priceMaxCents when one flatType is asked for. Filtered like the route.
const MOCK_BTO_PROJECTS = [
  { id: 'tampines-bliss', name: 'MOCK Tampines Bliss', town: 'TAMPINES', classification: 'STANDARD', launch: '2026-02', waitMonths: 23, subsidyRecoveryRate: 0,
    flats: [{ flatType: '3 ROOM', floorAreaSqm: { min: 67, max: 68 }, priceMinCents: 36_300_000, priceMaxCents: 44_400_000 }, { flatType: '4 ROOM', floorAreaSqm: { min: 92, max: 93 }, priceMinCents: 48_100_000, priceMaxCents: 60_000_000 }] },
  { id: 'tampines-nova', name: 'MOCK Tampines Nova', town: 'TAMPINES', classification: 'PLUS', launch: '2026-02', waitMonths: 32, subsidyRecoveryRate: 0.06,
    flats: [{ flatType: '4 ROOM', floorAreaSqm: { min: 90, max: 90 }, priceMinCents: 45_900_000, priceMaxCents: 60_200_000 }] },
  { id: 'simei-symphony', name: 'MOCK Simei Symphony', town: 'TAMPINES', classification: 'STANDARD', launch: '2025-07', waitMonths: 42, subsidyRecoveryRate: 0,
    flats: [{ flatType: '4 ROOM', floorAreaSqm: { min: 93, max: 93 }, priceMinCents: 52_900_000, priceMaxCents: 62_500_000 }, { flatType: '5 ROOM', floorAreaSqm: { min: 113, max: 113 }, priceMinCents: 68_000_000, priceMaxCents: 79_000_000 }] },
  { id: 'ping-yi-court', name: 'MOCK Ping Yi Court', town: 'BEDOK', classification: 'STANDARD', launch: '2025-10', waitMonths: 33, subsidyRecoveryRate: 0,
    flats: [{ flatType: '4 ROOM', floorAreaSqm: { min: 93, max: 93 }, priceMinCents: 49_800_000, priceMaxCents: 62_400_000 }, { flatType: '5 ROOM', floorAreaSqm: { min: 113, max: 113 }, priceMinCents: 71_500_000, priceMaxCents: 85_700_000 }] },
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
    medianPriceCents: 66_500_000, p25PriceCents: 62_000_000, p75PriceCents: 76_000_000, // as mock compare's resale median
    medianPricePerSqmCents: 500_000, medianFloorAreaSqm: 93, medianRemainingLeaseYears: 72.5,
    lowSample: false,
    source: { datasetId: 'MOCK', name: 'MOCK resale data' },
    cached: false, stale: false, fetchedAt: '2026-01-01T00:00:00.000Z',
  };
}

// Quarters from `start` (inclusive) to `end` (inclusive), both 'YYYY-Qn'. Used to build the mock RPI
// series and (by the real route, independently) to walk `from`/`to` query ranges.
function quartersFrom(start, end) {
  const [sy, sq] = start.split('-Q').map(Number);
  const [ey, eq] = end.split('-Q').map(Number);
  const out = [];
  for (let n = sy * 4 + (sq - 1); n <= ey * 4 + (eq - 1); n += 1) {
    out.push(`${Math.floor(n / 4)}-Q${(n % 4) + 1}`);
  }
  return out;
}

// Annualised growth between the series' last point and the one `years` back (same convention as the
// real /api/data/rpi route: measured back from the latest quarter, historical only, not a forecast).
function annualGrowth(series, years) {
  const n = years * 4;
  if (series.length <= n) return null;
  const now = series[series.length - 1].index;
  const then = series[series.length - 1 - n].index;
  return Math.round((((now / then) ** (1 / years) - 1) * 1000)) / 1000;
}

export function mockRpi() {
  // ~20.5 years of mock history so the era filter (5y/10y/20y/all) has something to show. A gentle
  // upward trend with a GFC-era dip (2008-2009) and a flatter cooling-measures stretch (2013-2016),
  // for a shape that looks like real HDB RPI data, not a straight line. Base 2009-Q1 = 100.
  const quarters = quartersFrom('2006-Q1', '2026-Q2');
  const series = quarters.map((quarter, i) => {
    const q09 = quartersFrom('2006-Q1', '2009-Q1').length - 1; // index of 2009-Q1, the base quarter
    let index = 100 * 1.008 ** (i - q09); // ~3.3%/yr baseline compounding off the base quarter
    if (i >= q09 - 4 && i < q09 + 2) index *= 0.9; // GFC dip either side of the base quarter
    if (quarter >= '2013-Q1' && quarter <= '2016-Q4') index *= 0.97; // cooling-measures flat stretch
    return { quarter, index: Math.round(index * 10) / 10 };
  });

  return {
    mock: true,
    base: '2009-Q1 = 100',
    latest: series[series.length - 1],
    historicalAnnualGrowth: { '5y': annualGrowth(series, 5), '10y': annualGrowth(series, 10), '20y': annualGrowth(series, 20) },
    count: series.length,
    series,
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
