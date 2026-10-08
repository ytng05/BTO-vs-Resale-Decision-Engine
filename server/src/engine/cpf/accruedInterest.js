// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Accrued interest on CPF used for housing, refundable on sale.
 *
 * Model it as a dated ledger of outflows: each withdrawal (down payment, each monthly instalment,
 * stamp duty, legal fees, grants credited to the OA) accrues from ITS OWN date.
 *
 * @param {Array<{ date: string, amountCents: number, kind: string }>} ledger  kind: 'LUMP_SUM' | 'INSTALMENT' | 'GRANT' | …
 * @param {string} asOfDate  ISO date of sale / refund
 * @param {object} ruleset   reads cpf.oaInterestRate, cpf.accruedInterestCompounding, cpf.partialMonthTreatment
 * @returns {{ principalCents: number, accruedInterestCents: number, totalCents: number }}  integer cents
 *
 * Conventions: D2 (annual compounding) and D12 (full months only, simple-interest stub, rounding)
 * in docs/DECISIONS.md. Tests: tests/engine/cpf.test.js against engine/fixtures/accrued-interest.json.
 *
 * Edge cases to cover (see docs/DECISIONS.md and docs/EDGE_CASES.md):
 *  - compounding convention: read it from the ruleset (D2)
 *  - partial months and month-boundary handling (D12)
 *  - grants accrue from the date credited
 *  - BTO withdrawals happen long before key collection; resale withdrawals cluster at completion
 *  - refund cap: if proceeds cannot cover loan plus refund, refund is limited (sale at market value)
 */
export function computeAccruedInterest(ledger, asOfDate, ruleset) {
  throw new NotImplementedError('computeAccruedInterest', 'seat 1');
}
