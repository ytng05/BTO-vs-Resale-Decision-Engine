// SEAT 1 owns this file.

/**
 * Why one path ends ahead, line by line (D34). See GapBreakdown in evaluate.contract.js for the lines, their
 * order and signs. Pure arithmetic on two Outcomes from evaluate(); no ruleset, no I/O.
 *
 * @param {import('./evaluate.contract.js').Outcome} outcomeA
 * @param {import('./evaluate.contract.js').Outcome} outcomeB
 * @returns {import('./evaluate.contract.js').GapBreakdown}
 * @throws {RangeError} when the two outcomes have different horizonYears
 *
 * Tests: tests/engine/explainGap.test.js (skipped until this is written).
 */
export function explainGap(outcomeA, outcomeB) {
  throw new Error('explainGap: not written yet (seat 1, D34)');
}
