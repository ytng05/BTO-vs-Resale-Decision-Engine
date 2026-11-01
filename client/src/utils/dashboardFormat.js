// Display helpers for the Dashboard overview (D35). Pure functions, unit-tested in tests/dashboardFormat.test.js.
// The store keeps money in dollars; every Outcome field from the API is integer cents (API_CONTRACT.md).
// Wording follows the contract's guardrails: no "profit", nothing here is a prediction.
import { formatMoney } from './format.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2035-05-01" -> "May 2035"; anything else -> "—"
export function monthYear(date) {
  if (typeof date !== 'string') return '—';
  const [y, m] = date.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return '—';
  return `${MONTHS[m - 1]} ${y}`;
}

// Both buyers' CPF Ordinary Account balances added together (dollars). null when no buyer has one entered.
export function totalCpfOa(applicants) {
  const balances = (applicants ?? []).map((a) => a?.cpfOaBalance).filter((v) => typeof v === 'number' && Number.isFinite(v));
  return balances.length ? balances.reduce((sum, v) => sum + v, 0) : null;
}

// How much of the cash needed at purchase the household's cash savings cover.
// cashSavingsDollars comes from the store (dollars), requiredCents from Outcome.cashRequiredAtPurchaseCents.
// Returns { state: 'unknown' | 'none' | 'covered' | 'short', pct: 0-100, diffCents, text }.
// A short result never rounds up to 100%, and a covered one stops at 100% (it is not a target to beat).
export function cashCover(cashSavingsDollars, requiredCents) {
  if (typeof requiredCents !== 'number' || !Number.isFinite(requiredCents)) {
    return { state: 'unknown', pct: 0, diffCents: 0, text: 'Not available' };
  }
  if (requiredCents <= 0) {
    return { state: 'none', pct: 100, diffCents: 0, text: 'No cash needed at purchase' };
  }
  if (typeof cashSavingsDollars !== 'number' || !Number.isFinite(cashSavingsDollars)) {
    return { state: 'unknown', pct: 0, diffCents: 0, text: 'Add your cash savings to see this' };
  }
  const savingsCents = Math.round(cashSavingsDollars * 100);
  if (savingsCents >= requiredCents) {
    const spare = savingsCents - requiredCents;
    return {
      state: 'covered',
      pct: 100,
      diffCents: spare,
      text: spare === 0 ? 'Covered exactly' : `Covered, ${formatMoney(spare / 100)} to spare`,
    };
  }
  const short = requiredCents - savingsCents;
  return {
    state: 'short',
    pct: Math.min(99, Math.floor((savingsCents / requiredCents) * 100)),
    diffCents: short,
    text: `${formatMoney(short / 100)} short`,
  };
}

// Cost rows (from CostBreakdownTable) with the largest first, so the cost that matters most is at the top.
// Each row: { a: { amount } | null, b: { amount } | null }. Ties keep their order.
export function largestFirst(rows) {
  const size = (row) => Math.max(Math.abs(row.a?.amount ?? 0), Math.abs(row.b?.amount ?? 0));
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => size(y.row) - size(x.row) || x.index - y.index)
    .map(({ row }) => row);
}

// One-line takeaways for the closed Dashboard sections, so a collapsed section still says something.

// "BTO S$30,000 · Resale S$130,000 in total grants"
export function grantsTakeaway(outcomeA, outcomeB) {
  const a = outcomeA?.totalGrantsCents;
  const b = outcomeB?.totalGrantsCents;
  if (typeof a !== 'number' || typeof b !== 'number') return '';
  if (a === 0 && b === 0) return 'No grants apply on either path';
  return `BTO ${formatMoney(a / 100)} · Resale ${formatMoney(b / 100)} in total grants`;
}

// The biggest single cost line across both paths: "Biggest: Loan interest, S$80,000 on both paths".
export function costsTakeaway(outcomeA, outcomeB) {
  const largest = (outcome) => (outcome?.costBreakdown ?? [])
    .filter((line) => typeof line.amountCents === 'number')
    .reduce((best, line) => (!best || line.amountCents > best.amountCents ? line : best), null);
  const a = largest(outcomeA);
  const b = largest(outcomeB);
  if (!a && !b) return 'No cost breakdown in this result';
  if (a && b && a.id === b.id && a.amountCents === b.amountCents) {
    return `Biggest: ${a.label}, ${formatMoney(a.amountCents / 100)} on both paths`;
  }
  const useA = a && (!b || a.amountCents >= b.amountCents);
  const line = useA ? a : b;
  return `Biggest: ${line.label}, ${formatMoney(line.amountCents / 100)} for ${useA ? 'BTO' : 'resale'}`;
}
