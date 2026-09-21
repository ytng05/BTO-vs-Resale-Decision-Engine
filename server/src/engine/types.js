// PROPOSED shapes for the evaluate() primitive. Seats 1 and 2 must agree and finalise these in week 1.
// Everything else (timing optimiser, strategy search, break-even solver, backtest) wraps evaluate().
// Engine functions are PURE: no I/O, no Date.now(), no randomness. Pass the "as-of" date in.

/**
 * @typedef {'BTO'|'RESALE'} Path
 * @typedef {'STANDARD'|'PLUS'|'PRIME'} Classification   BTO only. Resale flats have no class in this model.
 * @typedef {'SC'|'PR'} Citizenship
 *
 * @typedef {Object} Person
 * @property {number} age
 * @property {Citizenship} citizenship
 * @property {boolean} firstTimer          per person, not per household
 * @property {number} monthlyIncome        current gross monthly income
 * @property {number} cpfOaBalance
 *
 * @typedef {Object} Profile
 * @property {Person[]} applicants         1 or 2 people
 * @property {number} cashSavings
 * @property {number} monthlySavings
 * @property {{ postal?: string, lat?: number, lng?: number }} [parentsAddress]  for the PHG distance test
 *
 * @typedef {Object} Choice
 * @property {Path} path
 * @property {number} purchaseYear         calendar year
 * @property {string} town
 * @property {string} flatType             e.g. '4 ROOM'
 * @property {Classification} [classification]   required when path === 'BTO'
 *
 * @typedef {Object} Assumptions
 * @property {number} priceGrowth          annual, as a fraction (0.03 = 3%)
 * @property {number} incomeGrowth         annual, as a fraction
 * @property {number} horizonYears         the common horizon both paths are compared at
 * @property {string} asOfDate             ISO date; the "today" the engine works from
 * // TODO (seats 1+2): add rent-while-waiting, BTO waiting years, loan rate, renovation, etc.
 *
 * @typedef {Object} Outcome
 * @property {number} netFinancialPosition  say "net financial position after N years", never "profit"
 * @property {{ principal: number, accruedInterest: number, total: number }} cpfRefund
 * @property {{ ehg: number, familyGrant: number, phg: number, total: number }} grants
 * @property {Array<{ grant: string, passed: boolean, reason: string }>} eligibility  one entry per test, each with its own reason
 * @property {number} subsidyClawback       0 for Standard and resale
 * @property {string} rulesetVersion        every result records which ruleset produced it
 * // TODO (seats 1+2): cash timeline, monthly ledger, loan balance, sale proceeds breakdown
 */
export {};
