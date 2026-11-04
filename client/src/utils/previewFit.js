// Which path "fits better" on one results-teaser pick (D43). Seat 1's rule (Cadence, 3 Nov 2026): fitVerdict() below
// is hers as written; previewFit() at the end only turns the engine's outcomes into its inputs. D43: the team agrees
// the rule, recorded in DECISIONS, before the verdicts go live.
//
// A verdict needs a clear lead: a lower cash or loan figure wins only when the gap clears BOTH thresholds; the move-in
// pick looks at the keys years and the "must move in by" year. Otherwise it is a tie: 'same' (the figures are about
// the same) or 'neutral' (no fair comparison: a figure is missing or a path can't be bought).

const CASH_MIN_GAP = 5000;   // dollars
const CASH_MIN_PCT = 0.10;   // share of the larger amount
const LOAN_MIN_GAP = 20000;  // dollars
const LOAN_MIN_PCT = 0.05;   // share of the larger amount

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

const win  = (path, reason) => ({ verdict: path, tie: null, reason });
const same = (reason)       => ({ verdict: null, tie: 'same', reason });
const none = (reason)       => ({ verdict: null, tie: 'neutral', reason });

// Lower figure wins only when the gap clears both thresholds.
function compareLower(btoVal, resaleVal, minGap, minPct) {
  if (!isNum(btoVal) || !isNum(resaleVal)) return none('missing-figure');
  const gap = Math.abs(btoVal - resaleVal);
  const larger = Math.max(btoVal, resaleVal);
  if (gap >= minGap && gap >= larger * minPct) {
    return win(btoVal < resaleVal ? 'bto' : 'resale', 'clear-gap');
  }
  return same('within-threshold');
}

function moveInVerdict(btoYear, resaleYear, targetYear, currentYear) {
  if (!Number.isInteger(btoYear) || !Number.isInteger(resaleYear)) {
    return none('missing-figure');
  }
  if (btoYear === resaleYear) return same('same-keys-year');

  const earlier = btoYear < resaleYear ? 'bto' : 'resale';
  const hasTarget = Number.isInteger(targetYear) && targetYear >= currentYear;
  if (!hasTarget) return win(earlier, 'earlier-keys');

  const btoMakes = btoYear <= targetYear;
  const resaleMakes = resaleYear <= targetYear;

  if (btoMakes && resaleMakes) return same('both-make-date');
  if (btoMakes !== resaleMakes) {
    return win(btoMakes ? 'bto' : 'resale', 'only-one-makes-date');
  }
  return win(earlier, 'neither-makes-date'); // card: "closer to your date"
}

/**
 * @param {'moveIn'|'cash'|'loan'} pick
 * @param {{eligible:boolean, keysYear?:number, cashAtPurchase?:number, loanAmount?:number}} bto
 * @param {{eligible:boolean, keysYear?:number, cashAtPurchase?:number, loanAmount?:number}} resale
 * @param {{moveInYear?:number, currentYear?:number}} opts
 * @returns {{verdict:'bto'|'resale'|null, tie:'same'|'neutral'|null, reason:string}}
 */
export function fitVerdict(pick, bto, resale, opts = {}) {
  if (!bto.eligible && !resale.eligible) return none('both-ineligible');
  if (!bto.eligible) return none('bto-ineligible');
  if (!resale.eligible) return none('resale-ineligible');

  const currentYear = opts.currentYear ?? new Date().getFullYear();

  switch (pick) {
    case 'moveIn':
      return moveInVerdict(bto.keysYear, resale.keysYear, opts.moveInYear, currentYear);
    case 'cash':
      return compareLower(bto.cashAtPurchase, resale.cashAtPurchase, CASH_MIN_GAP, CASH_MIN_PCT);
    case 'loan':
      return compareLower(bto.loanAmount, resale.loanAmount, LOAN_MIN_GAP, LOAN_MIN_PCT);
    default:
      return none('unknown-pick');
  }
}

// The teaser's pick keys (PREVIEW_WISHES) → the rule's.
const PICK_OF = { moveby: 'moveIn', cash: 'cash', monthly: 'loan' };
const dollars = (cents) => (isNum(cents) ? cents / 100 : undefined);

// One path's figures from its engine Outcome (POST /api/compare). The only "can't buy" signal the engine gives is
// INCOME_CEILING_BREACHED_AT_PURCHASE (D36, BTO only); a cash shortfall or a loan above the limit is affordability,
// shown on Results, so it does not make a path ineligible here.
function figuresOf(outcome) {
  return {
    eligible: !(outcome?.warnings ?? []).includes('INCOME_CEILING_BREACHED_AT_PURCHASE'),
    keysYear: Number(String(outcome?.timeline?.keyCollectionDate ?? '').slice(0, 4)) || undefined,
    cashAtPurchase: dollars(outcome?.cashRequiredAtPurchaseCents),
    loanAmount: dollars(outcome?.loanPrincipalCents),
  };
}

// The verdict for teaser pick `key`, from Path A (the BTO) and Path B (the resale flat).
export function previewFit(key, outcomeA, outcomeB, { moveInBy = null, currentYear } = {}) {
  return fitVerdict(PICK_OF[key] ?? key, figuresOf(outcomeA), figuresOf(outcomeB), { moveInYear: moveInBy ?? undefined, currentYear });
}
