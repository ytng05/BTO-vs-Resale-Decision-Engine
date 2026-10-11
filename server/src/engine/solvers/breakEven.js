// SEAT 1 owns this file.
import { evaluate } from '../index.js';

// Bisection stops once the price-growth bracket is this narrow (about 17 halvings from a 0.01 gap)
const BISECTION_TOLERANCE = 1e-7;

/**
 * Break-even across price growth and income growth (D1): the two paths are "equal" when their net
 * financial positions at the common horizonYear are equal. In two variables this is a frontier CURVE,
 * not a single point. Never present it as a prediction.
 *
 * Output shape is the /api/compare response's grid and frontier (docs/API_CONTRACT.md):
 * - grid[r][c] is incomeGrowthSteps[r] × priceGrowthSteps[c] (rows are income growth, columns are
 *   price growth). marginCents = net position of A − net position of B at horizonYear (positive: A
 *   ahead); winner is 'A' if marginCents > 0, 'B' if < 0, 'TIE' if 0.
 * - frontier: the points where marginCents crosses 0, found by bisecting on price growth within each
 *   income row, between adjacent cells whose winners differ. Ordered by income growth, then price
 *   growth. Empty when one path wins every cell.
 *
 * @param {object} args
 * @param {import('../types.js').Profile} args.profile
 * @param {import('../types.js').Choice} args.choiceA
 * @param {import('../types.js').Choice} args.choiceB
 * @param {import('../types.js').Assumptions} args.assumptionsBase  annualPriceGrowth and
 *   annualIncomeGrowth are overridden per cell; everything else (incl. horizonYear) is shared
 * @param {number[]} args.priceGrowthSteps   ascending, e.g. [0, 0.01, 0.02, 0.03, 0.04, 0.05]
 * @param {number[]} args.incomeGrowthSteps  ascending
 * @param {object} args.ruleset
 * @returns {{
 *   grid: Array<Array<{ annualPriceGrowth: number, annualIncomeGrowth: number, winner: 'A'|'B'|'TIE', marginCents: number }>>,
 *   frontier: Array<{ annualPriceGrowth: number, annualIncomeGrowth: number }>
 * }}
 */
export function solveBreakEven(args) {
  const { profile, choiceA, choiceB, assumptionsBase, priceGrowthSteps, incomeGrowthSteps, ruleset } = args;
  checkAscending('priceGrowthSteps', priceGrowthSteps);
  checkAscending('incomeGrowthSteps', incomeGrowthSteps);

  // 1. Margin helper: A − B for one pair of growth rates. A new assumptions object every call, so
  //    assumptionsBase is never changed. Errors from evaluate() pass through (the route returns 400).
  const margin = (annualPriceGrowth, annualIncomeGrowth) => {
    const assumptions = { ...assumptionsBase, annualPriceGrowth, annualIncomeGrowth };
    return (
      evaluate(profile, choiceA, assumptions, ruleset).netPositionCents -
      evaluate(profile, choiceB, assumptions, ruleset).netPositionCents
    );
  };

  // 2. Grid: one row per income step, one cell per price step. Winner from the sign alone, no tolerance.
  const grid = incomeGrowthSteps.map((annualIncomeGrowth) =>
    priceGrowthSteps.map((annualPriceGrowth) => {
      const marginCents = margin(annualPriceGrowth, annualIncomeGrowth);
      return { annualPriceGrowth, annualIncomeGrowth, winner: winnerOf(marginCents), marginCents };
    })
  );

  // 3. Frontier, row by row, left to right. Bisect on PRICE growth: the margin is smooth along price,
  //    while along income it jumps at the grant tiers.
  const frontier = [];
  for (const row of grid) {
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];

      // An exact tie is a frontier point itself; the pairs next to it aren't bisected
      if (cell.winner === 'TIE') {
        frontier.push({ annualPriceGrowth: cell.annualPriceGrowth, annualIncomeGrowth: cell.annualIncomeGrowth });
        continue;
      }
      const next = row[c + 1];
      if (!next || next.winner === 'TIE' || next.winner === cell.winner) continue;

      // Keep the end whose sign differs from the left cell's; compare signs, not values.
      // The two ends' margins are already in the grid, so only midpoints are evaluated.
      const leftSign = Math.sign(cell.marginCents);
      let lo = cell.annualPriceGrowth;
      let hi = next.annualPriceGrowth;
      // 4. Stop when the gap is 1e-7 or less, and report the midpoint
      while (hi - lo > BISECTION_TOLERANCE) {
        const mid = (lo + hi) / 2;
        if (Math.sign(margin(mid, cell.annualIncomeGrowth)) === leftSign) lo = mid;
        else hi = mid;
      }
      frontier.push({ annualPriceGrowth: (lo + hi) / 2, annualIncomeGrowth: cell.annualIncomeGrowth });
    }
  }

  return { grid, frontier };
}

const winnerOf = (marginCents) => (marginCents > 0 ? 'A' : marginCents < 0 ? 'B' : 'TIE');

// Bisection and the frontier order both rely on ascending steps; fail loudly rather than mislabel
function checkAscending(name, steps) {
  if (!Array.isArray(steps) || steps.length === 0 || !steps.every(Number.isFinite)) {
    throw new RangeError(`${name} must be a non-empty list of numbers`);
  }
  if (steps.some((s, i) => i > 0 && s <= steps[i - 1])) {
    throw new RangeError(`${name} must be strictly ascending`);
  }
}
