// Plain-language summary of a comparison, for the top of the Results page. Pure functions (no Vue), so they are
// unit-tested. Money in the Outcome is integer cents (docs/API_CONTRACT.md); amounts here stay in cents until
// formatMoney() at the edge. Wording follows the guardrails: "net position" (what a path leaves you with, after
// costs, D1), never "profit", and nothing is sold: both paths are measured in the same year (D1).
import { formatMoney } from './format.js';

// Judgement call, not a rule from the ruleset: when the gap between the two net positions is at most this share of
// the larger one, the headline says "too close to call" instead of naming a winner, because growth and price
// assumptions move the result by more than that. 2% is a round, cautious figure; change it here (and the test) if
// the team wants a different line. Recorded in docs/DECISIONS.md (D42).
export const CLOSE_SHARE = 0.02;

const roundToThousand = (cents) => Math.round(cents / 100 / 1000) * 1000; // dollars, nearest S$1,000
const NAME = { a: 'BTO', b: 'Resale' };

/**
 * Who ends ahead, and by how much.
 * @returns {{ winner: 'bto'|'resale'|'level'|null, gapCents: number, roundedDollars: number, close: boolean, headline: string, diffLine: string }}
 */
export function verdict(outcomeA, outcomeB, horizonYear) {
  const a = outcomeA?.netPositionCents;
  const b = outcomeB?.netPositionCents;
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { winner: null, gapCents: 0, roundedDollars: 0, close: false, headline: '', diffLine: '' };
  }
  const by = horizonYear ? ` by ${horizonYear}` : '';
  const gapCents = Math.abs(a - b);
  const roundedDollars = roundToThousand(gapCents);
  const larger = Math.max(Math.abs(a), Math.abs(b));
  const close = larger > 0 && gapCents / larger <= CLOSE_SHARE;

  if (gapCents === 0 || roundedDollars === 0) {
    return {
      winner: 'level', gapCents, roundedDollars, close: true,
      headline: `BTO and resale leave you about the same${by}`,
      diffLine: gapCents === 0 ? 'Difference: none.' : `Difference: ${formatMoney(gapCents / 100)}, too small to call.`,
    };
  }
  const winner = a > b ? 'bto' : 'resale';
  const name = winner === 'bto' ? 'BTO' : 'Resale';
  const headline = close
    ? `Too close to call: ${name} is only about ${formatMoney(roundedDollars)} ahead${by}`
    : `${name} leaves you about ${formatMoney(roundedDollars)} better off${by}`;
  const diffLine = close
    ? `Difference: ${formatMoney(gapCents / 100)} in favour of ${name}, too small to call.`
    : `Difference: ${formatMoney(gapCents / 100)} in favour of ${name}.`;
  return { winner, gapCents, roundedDollars, close, headline, diffLine };
}

// "Keys in" column: "May 2031". keyCollectionDate is an ISO date string.
function monthYear(iso) {
  if (typeof iso !== 'string' || iso.length < 7) return null;
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : null;
}
const monthIndex = (iso) => {
  if (typeof iso !== 'string' || iso.length < 7) return null;
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  return y && m ? y * 12 + (m - 1) : null;
};

