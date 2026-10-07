/**
 * CONTRACT — do not change without team agreement.
 *
 * evaluate() is the single primitive the whole app is built on.
 * Every higher-level feature is a wrapper that calls it in a loop:
 *
 *   timing optimiser      → varies choice.purchaseYear
 *   strategy recommender  → varies every field of choice
 *   backtest              → varies assumptions (historical growth rates)
 *   break-even solver     → varies assumptions, solves for equality
 *
 * INVARIANTS — these are what make the wrappers cheap. Breaking any of
 * them breaks every feature above.
 *
 *   1. PURE. No database reads, no fetch, no Date.now(), no randomness.
 *      Everything needed must arrive in the arguments.
 *   2. DETERMINISTIC. Same inputs always produce the same output.
 *   3. NO FORMATTING. Return numbers. Currency formatting happens in the UI.
 *   4. BREAKDOWN, NOT JUST TOTALS. Seat 2's eligibility view and seat 5's
 *      charts both read the components, not the headline figure.
 *   5. MONEY IS INTEGER CENTS. Thirty years of compounding in a loop will
 *      drift if we use floats. Convert at the UI boundary, and at the one
 *      call into seat 2's evaluateGrants(), which works in dollars — see
 *      NOTE ON GRANTS below.
 *   6. NO POLICY VALUES IN CODE. Every rate, ceiling, tier and threshold
 *      is read from the ruleset. If you are about to type a number that
 *      came from HDB, CPF or IRAS, it belongs in the ruleset instead.
 *      Seat 2 owns those values; this file owns their shape.
 *
 * Owner: seat 1. Consumers: seats 2, 3, 4, 5.
 */

// ---------------------------------------------------------------------------
// RULESET DEPENDENCY
// ---------------------------------------------------------------------------

/**
 * Every ruleset key this engine reads. Seat 2: if a path here does not match
 * your JSON, tell seat 1 rather than renaming — the engine reads these exactly.
 *
 * Kept as a constant so the dependency is visible in code, not just in chat.
 */
const RULESET_KEYS = Object.freeze({
  // CPF
  OA_RATE: 'cpf.oaInterestRate',
  ACCRUED_INTEREST_COMPOUNDING: 'cpf.accruedInterestCompounding', // 'ANNUAL' | 'MONTHLY' — see note below
  PARTIAL_MONTH_TREATMENT: 'cpf.partialMonthTreatment',           // 'EXCLUDE_BOTH' — see stub-period note

  // Loans
  HDB_RATE_PREMIUM: 'loans.hdbRatePremium',   // HDB concessionary rate = oaRate + this — see note below
  MSR: 'loans.msrPercent',                    // percent (30, not 0.30); applies to BOTH loan types
  TDSR: 'loans.tdsrPercent',                  // percent; applies to BANK loans ONLY
  LTV: 'loans.ltv',                           // conditional — see note below
  MAX_TENURE_HDB: 'loans.maxTenureYears.hdbLoan',
  MAX_TENURE_BANK: 'loans.maxTenureYears.bankLoanHdbFlats',

  // Duties and grants
  BSD_TIERS: 'transactionCosts.buyerStampDutyTiers',
  GRANT_EHG: 'grants.ehg',
  GRANT_FAMILY: 'grants.familyGrant',
  GRANT_PHG: 'grants.proximityHousingGrant',

  // Provenance
  VERSION: 'version'
});

/**
 * NOTE ON LTV — open question with seat 2.
 * LTV is not a scalar. It is 75%, dropping to 55% when loan tenure exceeds
 * the threshold or the loan extends past the age limit. The ruleset needs to
 * express that as a rule, not a number, or this engine will be wrong for
 * long-tenure and older-borrower cases. Shape TBC.
 */

/**
 * NOTE ON COMPOUNDING — resolved 2026-10.
 * CPF computes interest monthly at the OA rate but compounds it ANNUALLY.
 * Earlier drafts of our brief said monthly; they were wrong. Read the
 * frequency from RULESET_KEYS.ACCRUED_INTEREST_COMPOUNDING so the two can be
 * compared by flipping one config value.
 * Source: CPF Board, via seat 2's verification.
 * OPEN: the ruleset currently stores this as prose ("computed monthly at OA
 * rate, compounded yearly"), not as 'ANNUAL' | 'MONTHLY'. Seat 2 to confirm.
 */

