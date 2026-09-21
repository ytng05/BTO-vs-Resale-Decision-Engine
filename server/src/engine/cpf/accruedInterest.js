// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Accrued interest on CPF used for housing, refundable on sale.
 *
 * Model it as a dated ledger of outflows: each withdrawal (down payment, each monthly instalment,
 * stamp duty, legal fees, grants credited to the OA) accrues from ITS OWN date.
 *
 * @param {Array<{ date: string, amount: number, kind: string }>} ledger
 * @param {string} asOfDate  ISO date of sale / refund
 * @param {object} ruleset   the versioned ruleset (interest rate and compounding convention come from here)
 * @returns {{ principal: number, accruedInterest: number, total: number }}
 *
 * Edge cases to cover (see docs/DECISIONS.md and docs/EDGE_CASES.md):
 *  - compounding convention: monthly vs annual (OPEN DECISION, read it from the ruleset)
 *  - partial months and month-boundary handling
 *  - grants accrue from the date credited
 *  - BTO withdrawals happen long before key collection; resale withdrawals cluster at completion
 *  - refund cap: if proceeds cannot cover loan plus refund, refund is limited (sale at market value)
 */
export function computeAccruedInterest(ledger, asOfDate, ruleset) {
  throw new NotImplementedError('computeAccruedInterest', 'seat 1');
}
