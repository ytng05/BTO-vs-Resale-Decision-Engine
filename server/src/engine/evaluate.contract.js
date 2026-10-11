/**
 * CONTRACT v2 — FROZEN once #23 merges. Change only by a PR approved by seat 1
 * and every seat whose code reads the changed field.
 *
 * evaluate() is the single primitive the whole app is built on.
 * Every higher-level feature is a wrapper that calls it in a loop:
 *
 *   timing optimiser      → varies choice.applicationYear
 *   break-even solver     → varies assumptions, solves for equality (bisection)
 *   what-if sliders       → vary assumptions, renovation and the BTO price, one call per change
 *   backtest (later)      → varies assumptions (historical growth rates)
 *   (strategy recommender: dropped to future work, per the prof's feedback)
 *
 * v2 changes (D1 proposal #16; work split of 10 Oct): compare both paths at
 * the same calendar year (the horizon year) with no sale; BTO keys are worked
 * out from the application year plus the wait; rent while waiting, renovation,
 * affordability, MOP, a cost breakdown and a yearly cash flow are added.
 *
 * v2.1 (additive, D25 change PR): optional requestChoice.btoPriceCents (BTO
 * price slider), Outcome.purchasePriceCents, the before-grants price basis
 * (D26) and the 3–5 ROOM flat-type scope (D27).
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
 *   7. FAST. The what-if sliders rerun evaluate() on every change, and the
 *      solvers call it hundreds of times. No per-call setup that could be done
 *      once (e.g. parsing the ruleset).
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
 * btoWaiting, notes.eip and grants.checkSources are added by seat 2 (names confirmed 11 Oct).
 */
const RULESET_KEYS = Object.freeze({
  // CPF
  OA_RATE: 'cpf.oaInterestRate',
  ACCRUED_INTEREST_COMPOUNDING: 'cpf.accruedInterestCompounding', // 'ANNUAL' | 'MONTHLY' — see note below
  PARTIAL_MONTH_TREATMENT: 'cpf.partialMonthTreatment',           // 'EXCLUDE_BOTH' — see stub-period note

  // Loans and affordability
  HDB_RATE_PREMIUM: 'loans.hdbRatePremium',   // HDB concessionary rate = oaRate + this — see note below
  MSR: 'loans.msrPercent',                    // percent (30, not 0.30); applies to BOTH loan types
  TDSR: 'loans.tdsrPercent',                  // percent; applies to BANK loans ONLY
  LTV: 'loans.ltv',                           // conditional — see note below (bankLoan.ageBasis: 'IWAA')
  MAX_TENURE_HDB: 'loans.maxTenureYears.hdbLoan',
  MAX_TENURE_BANK: 'loans.maxTenureYears.bankLoanHdbFlats',
  MIN_CASH_DOWNPAYMENT: 'loans.minCashDownpaymentPercent', // { hdbLoan, bankLoan: { atMaxLtv, atReducedLtv } }

  // Duties and grants
  BSD_TIERS: 'transactionCosts.buyerStampDutyTiers',
  GRANT_EHG: 'grants.ehg',
  GRANT_FAMILY: 'grants.familyGrant',
  GRANT_PHG: 'grants.proximityHousingGrant',

  // Flat rules
  MOP_YEARS: 'classifications',               // classifications.<STANDARD|PLUS|PRIME>.mopYears
  BTO_DEFAULT_WAIT_MONTHS: 'btoWaiting.defaultMonths', // 48, an assumption: fallback when no project or town wait applies
  // btoWaiting.shorterWaitingTimeThresholdMonths (36) is read by the UI only, to label SWT projects.
  // notes.eip = { text, sourceUrl } is shown by the UI only; the engine doesn't read it.
  // grants.checkSources = { <test id>: <url> } is read by seat 2's grants.js to fill EligibilityTest.sourceUrl.

  // Provenance
  VERSION: 'version'
});

