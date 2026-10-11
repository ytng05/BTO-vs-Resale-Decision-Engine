// The evaluate() primitive. Everything else wraps this.
// Conventions: evaluate.contract.js (contract v2) and D28–D32. Money is integer cents throughout,
// except at the one call into evaluateGrants(), which works in dollars (NOTE ON GRANTS).
import { RULESET_KEYS, WARNINGS } from './evaluate.contract.js';
import { evaluateGrants } from './rules/grants.js';
import { computeMaxLoan } from './loan/affordability.js';
import { buildLoanSchedule } from './loan/amortisation.js';
import { computeBuyerStampDuty } from './costs/transactionCosts.js';
import { computeAccruedInterest } from './cpf/accruedInterest.js';

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

// Read a dotted ruleset path, e.g. RULESET_KEYS.OA_RATE → ruleset.cpf.oaInterestRate
const read = (ruleset, path) => path.split('.').reduce((node, key) => node?.[key], ruleset);

// Absolute month number (year * 12 + zero-based month) ↔ 'YYYY-MM-01'
const monthOf = (year, month1 = 1) => year * 12 + (month1 - 1);
const toMonthNumber = (date) => {
  const [y, m] = date.split('-').map(Number);
  return monthOf(y, m);
};
const toDate = (monthNumber) => {
  const y = Math.floor(monthNumber / 12);
  const m = (monthNumber % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
};
const yearOf = (monthNumber) => Math.floor(monthNumber / 12);

// D31: value × (1 + g)^(months / 12), rounded to the cent once per step
const grow = (cents, g, months) => Math.round(cents * (1 + g) ** (months / 12));

// Grant group (seat 2's eligibility[].grantGroup) → GrantResult.id
const GRANT_GROUP_TO_ID = Object.freeze({ EHG: 'EHG', 'Family Grant': 'FAMILY', PHG: 'PHG' });

// ---------------------------------------------------------------------------
// evaluate()
// ---------------------------------------------------------------------------

/**
 * @param {import('./types.js').Profile} profile
 * @param {import('./types.js').Choice} choice
 * @param {import('./types.js').Assumptions} assumptions
 * @param {object} ruleset  versioned ruleset from loadRuleset()
 * @returns {import('./types.js').Outcome}
 */
export function evaluate(profile, choice, assumptions, ruleset) {
  const warnings = new Set();
  const isBto = choice.path === 'BTO';
  const g = assumptions.annualPriceGrowth;
  const startYear = assumptions.evaluationStartYear;
  const horizonYear = assumptions.horizonYear;

  // -------------------------------------------------------------------------
  // 1. Scope checks
  // -------------------------------------------------------------------------
  const applicants = profile.applicants ?? [];
  if (applicants.length !== 2) {
    throw new RangeError(`Exactly two applicants are modelled, got ${applicants.length}`);
  }
  if (!applicants.some((a) => a.citizenship === 'SC')) {
    throw new RangeError('At least one applicant must be a Singapore Citizen');
  }
  if (assumptions.loanType !== 'HDB') {
    throw new RangeError(`Bank loans aren't modelled yet (D32); loanType must be 'HDB', got '${assumptions.loanType}'`);
  }

  // Ruleset keys not in RULESET_KEYS yet: fail loudly, naming the key, rather than guess a value.
  for (const [key, value] of [
    ['btoWaiting.monthsToAgreementForLease', ruleset.btoWaiting?.monthsToAgreementForLease],
    ['loans.hdbLoanOaRetentionPerBuyer', ruleset.loans?.hdbLoanOaRetentionPerBuyer],
    ['loans.btoDownpaymentStages.hdbLoan.atSigningPercent', ruleset.loans?.btoDownpaymentStages?.hdbLoan?.atSigningPercent]
  ]) {
    if (typeof value !== 'number') throw new Error(`Ruleset key ${key} is missing or not a number`);
  }

  // -------------------------------------------------------------------------
  // 2. Timeline (NOTE ON THE TIMELINE)
  // -------------------------------------------------------------------------
  const startMonth = monthOf(startYear);
  const applicationMonth = monthOf(choice.applicationYear);
  let monthsWaiting = 0;
  if (isBto) {
    monthsWaiting = choice.btoWaitMonths ?? read(ruleset, RULESET_KEYS.BTO_DEFAULT_WAIT_MONTHS);
    if (choice.btoWaitAssumed) warnings.add(WARNINGS.BTO_WAIT_ASSUMED);
  }
  const keyMonth = applicationMonth + monthsWaiting;
  const horizonMonth = monthOf(horizonYear + 1); // 1 Jan of horizonYear + 1 (asOfDate for CPF)
  if (keyMonth >= horizonMonth) {
    throw new RangeError(`Keys (${toDate(keyMonth)}) are after the horizon (31 Dec ${horizonYear})`);
  }
  // D30: signing = application + monthsToAgreementForLease, never after keys.
  // btoWaiting.monthsToAgreementForLease (#35) is a stated assumption, not HDB's figure (D30); checked above.
  const signingMonth = isBto
    ? Math.min(applicationMonth + ruleset.btoWaiting.monthsToAgreementForLease, keyMonth)
    : keyMonth;

  // Resale buyers face the same MOP as a Standard flat (NOTE ON MOP)
  const mopYears = read(ruleset, RULESET_KEYS.MOP_YEARS)[choice.classification ?? 'STANDARD'].mopYears;
  const timeline = {
    applicationDate: toDate(applicationMonth),
    keyCollectionDate: toDate(keyMonth),
    monthsWaiting,
    earliestSaleDate: toDate(keyMonth + mopYears * 12)
  };

  // -------------------------------------------------------------------------
  // 3. Grants (NOTE ON GRANTS): dollars in, cents out; ages and income projected to the application year
  // -------------------------------------------------------------------------
  const yearsToApplication = choice.applicationYear - startYear;
  const projected = applicants.map((a) => ({
    age: a.age + yearsToApplication,
    monthlyIncomeCents: Math.round(a.monthlyIncomeCents * (1 + assumptions.annualIncomeGrowth) ** yearsToApplication)
  }));
  const grantsProfile = {
    applicants: applicants.map((a, i) => ({
      age: projected[i].age,
      citizenship: a.citizenship,
      firstTimer: a.firstTimer,
      monthlyIncome: projected[i].monthlyIncomeCents / 100,
      cpfOaBalance: a.cpfOaBalanceCents / 100
    }))
  };
  const grantsOut = evaluateGrants(grantsProfile, choice, `${choice.applicationYear}-01-01`, ruleset);
  const grantAmountCents = {
    EHG: Math.round(grantsOut.ehg * 100),
    FAMILY: Math.round(grantsOut.familyGrant * 100),
    PHG: Math.round(grantsOut.phg * 100)
  };
  const grants = ['EHG', 'FAMILY', 'PHG'].map((id) => ({
    id,
    amountCents: grantAmountCents[id],
    tests: grantsOut.eligibility
      .filter((e) => GRANT_GROUP_TO_ID[e.grantGroup] === id)
      .map(({ id: testId, passed, reason, sourceUrl }) => ({ id: testId, passed, reason, sourceUrl }))
  }));
  const totalGrantsCents = grantAmountCents.EHG + grantAmountCents.FAMILY + grantAmountCents.PHG;

  // -------------------------------------------------------------------------
  // 4. Prices (D31): today's values grown month-precisely, rounded once per step
  // -------------------------------------------------------------------------
  // BTO: price fixed at application; resale: price at purchase (= application = keys)
  const priceCents = grow(choice.purchasePriceCents, g, applicationMonth - startMonth);
  // BTO market value is rounded at keys, then later grown from that rounded value
  const marketValueAtKeysCents = grow(choice.marketValueAtKeysCents, g, keyMonth - startMonth);
  const marketValueAt = (asOfMonth) =>
    keyMonth < asOfMonth ? grow(marketValueAtKeysCents, g, asOfMonth - keyMonth) : 0;

  // -------------------------------------------------------------------------
  // 5. Rates and affordability (NOTE ON HDB RATE, NOTE ON AFFORDABILITY)
  // -------------------------------------------------------------------------
  const oaRate = read(ruleset, RULESET_KEYS.OA_RATE);
  const premium = read(ruleset, RULESET_KEYS.HDB_RATE_PREMIUM);
  // Round away float noise (0.025 + 0.001 = 0.026000000000000002) before it reaches the schedule
  const hdbConcessionaryRate =
    typeof oaRate === 'number' && typeof premium === 'number'
      ? Math.round((oaRate + premium) * 1e6) / 1e6
      : null;
  // Every loan is an HDB loan (D32), so an unresolved HDB rate can't be scheduled: throw rather than warn
  if (hdbConcessionaryRate === null) {
    throw new Error('HDB loan needs cpf.oaInterestRate and loans.hdbRatePremium in the ruleset');
  }

  const maxLoan = computeMaxLoan(
    {
      loanType: assumptions.loanType,
      loanRate: hdbConcessionaryRate,
      tenureAskedYears: assumptions.loanTenureYears,
      purchasePriceCents: priceCents,
      remainingLeaseYears: choice.remainingLeaseYears,
      applicants: projected
    },
    ruleset
  );
  if (maxLoan.ltvProrated) warnings.add(WARNINGS.LEASE_BELOW_95_PRORATION);

  const loanRate = hdbConcessionaryRate; // HDB loans only (D32)

  // -------------------------------------------------------------------------
  // 6. Funding plan (D28 / D30). Every OA withdrawal and grant is a dated CPF ledger entry.
  // -------------------------------------------------------------------------
  // D28 v2: each buyer keeps their own OA up to hdbLoanOaRetentionPerBuyer (DOLLARS in the ruleset), or
  // their whole OA if less; the household retention is the sum. Stated assumption: the full amount is kept.
  const perBuyerRetentionCents = Math.round(ruleset.loans.hdbLoanOaRetentionPerBuyer * 100);
  const retentionCents = applicants.reduce(
    (sum, a) => sum + Math.min(a.cpfOaBalanceCents, perBuyerRetentionCents),
    0
  );
  let oaLeftCents = applicants.reduce((sum, a) => sum + a.cpfOaBalanceCents, 0);

  const ledger = [];          // { date, amountCents, kind } for computeAccruedInterest()
  const cashOut = [];         // { month, amountCents } every cash payment, for the yearly rows
  let cpfUsedAtPurchaseCents = 0;
  let cashRequiredAtPurchaseCents = 0;

  const payOa = (month, cents, kind) => {
    if (cents <= 0) return;
    oaLeftCents -= cents;
    cpfUsedAtPurchaseCents += cents;
    ledger.push({ date: toDate(month), amountCents: cents, kind });
  };
  const payCash = (month, cents, { atPurchase = true } = {}) => {
    if (cents <= 0) return;
    cashOut.push({ month, amountCents: cents });
    if (atPurchase) cashRequiredAtPurchaseCents += cents;
  };
  // OA above the retention first, the rest in cash
  const payOaAboveRetentionThenCash = (month, cents) => {
    const fromOa = Math.min(cents, Math.max(0, oaLeftCents - retentionCents));
    payOa(month, fromOa, 'LUMP_SUM');
    payCash(month, cents - fromOa);
  };
  // A fee is paid whole from the OA left if it covers it, else whole in cash
  const payFee = (month, cents) => {
    if (cents <= oaLeftCents) {
      payOa(month, cents, 'LUMP_SUM');
      return 'CPF';
    }
    payCash(month, cents);
    return 'CASH';
  };

  const bsdCents = computeBuyerStampDuty(priceCents, ruleset);
  const legalCents = assumptions.legalFeesCents ?? 0;
  const agentCents = assumptions.agentFeesCents ?? 0;
  const renovationCents = choice.renovationCents ?? 0;
  let bsdPaidFrom;
  let legalPaidFrom;

  // Grants are credited when used, each part a GRANT ledger entry dated then (D29 v2)
  let grantsLeftCents = totalGrantsCents;
  const useGrants = (month, dueCents) => {
    const used = Math.min(grantsLeftCents, dueCents);
    if (used > 0) {
      ledger.push({ date: toDate(month), amountCents: used, kind: 'GRANT' });
      grantsLeftCents -= used;
    }
    return used;
  };

  // BTO signing (D30 v2): the signing percent of the price from grants first, then OA above the
  // retention, then cash; then stamp duty, then legal fees
  let priceDueAtKeysCents = priceCents;
  if (isBto) {
    const atSigningPercent = ruleset.loans.btoDownpaymentStages.hdbLoan.atSigningPercent;
    const signingCents = Math.round((priceCents * atSigningPercent) / 100);
    const grantAtSigningCents = useGrants(signingMonth, signingCents);
    payOaAboveRetentionThenCash(signingMonth, signingCents - grantAtSigningCents);
    priceDueAtKeysCents -= signingCents;
    bsdPaidFrom = payFee(signingMonth, bsdCents);
    legalPaidFrom = payFee(signingMonth, legalCents);
  }

  // At keys: grants, then OA above the retention, then the loan, then cash
  let remainingCents = priceDueAtKeysCents;
  remainingCents -= useGrants(keyMonth, remainingCents);
  // Grants left over after the price (grantsLeftCents) go to the CPF Special/Retirement and MediSave
  // accounts (HDB Sign Agreement for Lease page; seat 2 on #46), so they never reach the OA: they can't pay
  // fees or instalments and aren't refund principal. D1 doesn't count CPF balances, so they drop out here;
  // they never make a grant lower net position, and counting them is still open (D1).
  const oaAtKeysCents = Math.min(remainingCents, Math.max(0, oaLeftCents - retentionCents));
  payOa(keyMonth, oaAtKeysCents, 'LUMP_SUM');
  remainingCents -= oaAtKeysCents;

  const loanRequiredCents = remainingCents;
  const loanPrincipalCents = Math.min(loanRequiredCents, maxLoan.maxLoanCents);
  const shortfallCents = loanRequiredCents - loanPrincipalCents;
  if (shortfallCents > 0) warnings.add(WARNINGS.LOAN_ABOVE_LIMIT);
  payCash(keyMonth, shortfallCents);

  // Resale: stamp duty and legal fees at keys, after the price
  if (!isBto) {
    bsdPaidFrom = payFee(keyMonth, bsdCents);
    legalPaidFrom = payFee(keyMonth, legalCents);
  }

  // Always cash, at keys. Renovation is not part of cashRequiredAtPurchaseCents.
  payCash(keyMonth, agentCents);
  payCash(keyMonth, renovationCents, { atPurchase: false });

  // Rent while waiting: start month up to (not including) the key month. Not "at purchase".
  const rentCents = assumptions.monthlyHousingCostWhileWaitingCents ?? 0;
  let rentTotalCents = 0;
  for (let m = startMonth; m < keyMonth; m += 1) {
    payCash(m, rentCents, { atPurchase: false });
    if (rentCents > 0) rentTotalCents += rentCents;
  }

  // -------------------------------------------------------------------------
  // 7–8. Loan schedule and the monthly instalment split (NOTE ON THE INSTALMENT SPLIT)
  // -------------------------------------------------------------------------
  // Only payments BEFORE the horizon month count. OA first while it lasts, then cash.
  const schedule = loanPrincipalCents > 0
    ? buildLoanSchedule({
        principalCents: loanPrincipalCents,
        annualRate: loanRate,
        tenureYears: maxLoan.tenureYears, // the asked tenure after HDB's caps
        keyCollectionDate: toDate(keyMonth)
      }).filter((row) => toMonthNumber(row.paymentDate) < horizonMonth)
    : [];

  let totalInterestCents = 0;
  let instalmentsFromOaCents = 0;
  let instalmentsInCashCents = 0;
  const closingByMonth = new Map(); // payment month → closing balance
  for (const row of schedule) {
    const month = toMonthNumber(row.paymentDate);
    const fromOa = Math.min(row.instalmentCents, Math.max(0, oaLeftCents));
    if (fromOa > 0) {
      oaLeftCents -= fromOa;
      ledger.push({ date: row.paymentDate, amountCents: fromOa, kind: 'INSTALMENT' });
    }
    payCash(month, row.instalmentCents - fromOa, { atPurchase: false });
    instalmentsFromOaCents += fromOa;
    instalmentsInCashCents += row.instalmentCents - fromOa;
    totalInterestCents += row.interestCents;
    closingByMonth.set(month, row.closingBalanceCents);
  }

  // Loan balance at the end of a month: last closing balance on or before it; the principal if
  // keys have passed but no payment has fallen due yet; 0 before keys.
  const loanBalanceAt = (endMonth) => {
    if (keyMonth > endMonth || loanPrincipalCents === 0) return 0;
    for (let m = endMonth; m > keyMonth; m -= 1) {
      if (closingByMonth.has(m)) return closingByMonth.get(m);
    }
    return loanPrincipalCents;
  };

  // -------------------------------------------------------------------------
  // 9. CPF refund obligation (D2, D12) at the horizon and at each year end
  // -------------------------------------------------------------------------
  // computeAccruedInterest() throws on entries after asOfDate, so pass only entries before it.
  const cpfAt = (asOfMonth, include = () => true) =>
    computeAccruedInterest(
      ledger.filter((e) => toMonthNumber(e.date) < asOfMonth && include(e)),
      toDate(asOfMonth),
      ruleset
    );
  // Savings only: the household's own CPF, leaving out the GRANT entries.
  const cpfSavingsAt = (asOfMonth) => cpfAt(asOfMonth, (e) => e.kind !== 'GRANT');

  const cpfHorizon = cpfAt(horizonMonth);
  const ownRefund = cpfSavingsAt(horizonMonth);
  // Grant parts are differences, not a separate run, so savings + grant parts sum to the full
  // refund exactly to the cent despite D12's rounding.
  const grantRefundPrincipalCents = cpfHorizon.principalCents - ownRefund.principalCents;
  const grantRefundAccruedInterestCents = cpfHorizon.accruedInterestCents - ownRefund.accruedInterestCents;

  const yearlyCashFlow = [];
  for (let year = startYear; year <= horizonYear; year += 1) {
    const nextJan = monthOf(year + 1);
    const inYear = (month) => yearOf(month) === year;
    yearlyCashFlow.push({
      year,
      housingCashOutCents: cashOut.filter((c) => inYear(c.month)).reduce((s, c) => s + c.amountCents, 0),
      cpfUsedCents: ledger
        .filter((e) => e.kind !== 'GRANT' && inYear(toMonthNumber(e.date)))
        .reduce((s, e) => s + e.amountCents, 0),
      loanBalanceEndCents: loanBalanceAt(nextJan - 1),
      marketValueEndCents: marketValueAt(nextJan),
      cpfObligationEndCents: cpfAt(nextJan).totalCents,
      cpfSavingsObligationEndCents: cpfSavingsAt(nextJan).totalCents
    });
  }

  // -------------------------------------------------------------------------
  // 10. Horizon figures (NOTE ON THE MEASURE)
  // -------------------------------------------------------------------------
  const marketValueAtHorizonCents = marketValueAt(horizonMonth);
  const outstandingLoanAtHorizonCents = loanBalanceAt(horizonMonth - 1);

  let clawbackCents = 0;
  if (choice.classification === 'PLUS' || choice.classification === 'PRIME') {
    if (typeof choice.subsidyRecoveryRate !== 'number') {
      warnings.add(WARNINGS.CLASSIFICATION_CLAWBACK_ESTIMATED);
    }
    clawbackCents = Math.round(marketValueAtHorizonCents * (choice.subsidyRecoveryRate ?? 0));
  }

  // Every cash payment up to the horizon (cashOut only holds months before it)
  const housingCashSpentCents = cashOut.reduce((s, c) => s + c.amountCents, 0);

  const netPositionCents =
    marketValueAtHorizonCents
    - outstandingLoanAtHorizonCents
    - ownRefund.totalCents
    - clawbackCents
    - housingCashSpentCents;

  // -------------------------------------------------------------------------
  // 11. Warnings and cost breakdown
  // -------------------------------------------------------------------------
  if (cashRequiredAtPurchaseCents > profile.cashSavingsCents) warnings.add(WARNINGS.CASH_SHORTFALL_AT_PURCHASE);
  const moveInByYear = profile.constraints?.moveInByYear;
  if (typeof moveInByYear === 'number' && yearOf(keyMonth) > moveInByYear) {
    warnings.add(WARNINGS.MOVE_IN_DEADLINE_MISSED);
  }

  // LOAN_INTEREST paidFrom: whichever source paid more of the instalments counted to the horizon
  // (ties go to CPF). The tests don't check it; the split itself is in yearlyCashFlow.
  const costBreakdown = [
    { id: 'BSD', label: "Buyer's stamp duty", amountCents: bsdCents, paidFrom: bsdPaidFrom },
    { id: 'LEGAL', label: 'Legal fees', amountCents: legalCents, paidFrom: legalPaidFrom },
    { id: 'AGENT', label: 'Agent fees', amountCents: agentCents, paidFrom: 'CASH' },
    { id: 'RENOVATION', label: 'Renovation', amountCents: renovationCents, paidFrom: 'CASH' },
    { id: 'RENT_WHILE_WAITING', label: 'Rent while waiting', amountCents: rentTotalCents, paidFrom: 'CASH' },
    {
      id: 'LOAN_INTEREST',
      label: 'Loan interest',
      amountCents: totalInterestCents,
      paidFrom: instalmentsInCashCents > instalmentsFromOaCents ? 'CASH' : 'CPF'
    },
    {
      id: 'CPF_ACCRUED_INTEREST',
      label: 'CPF accrued interest owed',
      amountCents: ownRefund.accruedInterestCents, // savings only, as in netPositionCents
      paidFrom: 'NONE'
    },
    { id: 'CLAWBACK', label: 'Subsidy clawback (Plus/Prime)', amountCents: clawbackCents, paidFrom: 'NONE' }
  ];

  return {
    horizonYear,
    timeline,
    totalGrantsCents,
    grants,
    affordability: {
      maxLoanCents: maxLoan.maxLoanCents,
      loanRequiredCents,
      withinLimit: shortfallCents === 0,
      shortfallCents,
      limitingRule: maxLoan.limitingRule
    },
    cashRequiredAtPurchaseCents,
    cpfUsedAtPurchaseCents,
    purchasePriceCents: priceCents, // grown to the application date (D31), not today's input
    loanPrincipalCents,
    marketValueAtHorizonCents,
    outstandingLoanAtHorizonCents,
    cpfRefundPrincipalCents: cpfHorizon.principalCents,
    cpfAccruedInterestCents: cpfHorizon.accruedInterestCents,
    cpfSavingsRefundPrincipalCents: ownRefund.principalCents,
    cpfSavingsAccruedInterestCents: ownRefund.accruedInterestCents,
    grantRefundPrincipalCents,
    grantRefundAccruedInterestCents,
    clawbackCents,
    housingCashSpentCents,
    costBreakdown,
    yearlyCashFlow,
    netPositionCents,
    resolvedRates: {
      oaRate,
      hdbConcessionaryRate,
      accruedInterestCompounding: read(ruleset, RULESET_KEYS.ACCRUED_INTEREST_COMPOUNDING),
      ltvApplied: maxLoan.ltvApplied,
      assessmentRate: maxLoan.assessmentRate
    },
    rulesetVersion: read(ruleset, RULESET_KEYS.VERSION),
    warnings: [...warnings]
  };
}
