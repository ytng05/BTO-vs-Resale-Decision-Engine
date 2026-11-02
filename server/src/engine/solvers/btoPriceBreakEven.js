// SEAT 1 owns this file. D40: the BTO price at which the verdict flips.
import { evaluate } from '../index.js';

// Bracket around HDB's range for the flat type: half its minimum to 1.5 × its maximum (D40).
export const BRACKET_LOW = 0.5;
export const BRACKET_HIGH = 1.5;
// Prices are searched in whole dollars.
export const PRICE_STEP_CENTS = 100;

/**
 * The highest BTO price (today's, as choice.purchasePriceCents, D31) at which the BTO path still leaves the
 * household with a net financial position at the horizon at least as high as the other path's (D1, D40).
 * Everything except choiceA.purchasePriceCents is held at the user's own inputs.
 *
 * Relies on net position never rising as the BTO price rises, so the margin crosses 0 at most once
 * (checked by tests/engine/btoPriceBreakEven.test.js). Never present the result as a prediction.
 *
 * Steps:
 *   1. Check choiceA.path is 'BTO' and hdbRangeCents.min <= max (throw a RangeError otherwise, as the other solvers do).
 *   2. Bracket: min = round(hdbRangeCents.min × BRACKET_LOW), max = round(hdbRangeCents.max × BRACKET_HIGH),
 *      both rounded to whole dollars (PRICE_STEP_CENTS).
 *   3. margin(p) = evaluate(profile, { ...choiceA, purchasePriceCents: p }, assumptions, ruleset).netPositionCents
 *                  − evaluate(profile, choiceB, assumptions, ruleset).netPositionCents
 *      (choiceB's net position doesn't change with p: work it out once).
 *   4. atHdbMin / atHdbMax: winner ('A' if margin > 0, 'B' if < 0, 'TIE' if 0) at HDB's min and max.
 *   5. priceCents:
 *        margin(bracket.min) < 0   → null (the other path is ahead across the whole bracket)
 *        margin(bracket.max) >= 0  → null (BTO is ahead or level across the whole bracket)
 *        otherwise bisect on whole dollars: lo = bracket.min (margin >= 0), hi = bracket.max (margin < 0),
 *        until hi − lo === PRICE_STEP_CENTS; priceCents = lo.
 *
 * @param {object} args
 * @param {import('../types.js').Profile} args.profile
 * @param {import('../types.js').Choice} args.choiceA  the BTO path (path 'BTO')
 * @param {import('../types.js').Choice} args.choiceB  the other path
 * @param {import('../types.js').Assumptions} args.assumptions
 * @param {{ min: number, max: number }} args.hdbRangeCents  HDB's price range for the launch and flat type
 * @param {object} args.ruleset
 * @returns {import('../evaluate.contract.js').BtoPriceBreakEven}
 */
export function solveBtoPriceBreakEven(args) {
  const { profile, choiceA, choiceB, assumptions, hdbRangeCents, ruleset } = args;

  // 1. Check the inputs
  if (choiceA?.path !== 'BTO') {
    throw new RangeError("choiceA.path must be 'BTO'");
  }
  if (hdbRangeCents.min > hdbRangeCents.max) {
    throw new RangeError('hdbRangeCents.min must not exceed hdbRangeCents.max');
  }

  // 2. Bracket: half HDB's minimum to 1.5 times its maximum, rounded to whole dollars
  const bracketCents = {
    min: toWholeDollars(hdbRangeCents.min * BRACKET_LOW),
    max: toWholeDollars(hdbRangeCents.max * BRACKET_HIGH),
  };

  // 3. Margin helper: BTO's net position minus the other path's. The other path doesn't depend on
  //    the BTO price, so it is evaluated once. choiceA is copied, never changed.
  const otherNetCents = evaluate(profile, choiceB, assumptions, ruleset).netPositionCents;
  const margin = (p) =>
    evaluate(profile, { ...choiceA, purchasePriceCents: p }, assumptions, ruleset).netPositionCents -
    otherNetCents;

  // 4. Who's ahead at HDB's two prices, from the sign alone
  const atHdbMin = winnerOf(margin(hdbRangeCents.min));
  const atHdbMax = winnerOf(margin(hdbRangeCents.max));

  // 5. Flip price. null if resale is ahead even at the cheapest price,
  //    or BTO is ahead or level even at the dearest one.
  let priceCents = null;
  if (margin(bracketCents.min) >= 0 && margin(bracketCents.max) < 0) {
    // Invariant: margin(lo) >= 0, margin(hi) < 0, both whole dollars
    let lo = bracketCents.min;
    let hi = bracketCents.max;
    while (hi - lo > PRICE_STEP_CENTS) {
      const mid = toWholeDollars((lo + hi) / 2);
      if (margin(mid) >= 0) lo = mid;
      else hi = mid;
    }
    priceCents = lo; // last dollar where BTO is still ahead or level
  }

  // 6. Return, with a copy of the caller's range
  return { priceCents, atHdbMin, atHdbMax, hdbRangeCents: { ...hdbRangeCents }, bracketCents };
}

const toWholeDollars = (cents) => Math.round(cents / PRICE_STEP_CENTS) * PRICE_STEP_CENTS;

// Same rule as winnerOf in breakEven.js (not exported there): sign only, no tolerance
const winnerOf = (marginCents) => (marginCents > 0 ? 'A' : marginCents < 0 ? 'B' : 'TIE');
