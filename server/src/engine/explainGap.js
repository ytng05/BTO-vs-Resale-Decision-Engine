// SEAT 1 owns this file.
// explainGap(outcomeA, outcomeB)
// Breaks the difference in net position between two outcomes into 11 lines
// that sum exactly to the margin. Full spec: GapBreakdown in evaluate.contract.js (D34).
// Tests: tests/engine/explainGap.test.js.

// Cost-line ids in Outcome.costBreakdown that are counted as cash lines, in contract order.
const CASH_COST_IDS = ['RENT_WHILE_WAITING', 'RENOVATION', 'BSD', 'LEGAL', 'AGENT'];

// Label for each cash line; the gap line id is the cost-line id.
const CASH_LINE_LABEL = {
  RENT_WHILE_WAITING: 'Rent while waiting',
  RENOVATION: 'Renovation',
  BSD: 'Stamp duty paid in cash',
  LEGAL: 'Legal fees paid in cash',
  AGENT: 'Agent fees',
};

// --- helpers ---------------------------------------------------------------

function findCost(o, id) {
  return (o.costBreakdown ?? []).find((c) => c.id === id);
}

// The amount if paid from cash, otherwise 0.
function cashPart(o, id) {
  const c = findCost(o, id);
  return c && c.paidFrom === 'CASH' ? c.amountCents : 0;
}

function cashLinesTotal(o) {
  return CASH_COST_IDS.reduce((sum, id) => sum + cashPart(o, id), 0);
}

// Downpayment and instalments: everything cash-funded that isn't one of the five cash lines.
function cashPurchase(o) {
  return o.housingCashSpentCents - cashLinesTotal(o);
}

// --- main ------------------------------------------------------------------

export function explainGap(outcomeA, outcomeB) {
  // 1. Guard
  if (outcomeA.horizonYear !== outcomeB.horizonYear) {
    throw new RangeError(
      `explainGap: horizon years differ (A: ${outcomeA.horizonYear}, B: ${outcomeB.horizonYear})`
    );
  }

  const a = outcomeA;
  const b = outcomeB;
  const aMinusB = (va, vb) => va - vb; // asset: higher A is good for A
  const bMinusA = (va, vb) => vb - va; // cost: higher B is good for A

  // 5. Eleven lines in contract order
  const lines = [
    { id: 'MARKET_VALUE',  label: 'Flat value',                    amountCents: aMinusB(a.marketValueAtHorizonCents,     b.marketValueAtHorizonCents) },
    { id: 'LOAN_OWED',     label: 'Loan still owed',               amountCents: bMinusA(a.outstandingLoanAtHorizonCents, b.outstandingLoanAtHorizonCents) },
    { id: 'CPF_PRINCIPAL', label: 'CPF savings used (principal)',  amountCents: bMinusA(a.cpfSavingsRefundPrincipalCents, b.cpfSavingsRefundPrincipalCents) },
    { id: 'CPF_INTEREST',  label: 'Interest on CPF savings used',  amountCents: bMinusA(a.cpfSavingsAccruedInterestCents, b.cpfSavingsAccruedInterestCents) },
    { id: 'CLAWBACK',      label: 'Subsidy clawback (Plus/Prime)', amountCents: bMinusA(a.clawbackCents,                 b.clawbackCents) },
    ...CASH_COST_IDS.map((id) => ({
      id,
      label: CASH_LINE_LABEL[id],
      amountCents: bMinusA(cashPart(a, id), cashPart(b, id)),
    })),
    {
      id: 'CASH_PURCHASE',
      label: 'Downpayment and instalments paid in cash',
      amountCents: bMinusA(cashPurchase(a), cashPurchase(b)),
    },
  ];

  // 6. Margin
  const marginCents = a.netPositionCents - b.netPositionCents;

  // 8. Self-check: integer cents, so equality must be exact.
  const sum = lines.reduce((s, l) => s + l.amountCents, 0);
  if (sum !== marginCents) {
    throw new Error(
      `explainGap: lines sum to ${sum} but margin is ${marginCents} ` +
        `(off by ${sum - marginCents}); an outcome's netPositionCents is inconsistent with its components`
    );
  }

  // 7. Result
  return {
    horizonYear: a.horizonYear,
    marginCents,
    lines,
    totalGrants: { aCents: a.totalGrantsCents, bCents: b.totalGrantsCents },
  };
}
