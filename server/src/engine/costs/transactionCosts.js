// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Buyer's stamp duty, legal and agent fees, cash-over-valuation, and the sale-side costs.
 * All rates and tiers come from the ruleset (IRAS, HDB), never from code.
 *
 * @param {{ path: string, price: number, valuation?: number }} purchase
 * @param {object} ruleset
 * @returns {{ total: number, lines: Array<{ label: string, amount: number }> }}
 */
export function computeTransactionCosts(purchase, ruleset) {
  throw new NotImplementedError('computeTransactionCosts', 'seat 1');
}

/**
 * Buyer's stamp duty on a purchase (D20).
 *
 * Marginal bands from ruleset.transactionCosts.buyerStampDutyTiers ({ ratePercent, portion } with portion in
 * DOLLARS, last portion 'remainder'). Each slice of the value is taxed at its own band's rate; an amount exactly
 * on a boundary sits in the lower band. The total is rounded DOWN to the whole dollar, minimum $1 (IRAS).
 * This is deliberately different from CPF interest rounding (D12, half-up to the cent): don't "fix" one to match.
 *
 * @param {number} dutiableValueCents  purchase price in integer cents (price only, D20)
 * @param {object} ruleset
 * @returns {number} BSD payable in integer cents (a whole number of dollars)
 *
 * Tests: tests/engine/transactionCosts.test.js against engine/fixtures/buyer-stamp-duty.json.
 */
export function computeBuyerStampDuty(dutiableValueCents, ruleset) {
  throw new NotImplementedError('computeBuyerStampDuty', 'seat 1');
}
