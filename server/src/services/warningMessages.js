// Seat 1. Plain-English text for each Outcome.warnings code (WARNINGS in engine/evaluate.contract.js).
// /api/compare and /api/timing return the ones that occur as `warningMessages: { CODE: text }`, so the UI
// can show a sentence instead of the code. Wording rules as elsewhere: "under these assumptions", never a
// forecast or advice. Tests: tests/compareTiming.test.js.
import { WARNINGS } from '../engine/evaluate.contract.js';

export const WARNING_MESSAGES = Object.freeze({
  [WARNINGS.BTO_WAIT_ASSUMED]:
    "We don't have this project's waiting time, so the usual BTO wait from the ruleset is assumed. Your key date may differ.",
  [WARNINGS.LEASE_BELOW_95_PRORATION]:
    "The flat's remaining lease ends before the youngest buyer turns 95, so the maximum HDB loan is reduced. CPF use is also limited for such flats, which this version does not model, so the cash needed may be higher than shown.",
  [WARNINGS.LOAN_ABOVE_LIMIT]:
    'The loan this flat needs is above your maximum loan. The difference is paid from your CPF and cash at purchase.',
  [WARNINGS.CLASSIFICATION_CLAWBACK_ESTIMATED]:
    "Plus and Prime flats pay part of the sale price back to HDB, but this project's rate is not known, so no clawback is counted. The net position may be overstated.",
  [WARNINGS.CASH_SHORTFALL_AT_PURCHASE]:
    "The cash needed at purchase is more than your cash savings today. Saving before then could cover it, but no extra saving is assumed.",
  [WARNINGS.MOVE_IN_DEADLINE_MISSED]:
    'The keys would arrive after the year you need to move in by.',
  [WARNINGS.HDB_RATE_UNRESOLVED]:
    'The HDB loan interest rate is not confirmed in the ruleset, so a default rate is used.',
  [WARNINGS.INCOME_CEILING_BREACHED_AT_PURCHASE]:
    'Your projected household income at purchase is above the income ceiling for this flat.',
});

/** { code: text } for each distinct warning code given, in first-seen order. Unknown codes are left out. */
export function warningMessagesFor(codes) {
  const out = {};
  for (const code of codes) {
    if (WARNING_MESSAGES[code] && !(code in out)) out[code] = WARNING_MESSAGES[code];
  }
  return out;
}