/**
 * NOTE ON LTV — agreed with seat 2, 2026-10-08.
 * LTV is a rule, not a scalar. The ruleset expresses it as:
 *   loans.ltv.hdbLoan  = { maxPercent }
 *   loans.ltv.bankLoan = { maxPercent, reducedMaxPercent,
 *                          reducedIfTenureYearsOver, reducedIfLoanEndsAfterAge }
 * For a bank loan, reducedMaxPercent applies if the tenure exceeds
 * reducedIfTenureYearsOver OR the loan ends after the borrower reaches
 * reducedIfLoanEndsAfterAge; otherwise maxPercent. All values are percents
 * (whole numbers, not decimals). The figures themselves live only in the
 * ruleset. The figure used is reported in resolvedRates.ltvApplied as a
 * DECIMAL (75 in the ruleset → 0.75).
 */

/**
 * NOTE ON COMPOUNDING — resolved 2026-10.
 * CPF computes interest monthly at the OA rate but compounds it ANNUALLY.
 * Earlier drafts of our brief said monthly; they were wrong. Read the
 * frequency from RULESET_KEYS.ACCRUED_INTEREST_COMPOUNDING so the two can be
 * compared by flipping one config value.
 * Source: CPF Board, via seat 2's verification.
 * The ruleset stores the value as 'ANNUAL' with the description in a note
 * (agreed with seat 2, 2026-10-08).
 */

/**
 * NOTE ON PARTIAL MONTHS AND THE STUB PERIOD — stated assumption, seat 1.
 * Pending CPF Board confirmation.
 *
 * Contract v2: there is no sale (D1). Every rule below that says "sale" applies
 * at the HORIZON date instead: computeAccruedInterest() is called with the
 * horizon date as asOfDate.
 *
 * Accrued interest is pro-rated to the sale month, counting full calendar
 * months only. A month counts if the obligation existed for the whole of it,
 * so partial months are excluded at both ends: the withdrawal month at entry
 * and the sale month at exit (cpf.partialMonthTreatment = 'EXCLUDE_BOTH').
 *
 * Interest for the stub period (the full months from the last credit, or from
 * the first withdrawal if there has been no credit yet, up to the sale) is
 * SIMPLE, not compounded: oaRate ÷ 12 per full month, applied to the
 * obligation carried into the stub period: the obligation as at the last
 * December credit where one exists, otherwise the principal withdrawn before
 * the stub began.
 *   - After a December credit, the base is principal PLUS all interest
 *     credited to date. Do not reduce it to principal only.
 *   - Before any December credit (first-year sale), no interest exists yet,
 *     so the base is principal only.
 *
 * Worked example: a sale in month 114 (June 2036) gives a stub of January to
 * May 2036 — five months. June is excluded as the sale month.
 *
 * Instalments paid during the stub are not in the obligation carried into it.
 * Each one
 * earns simple interest from the month after it is paid, up to the last full
 * month before sale. In the example above, an instalment paid in February
 * 2036 earns March to May (three months); one paid in May earns nothing.
 *
 * Rounding: interest is carried at full precision within the year and
 * rounded to whole cents only when it is credited — at each annual
 * (December) credit, and once at the stub credit on sale. The stub is not an
 * annual credit but it is a credit, so it rounds the same way: once, on the
 * stub total, never month by month. Round to the NEAREST cent, halves up.
 */

/**
 * NOTE ON HDB RATE — agreed with seat 2, 2026-10-08.
 * The HDB concessionary rate is pegged to the OA rate (CPF Board), so the
 * ruleset stores the peg, loans.hdbRatePremium, and the engine computes
 * hdbConcessionaryRate = oaRate + hdbRatePremium. It then moves with oaRate
 * in the backtest. If either value is missing, the engine reports
 * hdbConcessionaryRate: null and warns HDB_RATE_UNRESOLVED.
 */

