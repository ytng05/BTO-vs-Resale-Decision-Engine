// The few fields My scenarios filters on, taken from a saved scenario (GET /api/scenarios, docs/API_CONTRACT.md).
// Inputs are saved in the client store's shape; the result is the POST /api/compare response, and is optional.

// Only these parts of each document are read from the database for the list, so it stays small.
export const SUMMARY_FIELDS = [
  'choiceA.town', 'choiceA.flatType', 'choiceB.town', 'choiceB.flatType',
  'result.gapBreakdown.marginCents',
  'result.resolvedA.purchasePriceCents', 'result.resolvedB.purchasePriceCents',
  'result.outcomeA.purchasePriceCents', 'result.outcomeB.purchasePriceCents',
];

const textOrNull = (v) => (typeof v === 'string' && v !== '' ? v : null);
const numberOrNull = (v) => (Number.isFinite(v) ? v : null);

// Today's price the comparison used (resolvedA/B, D31). Scenarios saved before resolvedA/B existed fall back to the
// outcome's price, which is grown to the application year.
function priceOf(result, key) {
  return numberOrNull(result?.[`resolved${key}`]?.purchasePriceCents)
    ?? numberOrNull(result?.[`outcome${key}`]?.purchasePriceCents);
}

// Which path ends ahead at the horizon: 'A' (BTO), 'B' (resale), 'TIE', or null when no result was saved.
function aheadOf(result) {
  const margin = numberOrNull(result?.gapBreakdown?.marginCents);
  if (margin === null) return null;
  if (margin > 0) return 'A';
  if (margin < 0) return 'B';
  return 'TIE';
}

export function scenarioSummary({ choiceA, choiceB, result } = {}) {
  return {
    btoTown: textOrNull(choiceA?.town),
    btoFlatType: textOrNull(choiceA?.flatType),
    resaleTown: textOrNull(choiceB?.town),
    resaleFlatType: textOrNull(choiceB?.flatType),
    ahead: aheadOf(result),
    btoPriceCents: priceOf(result, 'A'),
    resalePriceCents: priceOf(result, 'B'),
  };
}
