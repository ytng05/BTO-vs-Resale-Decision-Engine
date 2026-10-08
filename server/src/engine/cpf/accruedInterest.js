// server/src/engine/cpf/accruedInterest.js

// 'YYYY-MM-DD' → absolute month number (year * 12 + zero-based month)
const toMonthNumber = (dateString) => {
  const [year, month] = dateString.split('-').map(Number);
  return year * 12 + (month - 1);
};

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
  // Guard first, before any other work
  if (ruleset.cpf.accruedInterestCompounding !== 'ANNUAL') {
    throw new Error(
      `Unsupported compounding mode: ${ruleset.cpf.accruedInterestCompounding}`
    );
  }

  const rate = ruleset.cpf.oaInterestRate;
  // 0.025 → 250. Assumes at most four decimal places, which holds for CPF rates.
  const rateBps = Math.round(rate * 10000);

  // Month number → cents withdrawn that month
  const months = new Map();
  const add = (month, cents) => {
    months.set(month, (months.get(month) ?? 0) + cents);
  };

  const saleMonth = toMonthNumber(asOfDate);

  for (const entry of ledger) {
    const month = toMonthNumber(entry.date);
    if (month > saleMonth) {
      throw new Error(
        `Ledger entry dated ${entry.date} is after the sale date ${asOfDate}`
      );
    }
    add(month, entry.amountCents);
  }

  // Empty ledger – no first month to start the loop from
  if (months.size === 0) {
    return { principalCents: 0, accruedInterestCents: 0, totalCents: 0 };
  }

  let principalCents = 0;
  for (const cents of months.values()) {
    principalCents += cents;
  }

  // Half-up integer rounding from summed balance × bps down to cents
  const DENOMINATOR = 10000 * 12; // bps × months
  const toCents = (n) => Math.floor((2 * n + DENOMINATOR) / (2 * DENOMINATOR));

  let balance = 0;
  let accruedNumerator = 0;
  let creditedCents = 0;

  const firstMonth = Math.min(...months.keys());

  for (let m = firstMonth; m <= saleMonth; m++) {
    // 1. Sale month – credit the part-year, then stop
    if (m === saleMonth) {
      const interestCents = toCents(accruedNumerator);
      balance += interestCents;
      creditedCents += interestCents;
      accruedNumerator = 0;
      break;
    }

    // 2. Accrue on the opening balance, before this month's withdrawals
    accruedNumerator += balance * rateBps;

    // 3. Withdraw
    balance += months.get(m) ?? 0;

    // 4. December credit
    const calendarMonth = (m % 12) + 1;
    if (calendarMonth === 12) {
      const interestCents = toCents(accruedNumerator);
      balance += interestCents;
      creditedCents += interestCents;
      accruedNumerator = 0;
    }
  }

  return {
    principalCents,
    accruedInterestCents: creditedCents,
    totalCents: principalCents + creditedCents
  };
}