/** 52 -> "4 years 4 months", 7 -> "7 months", 12 -> "1 year". */
export function durationText(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`);
  if (m || !y) parts.push(`${m} month${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/**
 * The few numbers that matter, side by side, with the better side of each marked ('a', 'b' or null when equal or
 * unknown). "Better" is the higher net position, the lower cash up front, the earlier keys. Grants are never marked
 * better: they are already inside net position (D1: a bigger grant means a smaller loan or less cash, and it goes
 * back to the buyers' own CPF when they sell), so a "Better" tag there would count them twice. Their difference is
 * still written, as a fact.
 * Each row also says how far apart the two are, in words ("S$13,000" + "more with BTO"; diffLead is the part to
 * bold, empty when they are the same), and keeps the raw values (raw: [a, b], cents or a month count) for bars.
 */
export function keyRows(outcomeA, outcomeB, horizonYear) {
  const money = (cents) => (typeof cents === 'number' ? formatMoney(cents / 100) : '—');
  const higher = (x, y) => (typeof x !== 'number' || typeof y !== 'number' || x === y ? null : x > y ? 'a' : 'b');
  const lower = (x, y) => (typeof x !== 'number' || typeof y !== 'number' || x === y ? null : x < y ? 'a' : 'b');
  const keysA = outcomeA?.timeline?.keyCollectionDate;
  const keysB = outcomeB?.timeline?.keyCollectionDate;
  const earlier = (x, y) => (typeof x !== 'string' || typeof y !== 'string' || x === y ? null : x < y ? 'a' : 'b');

  const moneyDiff = (x, y, better, word) => (better
    ? { diffLead: money(Math.abs(x - y)), diffRest: `${word} with ${NAME[better]}` }
    : { diffLead: '', diffRest: 'Same for both' });

  const posA = outcomeA?.netPositionCents;
  const posB = outcomeB?.netPositionCents;
  const grantsA = outcomeA?.totalGrantsCents;
  const grantsB = outcomeB?.totalGrantsCents;
  const cashA = outcomeA?.cashRequiredAtPurchaseCents;
  const cashB = outcomeB?.cashRequiredAtPurchaseCents;
  const spentA = outcomeA?.housingCashSpentCents;
  const spentB = outcomeB?.housingCashSpentCents;
  const mA = monthIndex(keysA);
  const mB = monthIndex(keysB);
  const keyMonths = mA !== null && mB !== null ? Math.abs(mA - mB) : 0;
  // Keys in the same month are the same to the reader ("May 2031" twice), even if the days differ.
  const keyBetter = keyMonths > 0 ? earlier(keysA, keysB) : null;

  const positionBetter = higher(posA, posB);
  const grantsHigher = higher(grantsA, grantsB); // for the difference text only; never a "Better" tag
  const cashBetter = lower(cashA, cashB);
  const spentBetter = lower(spentA, spentB);

  return [
    {
      id: 'position',
      label: horizonYear ? `Net position in ${horizonYear}` : 'Net position',
      a: money(posA), b: money(posB), better: positionBetter, raw: [posA, posB],
      ...moneyDiff(posA, posB, positionBetter, 'more'),
    },
    {
      id: 'cash',
      label: 'Cash needed at purchase',
      a: money(cashA), b: money(cashB), better: cashBetter, raw: [cashA, cashB],
      ...moneyDiff(cashA, cashB, cashBetter, 'less'),
    },
    {
      id: 'spent',
      label: horizonYear ? `Cash spent on housing by ${horizonYear}` : 'Cash spent on housing',
      note: 'Rent, renovation, fees and loan payments',
      a: money(spentA), b: money(spentB), better: spentBetter, raw: [spentA, spentB],
      ...moneyDiff(spentA, spentB, spentBetter, 'less'),
    },
    {
      id: 'grants',
      label: 'Grants you may get',
      a: money(grantsA), b: money(grantsB), better: null, raw: [grantsA, grantsB],
      ...moneyDiff(grantsA, grantsB, grantsHigher, 'more'),
    },
    {
      id: 'keys',
      label: 'You get the keys',
      a: monthYear(keysA) ?? '—', b: monthYear(keysB) ?? '—', better: keyBetter, raw: [mA, mB], months: keyMonths,
      ...(keyBetter && keyMonths > 0
        ? { diffLead: durationText(keyMonths), diffRest: `sooner with ${NAME[keyBetter]}` }
        : { diffLead: '', diffRest: 'Same for both' }),
    },
  ];
}

/**
 * One sentence on what the path that is behind still does better, from the rows: "But resale gets you the keys
 * 4 years 3 months sooner and needs about S$57,000 less cash up front." Only the keys and cash up front: grants are
 * already in net position (D1), so listing them as a reason would count them twice. Empty when there is nothing to
 * say. When the result is too close to call it says so instead, because the assumptions could change who ends ahead.
 */
export function reasonLine(rows, v) {
  if (!v || !v.winner) return '';
  if (v.winner === 'level') return 'Both paths leave you in about the same place.';
  if (v.close) return 'The gap is small enough that your assumptions could change who ends ahead.';
  const loser = v.winner === 'bto' ? 'b' : 'a';
  const keys = rows.find((r) => r.id === 'keys' && r.better === loser && r.months > 0);
  const cash = rows.find((r) => r.id === 'cash' && r.better === loser);
  const phrases = [];
  if (keys) phrases.push(`gets you the keys ${durationText(keys.months)} sooner`);
  if (cash && Array.isArray(cash.raw)) {
    const less = roundToThousand(Math.abs(cash.raw[0] - cash.raw[1]));
    if (less > 0) phrases.push(`needs about ${formatMoney(less)} less cash up front`);
  }
  if (!phrases.length) return '';
  const name = loser === 'a' ? 'BTO' : 'resale';
  return `But ${name} ${phrases.join(' and ')}.`;
}

/**
 * Bar widths (0 to 100) for two positions on one scale that starts at S$0. The larger is 100; a negative position
 * has no bar (its figure is still written beside it); a positive one is never thinner than 2 so it can be seen.
 */
export function barShares(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return { a: 0, b: 0 };
  const top = Math.max(a, b, 0);
  if (top === 0) return { a: 0, b: 0 };
  const share = (v) => (v <= 0 ? 0 : Math.max(2, Math.round((v / top) * 100)));
  return { a: share(a), b: share(b) };
}
