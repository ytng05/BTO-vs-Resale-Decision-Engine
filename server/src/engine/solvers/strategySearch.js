// FEATURE 2: strategy recommendation over the full space. SEAT 1.
// Space: path (BTO/RESALE) x purchaseYear x town x flatType x classification (STANDARD/PLUS/PRIME, BTO only).
// Use constrained search with pruning (drop choices that fail hard constraints early), return the ranked top 3.
import { NotImplementedError } from '../errors.js';

/**
 * @param {object} args { profile, constraints, assumptions, topN = 3, ruleset }
 * @returns {Array<{ choice: object, outcome: object, reasons: string[] }>}  reasons come from the engine's own outputs (no AI-generated text)
 *
 * Start smaller if time is short: fix town and flat type, search purchaseYear x path x classification.
 */
export function searchStrategies(args) {
  throw new NotImplementedError('searchStrategies', 'seat 1');
}
