// Engine types live in evaluate.contract.js (the agreed contract). This file re-exports them so
// existing JSDoc imports of './types.js' keep working, plus the one internal shape below.

/**
 * @typedef {import('./evaluate.contract.js').Profile} Profile        money in cents
 * @typedef {import('./evaluate.contract.js').Choice} Choice
 * @typedef {import('./evaluate.contract.js').Assumptions} Assumptions
 * @typedef {import('./evaluate.contract.js').Outcome} Outcome
 */

/**
 * Input to rules/grants.js evaluateGrants(). Same shape as Profile but money in DOLLARS:
 * evaluate() converts at this one boundary (see NOTE ON GRANTS in evaluate.contract.js).
 * Not part of the API; nothing outside evaluate() should build one.
 *
 * @typedef {Object} GrantsApplicant
 * @property {number} age                  projected to the purchase year (D13)
 * @property {'SC'|'PR'} citizenship
 * @property {boolean} firstTimer
 * @property {number} monthlyIncome        dollars
 * @property {number} cpfOaBalance         dollars
 *
 * @typedef {Object} GrantsProfile
 * @property {GrantsApplicant[]} applicants
 */
export {};
