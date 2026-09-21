// The evaluate() primitive. Everything else wraps this. Agree the signature in week 1.
import { NotImplementedError } from './errors.js';

/**
 * @param {import('./types.js').Profile} profile
 * @param {import('./types.js').Choice} choice
 * @param {import('./types.js').Assumptions} assumptions
 * @param {object} ruleset  versioned ruleset from loadRuleset()
 * @returns {import('./types.js').Outcome}
 *
 * Compose (seat 1 builds, seat 2 supplies grants): price basis -> grants -> loan -> transaction costs
 * -> CPF ledger -> sale at horizon -> subsidy clawback (Plus/Prime) -> CPF refund -> net financial position.
 * Must stay pure and deterministic so it can be called thousands of times by the solvers.
 */
export function evaluate(profile, choice, assumptions, ruleset) {
  throw new NotImplementedError('evaluate', 'seat 1');
}