/**
 * NOTE ON THE MEASURE (D1) — per the D1 proposal (#16).
 * Both paths are measured at the SAME calendar year, assumptions.horizonYear.
 * There is no sale. At the horizon:
 *
 *   netPositionCents =   marketValueAtHorizonCents
 *                      − outstandingLoanAtHorizonCents
 *                      − (cpfRefundPrincipalCents + cpfAccruedInterestCents)
 *                      − clawbackCents
 *                      − housingCashSpentCents
 *
 * - The CPF refund obligation ranks the paths identically to "total wealth
 *   including the CPF OA balance": the two differ only by the OA balance the
 *   household would have had without buying, which is the same on both paths.
 *   It comes from computeAccruedInterest() called with the horizon date.
 * - housingCashSpentCents counts only housing cash out, from
 *   evaluationStartYear to the horizon: upfront cash, the cash part of
 *   instalments, cash-paid stamp duty / fees / renovation, and rent while
 *   waiting. CPF-paid costs are NOT cash spent (they are in the CPF obligation).
 * - Market value: a BTO flat is worth market value at keys (near-new resale
 *   comparables from seat 3), NOT its subsidised price; resale starts from its
 *   purchase price. Both then grow at annualPriceGrowth to the horizon.
 * - clawbackCents: Plus/Prime only, subsidyRecoveryRate × market value at the
 *   horizon (D18 rate). With no sale it doesn't trigger, but it reduces what the
 *   flat is worth to the owner.
 */

/**
 * NOTE ON THE TIMELINE — per the D1 proposal (#16).
 * - The household enters choice.applicationYear. Application date = 1 Jan of
 *   that year (the same date grants are assessed on).
 * - BTO keys = application date + btoWaitMonths, to the MONTH (the CPF ledger is
 *   monthly). Wait source, chosen by the route: the chosen project's wait from
 *   seat 3's seed; else the median across that town's seeded projects; else
 *   ruleset btoWaiting.defaultMonths (seat 2: 48 months), flagged as an assumption.
 * - Resale keys = the application (purchase) date; no wait.
 * - BTO cash and CPF are paid in stages (signing the agreement for lease, then
 *   keys); each stage is a dated ledger entry. Stage split: D5 / EDGE_CASES.md.
 * - HORIZON DATE = 31 Dec of assumptions.horizonYear (end of that year). Every
 *   month of horizonYear counts and December's CPF credit is included: the
 *   engine calls computeAccruedInterest() with asOfDate = 1 Jan of
 *   (horizonYear + 1). Each path's keys must be on or before the horizon date
 *   (key month ≤ Dec of horizonYear); evaluate() throws otherwise and the route
 *   returns 400. Default horizonYear: later key year + 10.
 */

/**
 * NOTE ON THE INSTALMENT SPLIT — agreed on #16 (option a), stated limitation.
 * Each monthly instalment is paid from CPF OA first, while the OA balance
 * lasts, then in cash. OA available = the applicants' cpfOaBalanceCents minus
 * CPF used at purchase. Ongoing monthly OA contributions are NOT modelled yet,
 * so CPF runs out sooner than in reality and housing cash spent is overstated;
 * the UI states this. CPF-paid instalments are ledger entries for
 * computeAccruedInterest(); cash-paid ones count in housingCashSpentCents.
 */

/**
 * NOTE ON RENT WHILE WAITING — per the D1 proposal (#16).
 * Applies to BOTH paths: assumptions.monthlyHousingCostWhileWaitingCents for
 * every month from evaluationStartYear until that path's keys. Default 0
 * (living with parents), which leans towards BTO; the UI shows a prominent
 * slider with a sourced rental guide.
 */

/**
 * NOTE ON THE BTO PRICE — D26, seat 1 with seat 3 (v2.1).
 * purchasePriceCents is always BEFORE grants; evaluate() subtracts grants
 * itself, exactly once. Seat 3's seed records this as priceBasis:
 * 'BEFORE_GRANTS' (HDB's launch tables), and the route refuses any other basis.
 * HDB publishes a price RANGE per project and flat type, not a distribution,
 * so the route uses requestChoice.btoPriceCents when given (it must lie inside
 * the range) and otherwise the range's midpoint. Stated limitation: resale is
 * priced at a transaction median, BTO at the midpoint of two extremes, so the
 * two paths' prices come from different statistics, and the range (e.g. $119k
 * for a Tampines Bliss 4-room, $481k–$600k) is as large as the grants being compared. The
 * dashboard therefore shows the price used next to HDB's range and gives the
 * user a slider. Flat types are 3 ROOM, 4 ROOM and 5 ROOM on both paths (D27).
 */

