// SEAT 1 owns this file.
import { NotImplementedError } from '../errors.js';

/**
 * Loan schedule and outstanding balance. Split each instalment into CPF-paid and cash-paid
 * portions, because only the CPF-paid portion accrues interest.
 *
 * @param {{ principal: number, annualRate: number, tenureYears: number }} loan
 * @returns {Array<{ month: number, instalment: number, interest: number, principalPaid: number, balance: number }>}
 *
 * Note: HDB concessionary loan vs bank loan differ. MSR (30%) and TDSR (55%) checks live in a separate
 * affordability function so this stays a pure schedule.
 */
export function buildLoanSchedule(loan) {
  throw new NotImplementedError('buildLoanSchedule', 'seat 1');
}