/**
 * NOTE ON PARTIAL MONTHS AND THE STUB PERIOD — stated assumption, seat 1.
 * Pending CPF Board confirmation.
 *
 * Accrued interest is pro-rated to the sale month, counting full calendar
 * months only. A month counts if the obligation existed for the whole of it,
 * so partial months are excluded at both ends: the withdrawal month at entry
 * and the sale month at exit (cpf.partialMonthTreatment = 'EXCLUDE_BOTH').
 *
 * Interest for the stub period (after the last December credit, up to the
 * sale) is SIMPLE, not compounded: oaRate ÷ 12 per full month, applied to the
 * balance carried forward from the last December credit.
 *
 * Worked example: a sale in month 114 (June 2036) gives a stub of January to
 * May 2036 — five months. June is excluded as the sale month.
 *
 * Instalments paid during the stub are not in the December balance. Each one
 * earns simple interest from the month after it is paid, up to the last full
 * month before sale. In the example above, an instalment paid in February
 * 2036 earns March to May (three months); one paid in May earns nothing.
 *
 * Rounding: interest is carried at full precision within the year and
 * rounded to whole cents only when it is credited — at each annual
 * (December) credit, and once at the stub credit on sale. The stub is not an
 * annual credit but it is a credit, so it rounds the same way: once, on the
 * stub total, never month by month.
 */

/**
 * NOTE ON HDB RATE — open question with seat 2.
 * The engine wants a premium over the OA rate (loans.hdbRatePremium) so the
 * HDB rate moves with oaRate in the backtest. The ruleset currently has a
 * flat loans.hdbConcessionaryRate (null). Until one is filled in, the engine
 * reports hdbConcessionaryRate: null and warns HDB_RATE_UNRESOLVED.
 */

/**
 * NOTE ON GRANTS — agreed with seat 2.
 * Grants are computed by seat 2's evaluateGrants(profile, choice,
 * assessmentDate, ruleset) in rules/grants.js, which uses the same per-person
 * Profile shape as this contract but money in DOLLARS. evaluate() is the only
 * caller and converts at that boundary: applicant monthlyIncomeCents and
 * cpfOaBalanceCents → dollars going in, ehg / familyGrant / phg → cents coming
 * out. Its eligibility[] checks map onto GrantResult.tests.
 */

/** Warning codes surfaced in Outcome.warnings. */
const WARNINGS = Object.freeze({
  HDB_RATE_UNRESOLVED: 'HDB_RATE_UNRESOLVED',
  LEASE_BELOW_95_PRORATION: 'LEASE_BELOW_95_PRORATION',
  INCOME_CEILING_BREACHED_AT_PURCHASE: 'INCOME_CEILING_BREACHED_AT_PURCHASE',
  CLASSIFICATION_CLAWBACK_ESTIMATED: 'CLASSIFICATION_CLAWBACK_ESTIMATED'
});

// ---------------------------------------------------------------------------
// INPUTS
// ---------------------------------------------------------------------------

/**
 * One applicant. CPF accounts, grants, first-timer status and the CPF refund
 * on sale are all per person, so the household is a list of these.
 * @typedef {Object} Applicant
 * @property {number} age
 * @property {'SC'|'PR'} citizenship
 * @property {boolean} firstTimer
 * @property {number} monthlyIncomeCents      - gross, 12-month average basis
 * @property {number} cpfOaBalanceCents       - at evaluation start
 */

/**
 * Who the household is. Fixed across every choice being compared.
 * Same shape as seat 2's types.js Profile, with money in cents.
 * @typedef {Object} Profile
 * @property {Applicant[]} applicants         - 1 or 2 people
 */

/**
 * The decision being evaluated. This is what the search wrappers vary.
 * @typedef {Object} Choice
 * @property {'BTO'|'RESALE'} path
 * @property {number} purchaseYear            - four-digit year
 * @property {string} town                    - HDB town name, uppercase
 * @property {string} flatType                - e.g. '4 ROOM'
 * @property {'STANDARD'|'PLUS'|'PRIME'|null} classification - null for resale
 * @property {number} purchasePriceCents      - supplied by the caller, NOT fetched here
 * @property {number} remainingLeaseYears     - 99 for BTO
 * @property {'WITH'|'NEAR'|'NONE'} [livingArrangement] - with/near parents, for PHG; defaults to 'NONE'
 */

/**
 * The uncertain inputs. This is what the backtest and break-even solver vary.
 * @typedef {Object} Assumptions
 * @property {number} annualPriceGrowth       - decimal, e.g. 0.024
 * @property {number} annualIncomeGrowth      - decimal
 * @property {number} holdingPeriodYears      - years from purchase to sale
 * @property {number} loanTenureYears
 * @property {'HDB'|'BANK'} loanType          - TDSR is checked for 'BANK' only
 * @property {number} evaluationStartYear
 */