/**
 * NOTE ON MOP — information, not a constraint (D1: there is no sale).
 * timeline.earliestSaleDate = keys + mopYears (ruleset, by classification;
 * resale buyers face the same MOP from their keys). Shown so users know when
 * they could sell; not used in netPositionCents.
 */

/**
 * NOTE ON AFFORDABILITY.
 * affordability.maxLoanCents = the smallest of the loan limits that apply:
 *   - MSR (both loan types): instalment ≤ msrPercent of monthly household income
 *   - TDSR (bank loans only): all debt instalments ≤ tdsrPercent of income
 *   - LTV: loan ≤ ltv × price (bank-loan reduction by tenure / IWAA age)
 *   - tenure: ≤ maxTenureYears for the loan type
 * Income is the household's projected 12-month average at the application
 * date. limitingRule names the limit that binds. If the loan needed exceeds
 * maxLoanCents, withinLimit is false, shortfallCents says by how much, and the
 * warning LOAN_ABOVE_LIMIT is added.
 */

/**
 * NOTE ON GRANTS — agreed with seat 2.
 * Grants are computed by seat 2's evaluateGrants(profile, choice,
 * assessmentDate, ruleset) in rules/grants.js, which uses the same per-person
 * Profile shape as this contract but money in DOLLARS. evaluate() is the only
 * caller and converts at that boundary: applicant monthlyIncomeCents and
 * cpfOaBalanceCents → dollars going in, ehg / familyGrant / phg → cents coming
 * out. Each eligibility[] entry is { id, grant, grantGroup, passed, reason,
 * sourceUrl }: grantGroup → GrantResult.id ('EHG' → 'EHG', 'Family Grant' →
 * 'FAMILY', 'PHG' → 'PHG'); id, passed, reason and sourceUrl → tests[] unchanged.
 * Test ids are owned by seat 2 (e.g. EHG_INCOME_CEILING, EHG_MIN_LEASE,
 * FAMILY_RESALE_ONLY, PHG_LIVING_ARRANGEMENT); the full list is in rules/grants.js.
 * sourceUrl comes from the ruleset (grants.checkSources: { <test id>: <url> }, seat 2), never from code.
 *
 * assessmentDate is `${choice.applicationYear}-01-01` (D13, v2: the APPLICATION
 * year, because income ceilings are checked at application and income grows
 * during a BTO wait). evaluateGrants() does not age anyone from that date: it
 * treats the ages it is given as ages at assessmentDate. So evaluate() passes
 * each applicant's age projected to the application year,
 * age + (applicationYear - evaluationStartYear).
 * Income is treated the same way: evaluateGrants() reads monthlyIncome as
 * the 12-month average AT assessmentDate, so evaluate() passes each
 * applicant's monthlyIncomeCents projected to the application year,
 * monthlyIncome × (1 + annualIncomeGrowth) ^ (applicationYear - evaluationStartYear),
 * converted to dollars. The input is already a 12-month average, so growing
 * it by the same factor keeps it one.
 * choice.remainingLeaseYears is already the lease at purchase.
 */

/** Warning codes surfaced in Outcome.warnings. */
const WARNINGS = Object.freeze({
  HDB_RATE_UNRESOLVED: 'HDB_RATE_UNRESOLVED',
  LEASE_BELOW_95_PRORATION: 'LEASE_BELOW_95_PRORATION',
  INCOME_CEILING_BREACHED_AT_PURCHASE: 'INCOME_CEILING_BREACHED_AT_PURCHASE',
  CLASSIFICATION_CLAWBACK_ESTIMATED: 'CLASSIFICATION_CLAWBACK_ESTIMATED',
  CASH_SHORTFALL_AT_PURCHASE: 'CASH_SHORTFALL_AT_PURCHASE', // cashRequiredAtPurchaseCents > cashSavingsCents (D19)
  LOAN_ABOVE_LIMIT: 'LOAN_ABOVE_LIMIT',                     // loan needed > affordability.maxLoanCents
  MOVE_IN_DEADLINE_MISSED: 'MOVE_IN_DEADLINE_MISSED',       // keys later than profile.constraints.moveInByYear
  BTO_WAIT_ASSUMED: 'BTO_WAIT_ASSUMED'                      // wait came from btoWaiting.defaultMonths, not a project
});

