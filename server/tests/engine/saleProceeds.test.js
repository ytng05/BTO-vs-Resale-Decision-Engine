// SEAT 1. FUTURE WORK, not in evaluate() v1: D1 measures net position at the horizon with NO sale, so there
// is no sale step. Kept as a note for a later sale scenario:
// sale price → loan repayment → CPF refund → cash to the household.
// The refund cap is a policy rule: seat 2 to confirm it against CPF Board / HDB before any case is
// hand-worked (is a market-value sale exempt from topping up a shortfall, and is the loan repaid first?).
import { describe, it } from 'vitest';

describe('sale proceeds (future work, not in D1)', () => {
  it.todo('CPF refund is capped when proceeds after the loan cannot cover principal plus accrued interest');
});
