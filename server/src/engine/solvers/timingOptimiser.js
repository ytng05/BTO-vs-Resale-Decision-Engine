// FEATURE 1: optimal timing search. SEAT 1 (search) with seat 2 (grant tiers it depends on).
import { NotImplementedError } from '../errors.js';

/**
 * Search over choice.applicationYear (contract v2) for a fixed path/town/flat type. The objective is not monotonic because
 * EHG falls in income tiers, so the best year is neither the earliest nor the latest.
 * Report it as "under these assumptions", not as a prediction.
 *
 * @param {object} args { profile, choiceBase, candidateYears, assumptions, ruleset }
 * @returns {{ best: { year: number, outcome: object }, all: Array<{ year: number, outcome: object }> }}
 */
export function optimiseTiming(args) {
  throw new NotImplementedError('optimiseTiming', 'seat 1');
}
