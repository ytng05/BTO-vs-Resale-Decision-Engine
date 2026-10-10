// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Loan schedule (D23). Pure: one row per monthly instalment.
 *
 * Conventions (D23, stated assumption; seat 2 to check HDB's own convention):
 *  - monthly rate r = annualRate ÷ 12 (monthly rest)
 *  - regular instalment = P × r ÷ (1 − (1 + r)^−n), rounded to the NEAREST cent (halves up)
 *  - each month: interest = opening balance × r, rounded to the nearest cent;
 *    principal repaid = instalment − interest; closing = opening − principal repaid
 *  - the FINAL instalment is whatever clears the balance to exactly 0 (opening + that month's interest)
 *  - the loan is drawn at keyCollectionDate; the first instalment is one month later (in arrears)
 * Same rounding style as CPF interest (D12, half-up to the cent); different from stamp duty (D20).
 *
 * Splitting each instalment into CPF-paid and cash-paid parts is NOT done here; evaluate() layers that on
 * (D1 proposal: instalment split still to decide). Affordability limits (MSR / TDSR / LTV) also live elsewhere.
 *
 * @param {{ principalCents: number, annualRate: number, tenureYears: number, keyCollectionDate: string }} loan
 *   annualRate is a decimal (0.026); keyCollectionDate is 'YYYY-MM-01'
 * @returns {Array<{ month: number, paymentDate: string, openingBalanceCents: number, instalmentCents: number,
 *   interestCents: number, principalRepaidCents: number, closingBalanceCents: number }>}  all money in integer cents
 *
 * Tests: tests/engine/loanSchedule.test.js against engine/fixtures/loan-schedule.json.
 */
export function buildLoanSchedule(loan) {
  throw new NotImplementedError('buildLoanSchedule', 'seat 1');
}
