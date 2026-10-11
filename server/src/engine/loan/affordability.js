// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Maximum loan (affordability). Pure. Method: NOTE ON AFFORDABILITY in evaluate.contract.js.
 * Tests: tests/engine/maxLoan.test.js against engine/fixtures/max-loan.json (hand-worked).
 *
 * @param {object} inputs
 * @param {'HDB'|'BANK'} inputs.loanType
 * @param {Array<{ age: number, monthlyIncomeCents: number }>} inputs.applicants  ages at application
 * @param {number} inputs.purchasePriceCents
 * @param {number} inputs.remainingLeaseYears
 * @param {number} inputs.tenureAskedYears
 * @param {number|null} inputs.loanRate  annual decimal (HDB rate); null for a bank loan (floor used)
 * @param {object} ruleset  reads loans.* (msrPercent, tdsrPercent, ltv, maxTenureYears, hdbLoanTenure, stressTestRate)
 * @returns {{ assessmentRate: number, ageUsed: number, tenureYears: number, msrLoanCents: number,
 *   tdsrLoanCents: number|null, ltvApplied: number, ltvProrated: boolean, ltvLoanCents: number,
 *   maxLoanCents: number, limitingRule: 'MSR'|'TDSR'|'LTV' }}  money in integer cents
 *
 * Conventions (from the fixture):
 *  - assessment rate = max(floor, loan rate); bank: the floor
 *  - age used: HDB plain average, bank IWAA; both rounded UP to a whole year
 *  - tenure in whole years: HDB min(asked, max, ageLimit − age, lease − buffer); bank min(asked, max)
 *  - MSR / TDSR loans = cap × (1 − (1 + r)^−n) ÷ r, rounded to the nearest cent
 *  - max loan = smallest of MSR, TDSR (bank only) and LTV loans, rounded DOWN to the whole dollar
 */
export function computeMaxLoan(inputs, ruleset) {
  throw new NotImplementedError('computeMaxLoan', 'seat 1');
}