// ---------------------------------------------------------------------------
// INPUTS
// ---------------------------------------------------------------------------

/**
 * One applicant. CPF accounts, grants, first-timer status and the CPF refund
 * are all per person, so the household is a list of these.
 * @typedef {Object} Applicant
 * @property {number} age                     - at evaluationStartYear
 * @property {'SC'|'PR'} citizenship
 * @property {boolean} firstTimer
 * @property {number} monthlyIncomeCents      - gross, 12-month average basis
 * @property {number} cpfOaBalanceCents       - at evaluation start
 */

/**
 * Household constraints. Used to prune or flag choices, never to change maths.
 * @typedef {Object} Constraints
 * @property {number|null} [moveInByYear]     - "must move in by"; a path with keys later than this
 *                                              warns MOVE_IN_DEADLINE_MISSED and the timing optimiser
 *                                              skips it
 */

/**
 * Who the household is. Fixed across every choice being compared.
 * Scope: EXACTLY two applicants, at least one a Singapore Citizen. Singles and
 * PR+PR households are not modelled yet; evaluate() throws and routes return 400.
 * @typedef {Object} Profile
 * @property {Applicant[]} applicants         - exactly 2, at least one 'SC'
 * @property {number} cashSavingsCents        - household cash held TODAY, at evaluationStartYear (D19).
 *                                              No further saving is assumed until monthlySavings is
 *                                              defined. Checked against cashRequiredAtPurchaseCents:
 *                                              a shortfall for an application in evaluationStartYear lets the
 *                                              timing optimiser prune that choice; for a later purchase
 *                                              year it only warns (CASH_SHORTFALL_AT_PURCHASE), because
 *                                              saving in between may cover it. The UI shows this assumption.
 * @property {Constraints} [constraints]
 */

/**
 * The decision being evaluated. This is what the search wrappers vary.
 * @typedef {Object} Choice
 * @property {'BTO'|'RESALE'} path
 * @property {number} applicationYear         - BTO: year of application; resale: year of purchase (= keys)
 * @property {string} town                    - HDB town name, uppercase
 * @property {string} flatType                - e.g. '4 ROOM'
 * @property {'STANDARD'|'PLUS'|'PRIME'|null} classification - null for resale
 * @property {number} purchasePriceCents      - supplied by the caller, NOT fetched here; BEFORE grants (D26)
 * @property {number} marketValueAtKeysCents  - BTO: near-new resale comparable at keys (seat 3);
 *                                              resale: equal to purchasePriceCents
 * @property {number} remainingLeaseYears     - 99 for BTO; resale: lower bound of the user's lease band (D16)
 * @property {'WITH'|'NEAR'|'NONE'} [livingArrangement] - resale only, for PHG; declared by the user,
 *                                              not measured (D15); defaults to 'NONE'
 * @property {number} [btoWaitMonths]         - BTO only: months from application to keys (see timeline note)
 * @property {boolean} [btoWaitAssumed]       - true when btoWaitMonths came from btoWaiting.defaultMonths
 * @property {number} [renovationCents]       - renovation budget for this path, spent at keys; default 0
 * @property {number} [subsidyRecoveryRate]   - BTO Plus/Prime only: decimal, e.g. 0.06. Per project, from
 *                                              seat 3's BTO seed record, not the ruleset (D18). 0 / omitted for
 *                                              Standard and resale. Missing for Plus/Prime → warn
 *                                              CLASSIFICATION_CLAWBACK_ESTIMATED
 */

