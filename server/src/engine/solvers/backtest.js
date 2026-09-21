// FEATURE 3 (LATER): risk-based verdict. Behind FEATURE_BACKTEST. Do not start until features 1 and 2 work.
// Naming: this replays REAL historical windows of the Resale Price Index. That is a historical backtest,
// not Monte Carlo (Monte Carlo would mean random resampling; if you resample, seed the generator).
// Output a historical RANGE and the share of windows either side of break-even, not a "probability".
// Caveats to state in the UI: overlapping windows, today's rules applied to old prices, BTO price assumption.
import { NotImplementedError } from '../errors.js';

/**
 * @param {object} args { profile, choiceA, choiceB, assumptionsBase, rpiSeries, windowYears, ruleset }
 * @returns {{ windows: Array<object>, range: { min: number, median: number, max: number } }}
 */
export function runBacktest(args) {
  throw new NotImplementedError('runBacktest', 'seat 1 + seat 3');
}
