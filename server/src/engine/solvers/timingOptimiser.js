// FEATURE 1: optimal timing search. SEAT 1 (search) with seat 2 (grant tiers it depends on).
import { evaluate } from '../index.js';
import { WARNINGS } from '../evaluate.contract.js';

/**
 * Search over choice.applicationYear (contract v2) for a fixed path/town/flat type. The objective need not be monotonic
 * (grant income tiers, the Family Grant ceiling), so the best year can fall in the middle.
 * Report it as "under these assumptions", not as a prediction.
 *
 * A year is skipped (not ranked) when its keys miss the household's move-in deadline, or when it is the
 * evaluation start year and the cash needed at purchase is more than today's savings (later years only
 * warn, because saving in between may cover it; see Profile.cashSavingsCents in the contract).
 * Ties go to the earlier year. Errors from evaluate() pass through.
 *
 * @param {object} args { profile, choiceBase, candidateYears, assumptions, ruleset }
 *   candidateYears: whole years, strictly ascending, none before assumptions.evaluationStartYear
 * @returns {{
 *   best: { year: number, outcome: object } | null,
 *   all: Array<{ year: number, outcome: object }>,
 *   skipped: Array<{ year: number, reason: 'MOVE_IN_DEADLINE_MISSED' | 'INCOME_CEILING_BREACHED_AT_PURCHASE' | 'CASH_SHORTFALL_AT_PURCHASE' }>
 * }}  best is null when every year is skipped
 */
export function optimiseTiming(args) {
  const { profile, choiceBase, candidateYears, assumptions, ruleset } = args;
  const startYear = assumptions.evaluationStartYear;

  // 1. Candidate years: non-empty, whole, strictly ascending, none before the start year
  if (
    !Array.isArray(candidateYears) ||
    candidateYears.length === 0 ||
    !candidateYears.every(Number.isInteger) ||
    candidateYears.some((y, i) => i > 0 && y <= candidateYears[i - 1]) ||
    candidateYears[0] < startYear
  ) {
    throw new RangeError(
      `candidateYears must be a non-empty list of whole, strictly ascending years from ${startYear}, got ${JSON.stringify(candidateYears)}`
    );
  }

  // 2–3. Evaluate each year, then skip or keep it
  const all = [];
  const skipped = [];
  for (const year of candidateYears) {
    const outcome = evaluate(profile, { ...choiceBase, applicationYear: year }, assumptions, ruleset);
    if (outcome.warnings.includes(WARNINGS.MOVE_IN_DEADLINE_MISSED)) {
      skipped.push({ year, reason: WARNINGS.MOVE_IN_DEADLINE_MISSED });
    } else if (outcome.warnings.includes(WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE)) {
      skipped.push({ year, reason: WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE });
    } else if (year === startYear && outcome.warnings.includes(WARNINGS.CASH_SHORTFALL_AT_PURCHASE)) {
      skipped.push({ year, reason: WARNINGS.CASH_SHORTFALL_AT_PURCHASE });
    } else {
      all.push({ year, outcome });
    }
  }

  // 4. Best: replace only on a strictly greater net position, so ties go to the earlier year
  let best = null;
  for (const entry of all) {
    if (best === null || entry.outcome.netPositionCents > best.outcome.netPositionCents) best = entry;
  }

  // 5.
  return { best, all, skipped };
}