/**
 * The uncertain inputs. This is what the sliders, solvers and backtest vary.
 * @typedef {Object} Assumptions
 * @property {number} annualPriceGrowth       - decimal, e.g. 0.024
 * @property {number} annualIncomeGrowth      - decimal
 * @property {number} horizonYear             - common measurement year; horizon date = 31 Dec of this year;
 *                                              both paths' keys must be on or before it (D1, D22)
 * @property {number} monthlyHousingCostWhileWaitingCents - rent until keys, both paths; default 0
 * @property {number} loanTenureYears
 * @property {'HDB'|'BANK'} loanType          - TDSR is checked for 'BANK' only
 * @property {number} evaluationStartYear
 * @property {number} legalFeesCents          - estimate, not policy (D17); server default if not supplied
 * @property {number} agentFeesCents          - estimate, not policy (D17); server default if not supplied
 */

// ---------------------------------------------------------------------------
// API REQUEST — what the client sends to POST /api/compare
// ---------------------------------------------------------------------------
// Not the engine's input. The route turns a CompareRequest into Profile /
// Choice / Assumptions: it looks up purchasePriceCents (BTO: btoPriceCents or the
// midpoint of the project's range, D26) and marketValueAtKeysCents,
// sets remainingLeaseYears from leaseBand (D16), resolves btoWaitMonths (project
// → town's newest project → ruleset fallback), fills loan defaults and horizonYear if
// omitted, and sets evaluationStartYear. The client store mirrors this shape,
// except money, which the store keeps in dollars and converts to …Cents when
// sending (D14).

/**
 * @typedef {Object} RequestChoice
 * @property {'BTO'|'RESALE'} path
 * @property {number} applicationYear
 * @property {string} town                    - HDB town name, uppercase
 * @property {string} flatType                - '3 ROOM' | '4 ROOM' | '5 ROOM' (D27); anything else → 400
 * @property {'STANDARD'|'PLUS'|'PRIME'|null} classification - null for resale
 * @property {string} [btoProjectId]          - BTO only: id of a project from GET /api/data/bto-projects
 *                                              (seat 3's seed); sets the price range and the wait. Picker
 *                                              filtered by town and flat type. If omitted, the route uses
 *                                              the town's newest project offering the flat type
 * @property {number} [btoPriceCents]         - BTO only, v2.1: price slider. Must lie within the project's
 *                                              [priceMinCents, priceMaxCents] for the flat type, else 400.
 *                                              Default: the midpoint of that range (D26)
 * @property {number} [btoWaitMonths]         - BTO only, optional override
 * @property {'WITH'|'NEAR'|'NONE'} [livingArrangement] - resale only (D15)
 * @property {string} [leaseBand]             - resale only, e.g. '80-89' (D16)
 * @property {number} [renovationCents]       - default 0
 */

/**
 * @typedef {Object} RequestAssumptions
 * @property {number} annualPriceGrowth       - decimal
 * @property {number} annualIncomeGrowth      - decimal
 * @property {number} [horizonYear]           - default: later key year + 10
 * @property {number} [monthlyHousingCostWhileWaitingCents] - default 0
 * @property {number} [loanTenureYears]       - server default if omitted
 * @property {'HDB'|'BANK'} [loanType]        - server default if omitted
 * @property {number} [legalFeesCents]        - server default if omitted (D17)
 * @property {number} [agentFeesCents]        - server default if omitted (D17)
 */

/**
 * No purchasePriceCents, marketValueAtKeysCents, remainingLeaseYears or
 * evaluationStartYear: the server sets those. Profile is the engine Profile
 * (money in cents).
 * @typedef {Object} CompareRequest
 * @property {Profile} profile
 * @property {RequestChoice} choiceA
 * @property {RequestChoice} choiceB
 * @property {RequestAssumptions} assumptions
 */

// ---------------------------------------------------------------------------
// OUTPUT
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EligibilityTest
 * @property {string} id                      - e.g. 'EHG_INCOME_CEILING'
 * @property {boolean} passed
 * @property {string} reason                  - human-readable; seat 2 renders this
 * @property {string|null} sourceUrl          - official source for this check (seat 2), from the ruleset.
 *                                              Lets each check link to its source; whether the standalone
 *                                              Sources page stays is a UI choice with no contract impact
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
 * ALL values here are decimals (0.025, 0.75), never percents. The ruleset
 * stores some figures as whole-number percents in `…Percent` fields; the
 * engine converts them once, on resolution.
 * @typedef {Object} ResolvedRates
 * @property {number} oaRate                  - decimal, e.g. 0.025
 * @property {number|null} hdbConcessionaryRate - decimal, oaRate + hdbRatePremium; null if unresolved
 * @property {'ANNUAL'|'MONTHLY'} accruedInterestCompounding - enum, not a rate
 * @property {number} ltvApplied              - decimal, e.g. 0.75 (ruleset stores 75)
 */