// ---------------------------------------------------------------------------
// OUTPUT
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EligibilityTest
 * @property {string} id                      - e.g. 'EHG_INCOME_CEILING'
 * @property {boolean} passed
 * @property {string} reason                  - human-readable; seat 2 renders this
 */

/**
 * @typedef {Object} GrantResult
 * @property {string} id                      - 'EHG' | 'FAMILY' | 'PHG'
 * @property {number} amountCents             - 0 if not eligible
 * @property {EligibilityTest[]} tests
 */

/**
 * Rates actually used, after resolution from the ruleset.
 * Exposed so the annual-vs-monthly comparison is a diff of two outcomes,
 * and so a wrong figure is visible rather than buried in the maths.
 * @typedef {Object} ResolvedRates
 * @property {number} oaRate
 * @property {number|null} hdbConcessionaryRate - oaRate + hdbRatePremium; null if unresolved
 * @property {'ANNUAL'|'MONTHLY'} accruedInterestCompounding
 * @property {number} ltvApplied
 */

/**
 * @typedef {Object} Outcome
 * @property {number} totalGrantsCents
 * @property {GrantResult[]} grants
 * @property {number} cashRequiredAtPurchaseCents
 * @property {number} cpfUsedAtPurchaseCents
 * @property {number} loanPrincipalCents
 * @property {number} totalInterestPaidCents
 * @property {number} salePriceCents          - projected under assumptions
 * @property {number} cpfRefundPrincipalCents
 * @property {number} cpfAccruedInterestCents
 * @property {number} outstandingLoanAtSaleCents
 * @property {number} transactionCostsCents   - BSD, legal, agent, levy
 * @property {number} clawbackCents           - Plus/Prime only, else 0
 * @property {number} netPositionCents        - the headline figure
 * @property {ResolvedRates} resolvedRates
 * @property {string} rulesetVersion          - stamped so saved scenarios are reproducible
 * @property {string[]} warnings              - values from WARNINGS
 */

// ---------------------------------------------------------------------------
// THE PRIMITIVE
// ---------------------------------------------------------------------------

/**
 * Evaluate one housing choice for one household under one set of assumptions.
 *
 * @param {Profile} profile
 * @param {Choice} choice
 * @param {Assumptions} assumptions
 * @param {Object} ruleset - the versioned policy config (seat 2 owns this)
 * @returns {Outcome}
 */
function evaluate(profile, choice, assumptions, ruleset) {
  throw new Error('Not implemented — seat 1');
}

// ---------------------------------------------------------------------------
// STUB — for seats 4 and 5 to build screens against before the engine lands.
// Returns fixed, obviously-fake numbers in the correct shape.
// Delete once evaluate() is implemented.
// ---------------------------------------------------------------------------

/**
 * @param {Profile} profile
 * @param {Choice} choice
 * @param {Assumptions} assumptions
 * @returns {Outcome}
 */
function stubEvaluate(profile, choice, assumptions) {
  const isResale = choice.path === 'RESALE';
  return {
    totalGrantsCents: isResale ? 11_000_000 : 6_000_000,
    grants: [
      {
        id: 'EHG',
        amountCents: 6_000_000,
        tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'STUB — not computed' }]
      },
      {
        id: 'FAMILY',
        amountCents: isResale ? 5_000_000 : 0,
        tests: [{ id: 'FAMILY_RESALE_ONLY', passed: isResale, reason: 'STUB — not computed' }]
      },
      {
        id: 'PHG',
        amountCents: 0,
        tests: [{ id: 'PHG_PROXIMITY', passed: false, reason: 'STUB — not computed' }]
      }
    ],
    cashRequiredAtPurchaseCents: 4_500_000,
    cpfUsedAtPurchaseCents: 8_000_000,
    loanPrincipalCents: 45_000_000,
    totalInterestPaidCents: 12_000_000,
    salePriceCents: 72_000_000,
    cpfRefundPrincipalCents: 20_000_000,
    cpfAccruedInterestCents: 3_200_000,
    outstandingLoanAtSaleCents: 30_000_000,
    transactionCostsCents: 1_800_000,
    clawbackCents: 0,
    netPositionCents: 17_000_000,
    resolvedRates: {
      oaRate: 0.025,
      hdbConcessionaryRate: null,
      accruedInterestCompounding: 'ANNUAL',
      ltvApplied: 0.75
    },
    rulesetVersion: 'STUB',
    warnings: [WARNINGS.HDB_RATE_UNRESOLVED]
  };
}

export { evaluate, stubEvaluate, RULESET_KEYS, WARNINGS };
