// Display helpers for the timing optimiser panel (POST /api/timing, docs/API_CONTRACT.md).
// Pure functions, so they are unit-tested in tests/timingFormat.test.js. Money stays in integer cents
// until the last step (formatMoney turns it into "S$"). Wording follows the contract's guardrails:
// "net financial position after N years", never "profit", never a prediction.
import { formatMoney } from './format.js';

// Server skip reasons (docs/API_CONTRACT.md "POST /api/timing") in plain words.
const SKIP_REASONS = {
  MOVE_IN_DEADLINE_MISSED: 'The keys would arrive after your move-in deadline.',
  CASH_SHORTFALL_AT_PURCHASE: 'Your cash savings would not cover the cash needed at purchase.',
};

export function skipReasonText(code) {
  return SKIP_REASONS[code] ?? 'This year could not be compared under your assumptions.';
}

// Year the keys are collected, from the outcome's timeline ("2031-05-01" -> 2031). null if missing.
export function keysYearOf(outcome) {
  const year = Number(String(outcome?.timeline?.keyCollectionDate ?? '').slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

// One row per ranked year, earliest first: { year, keysYear, netPositionCents, isBest, behindBestCents }.
export function timingRows(result) {
  const all = Array.isArray(result?.all) ? result.all : [];
  const bestYear = result?.best?.year ?? null;
  const bestNet = result?.best?.outcome?.netPositionCents ?? null;
  return [...all]
    .sort((a, b) => a.year - b.year)
    .map(({ year, outcome }) => ({
      year,
      keysYear: keysYearOf(outcome),
      netPositionCents: outcome.netPositionCents,
      isBest: year === bestYear,
      behindBestCents: typeof bestNet === 'number' ? Math.max(0, bestNet - outcome.netPositionCents) : null,
    }));
}

// The one-sentence answer shown above the list.
export function timingHeadline(result) {
  const best = result?.best;
  if (!best) {
    return 'None of the years checked work with your cash and move-in deadline. Try a later move-in year or more cash savings.';
  }
  const by = result.horizonYear ? ` by ${result.horizonYear}` : '';
  return `Of the years checked, applying in ${best.year} ends with the highest net financial position${by}: ${formatMoney(
    best.outcome.netPositionCents / 100,
  )}.`;
}
