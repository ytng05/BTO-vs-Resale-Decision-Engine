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
