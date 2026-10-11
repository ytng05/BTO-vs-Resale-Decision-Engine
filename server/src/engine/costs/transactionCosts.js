// SEAT 1 owns this file.
// Legal and agent fees are assumptions, not policy (D17), and evaluate() applies them directly (D28).

/**
 * Buyer's stamp duty on a purchase (D20).
 *
 * Marginal bands from ruleset.transactionCosts.buyerStampDutyTiers ({ ratePercent, portion } with portion in
 * DOLLARS, last portion 'remainder'). Each slice of the value is taxed at its own band's rate; an amount exactly
 * on a boundary sits in the lower band. The total is rounded DOWN to the whole dollar, minimum $1 (IRAS).
 * This is deliberately different from CPF interest rounding (D12, half-up to the cent): don't "fix" one to match.
 *
 * @param {number} dutiableValueCents  purchase price in integer cents (price only, D20)
 * @param {object} ruleset
 * @returns {number} BSD payable in integer cents (a whole number of dollars)
 * @throws {RangeError} unless dutiableValueCents is a positive safe integer
 *
 * Tests: tests/engine/transactionCosts.test.js against engine/fixtures/buyer-stamp-duty.json.
 */
export function computeBuyerStampDuty(dutiableValueCents, ruleset) {
  // Guard: a failed price lookup (0, NaN, undefined, fractional cents) must fail loudly, not return $1 or NaN.
  if (!Number.isSafeInteger(dutiableValueCents) || dutiableValueCents <= 0) {
    throw new RangeError(`dutiableValueCents must be a positive integer number of cents, got ${dutiableValueCents}`);
  }

  const tiers = ruleset.transactionCosts.buyerStampDutyTiers;

  // Running total is cents × percent, i.e. hundredths of a cent
  let total = 0;
  let remaining = dutiableValueCents;

  for (const tier of tiers) {
    if (remaining <= 0) break;

    // Portions are in dollars; the last tier is 'remainder'
    const slice =
      tier.portion === 'remainder'
        ? remaining
        : Math.min(remaining, tier.portion * 100);

    total += slice * tier.ratePercent;
    remaining -= slice;
  }

  // Round down to whole dollars, then apply the $1 minimum
  const wholeDollars = Math.floor(total / 10000);
  return Math.max(wholeDollars * 100, 100);
}
