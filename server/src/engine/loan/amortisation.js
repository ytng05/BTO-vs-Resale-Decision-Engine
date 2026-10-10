// SEAT 1 owns this file.

// 'YYYY-MM-DD' → absolute month number (year * 12 + zero-based month)
const toMonthNumber = (dateString) => {
  const [year, month] = dateString.split('-').map(Number);
  return year * 12 + (month - 1);
};

// Absolute month number → 'YYYY-MM-01'
const toFirstOfMonth = (monthNumber) => {
  const year = Math.floor(monthNumber / 12);
  const month = (monthNumber % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

/**
 * Loan schedule (D23). Pure: one row per monthly instalment.
 *
 * Conventions (D23, stated assumption: HDB doesn't publish its rounding convention):
 *  - the rate is held FIXED for the whole tenure (D9); in practice the HDB rate is reviewed quarterly
 *    and the instalment recalculated when it changes
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
export function buildLoanSchedule({ principalCents, annualRate, tenureYears, keyCollectionDate }) {
  // 1. Set up
  const n = tenureYears * 12;
  const r = annualRate / 12;
  // 0.026 → 260. Assumes at most four decimal places, which holds for HDB rates.
  const rateBps = Math.round(annualRate * 10000);
  const DENOMINATOR = 10000 * 12; // bps × months

  // 2. Regular instalment – the one step that needs decimal maths, rounded once
  const regularInstalmentCents =
    r === 0
      ? Math.round(principalCents / n)
      : Math.round((principalCents * r) / (1 - (1 + r) ** -n));

  const keyMonth = toMonthNumber(keyCollectionDate);
  const rows = [];
  let balance = principalCents;

  // 3. One row per month, first instalment one month after key collection
  for (let m = 1; m <= n; m++) {
    const openingBalanceCents = balance;

    // Interest on the opening balance, half-up with integer arithmetic
    const interestCents = Math.floor(
      (2 * openingBalanceCents * rateBps + DENOMINATOR) / (2 * DENOMINATOR)
    );

    // Final month pays whatever clears the balance to exactly 0
    const instalmentCents =
      m === n ? openingBalanceCents + interestCents : regularInstalmentCents;

    const principalRepaidCents = instalmentCents - interestCents;
    const closingBalanceCents = openingBalanceCents - principalRepaidCents;

    // The loan should only clear in the last month
    if (m < n && closingBalanceCents <= 0) {
      throw new Error(
        `Loan cleared early in month ${m} of ${n}: closing balance ${closingBalanceCents} cents`
      );
    }

    rows.push({
      month: m,
      paymentDate: toFirstOfMonth(keyMonth + m),
      openingBalanceCents,
      instalmentCents,
      interestCents,
      principalRepaidCents,
      closingBalanceCents
    });

    balance = closingBalanceCents;
  }

  // 4. Return the rows
  return rows;
}