/**
 * Dates are 'YYYY-MM-DD' (1st of the month).
 * @typedef {Object} Timeline
 * @property {string} applicationDate
 * @property {string} keyCollectionDate
 * @property {number} monthsWaiting           - 0 for resale
 * @property {string} earliestSaleDate        - keys + MOP; information only (no sale in D1)
 */

/**
 * @typedef {Object} Affordability
 * @property {number} maxLoanCents            - smallest applicable limit (see affordability note)
 * @property {number} loanRequiredCents
 * @property {boolean} withinLimit
 * @property {number} shortfallCents          - 0 when within the limit
 * @property {'MSR'|'TDSR'|'LTV'|'TENURE'} limitingRule
 */

/**
 * One line of the cost breakdown. Lines are cumulative from evaluationStartYear
 * to the horizon. id: 'BSD' | 'LEGAL' | 'AGENT' | 'RENOVATION' | 'RENT_WHILE_WAITING' |
 * 'LOAN_INTEREST' | 'CPF_ACCRUED_INTEREST' | 'CLAWBACK'.
 * @typedef {Object} CostLine
 * @property {string} id
 * @property {string} label                   - for display, e.g. "Buyer's stamp duty"
 * @property {number} amountCents
 * @property {'CASH'|'CPF'|'NONE'} paidFrom   - NONE for obligations not yet paid (CPF interest, clawback)
 */

/**
 * One row per calendar year, evaluationStartYear to horizonYear inclusive.
 * Balances are as at 31 Dec; the last row (horizonYear) is the horizon date itself.
 * @typedef {Object} CashFlowYear
 * @property {number} year
 * @property {number} housingCashOutCents     - cash spent on housing that year (rent, cash instalments, fees)
 * @property {number} cpfUsedCents            - CPF withdrawn for housing that year
 * @property {number} loanBalanceEndCents
 * @property {number} marketValueEndCents     - 0 before keys
 * @property {number} cpfObligationEndCents   - CPF principal + accrued interest owed back to the OA
 */

