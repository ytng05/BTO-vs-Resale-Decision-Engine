// SEAT 2 owns this file (rules engine).
import { NotImplementedError } from '../errors.js';

/**
 * Grant eligibility. Return the amounts AND one explanation per test, so the UI can render
 * each failed test with its own reason (not a generic message).
 *
 * @param {import('../types.js').Profile} profile
 * @param {import('../types.js').Choice} choice
 * @param {string} assessmentDate  ISO date the household is assessed on (projected for future purchases)
 * @param {object} ruleset
 * @returns {{
 *   ehg: number, familyGrant: number, phg: number, total: number,
 *   eligibility: Array<{ grant: string, passed: boolean, reason: string }>
 * }}
 *
 * Edge cases to cover:
 *  - EHG is tiered by income; income is a 12-month average, so it lags a raise
 *  - test the boundary exactly AT the income ceiling (check inclusive/exclusive in the HDB wording)
 *  - first-timer status is per person; first-timer + second-timer changes how income/grant are treated
 *  - citizenship mix: SC+SC, SC+PR, PR+PR
 *  - lease must cover the youngest buyer to 95, otherwise EHG is pro-rated. Buyers AND lease age
 *    forward in a "wait then buy resale" scenario, so project both to the purchase date
 *  - employment: 12 months continuous employment condition
 *  - Family Grant and PHG apply to resale only. PHG amount depends on living with vs near parents
 *  - each rule has an effective date; projections need a stated assumption (e.g. current rules held constant)
 */
export function evaluateGrants(profile, choice, assessmentDate, ruleset) {
  throw new NotImplementedError('evaluateGrants', 'seat 2');
}