/**
 * @typedef {Object} Outcome
 * @property {number} horizonYear
 * @property {Timeline} timeline
 * @property {number} totalGrantsCents
 * @property {GrantResult[]} grants
 * @property {number} purchasePriceCents      - v2.1: the price used, before grants (echo of choice.purchasePriceCents)
 * @property {Affordability} affordability
 * @property {number} cashRequiredAtPurchaseCents - cash the household pays from its own savings at purchase,
 *                                              AFTER using the CPF OA balance and grants and after the loan
 *                                              (e.g. any minimum cash downpayment required for a bank loan,
 *                                              per the ruleset). BTO pays in stages; see EDGE_CASES.md.
 * @property {number} cpfUsedAtPurchaseCents
 * @property {number} loanPrincipalCents
 * @property {number} marketValueAtHorizonCents
 * @property {number} outstandingLoanAtHorizonCents
 * @property {number} cpfRefundPrincipalCents  - CPF principal owed back at the horizon
 * @property {number} cpfAccruedInterestCents  - accrued interest owed back at the horizon (D12 conventions)
 * @property {number} clawbackCents           - Plus/Prime only, else 0
 * @property {number} housingCashSpentCents   - sum of the CASH-paid cost lines and cash instalments
 * @property {CostLine[]} costBreakdown
 * @property {CashFlowYear[]} yearlyCashFlow
 * @property {number} netPositionCents        - the headline figure (see the measure note)
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
 * @throws if the profile is out of scope (not exactly two applicants, or no SC)
 *         or horizonYear is before this choice's keys
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
  const startYear = assumptions.evaluationStartYear ?? 2026;
  const horizonYear = assumptions.horizonYear ?? startYear + 14;
  const keysYear = isResale ? choice.applicationYear : choice.applicationYear + 4;
  const yearlyCashFlow = [];
  for (let year = startYear; year <= horizonYear; year += 1) {
    const hasKeys = year >= keysYear;
    yearlyCashFlow.push({
      year,
      housingCashOutCents: hasKeys ? 600_000 : 1_200_000,
      cpfUsedCents: hasKeys ? 1_440_000 : 0,
      loanBalanceEndCents: hasKeys ? Math.max(0, 45_000_000 - (year - keysYear) * 1_500_000) : 0,
      marketValueEndCents: hasKeys ? 60_000_000 + (year - keysYear) * 1_500_000 : 0,
      cpfObligationEndCents: hasKeys ? 8_000_000 + (year - keysYear) * 1_700_000 : 0
    });
  }
  return {
    horizonYear,
    timeline: {
      applicationDate: `${choice.applicationYear}-01-01`,
      keyCollectionDate: `${keysYear}-${isResale ? '01' : '05'}-01`,
      monthsWaiting: isResale ? 0 : 52,
      earliestSaleDate: `${keysYear + 5}-${isResale ? '01' : '05'}-01`
    },
    totalGrantsCents: isResale ? 11_000_000 : 6_000_000,
    grants: [
      {
        id: 'EHG',
        amountCents: 6_000_000,
        tests: [{ id: 'EHG_INCOME_CEILING', passed: true, reason: 'STUB — not computed', sourceUrl: null }]
      },
      {
        id: 'FAMILY',
        amountCents: isResale ? 5_000_000 : 0,
        tests: [{ id: 'FAMILY_RESALE_ONLY', passed: isResale, reason: 'STUB — not computed', sourceUrl: null }]
      },
      {
        id: 'PHG',
        amountCents: 0,
        tests: [{ id: 'PHG_LIVING_ARRANGEMENT', passed: false, reason: 'STUB — not computed', sourceUrl: null }]
      }
    ],
    purchasePriceCents: choice.purchasePriceCents ?? (isResale ? 55_000_000 : 37_850_000),
    affordability: {
      maxLoanCents: 48_000_000,
      loanRequiredCents: 45_000_000,
      withinLimit: true,
      shortfallCents: 0,
      limitingRule: 'MSR'
    },
    cashRequiredAtPurchaseCents: 4_500_000,
    cpfUsedAtPurchaseCents: 8_000_000,
    loanPrincipalCents: 45_000_000,
    marketValueAtHorizonCents: 72_000_000,
    outstandingLoanAtHorizonCents: 30_000_000,
    cpfRefundPrincipalCents: 20_000_000,
    cpfAccruedInterestCents: 3_200_000,
    clawbackCents: 0,
    housingCashSpentCents: 6_300_000,
    costBreakdown: [
      { id: 'BSD', label: "Buyer's stamp duty", amountCents: 1_110_000, paidFrom: 'CPF' },
      { id: 'RENOVATION', label: 'Renovation', amountCents: 3_000_000, paidFrom: 'CASH' },
      { id: 'RENT_WHILE_WAITING', label: 'Rent while waiting', amountCents: isResale ? 0 : 3_300_000, paidFrom: 'CASH' },
      { id: 'LOAN_INTEREST', label: 'Loan interest', amountCents: 8_000_000, paidFrom: 'CPF' },
      { id: 'CPF_ACCRUED_INTEREST', label: 'CPF accrued interest owed', amountCents: 3_200_000, paidFrom: 'NONE' }
    ],
    yearlyCashFlow,
    netPositionCents: 12_500_000,
    resolvedRates: {
      oaRate: 0.025,
      hdbConcessionaryRate: 0.026,
      accruedInterestCompounding: 'ANNUAL',
      ltvApplied: 0.75
    },
    rulesetVersion: 'STUB',
    warnings: isResale ? [] : [WARNINGS.BTO_WAIT_ASSUMED]
  };
}

export { evaluate, stubEvaluate, RULESET_KEYS, WARNINGS };
