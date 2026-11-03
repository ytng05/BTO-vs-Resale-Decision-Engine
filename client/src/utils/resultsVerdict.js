// Plain-language summary of a comparison, for the top of the Results page. Pure functions (no Vue), so they are
// unit-tested. Money in the Outcome is integer cents (docs/API_CONTRACT.md); amounts here stay in cents until
// formatMoney() at the edge. Wording follows the guardrails: "total position" (the plain name for net financial
// position), never "profit", and nothing is sold: both paths are measured in the same year (D1).
import { formatMoney } from './format.js';

// A gap under this share of the larger position is "about the same": the assumptions matter more than the gap.
const CLOSE_SHARE = 0.02;

const roundToThousand = (cents) => Math.round(cents / 100 / 1000) * 1000; // dollars, nearest S$1,000

/**
 * Who ends ahead, and by how much.
 * @returns {{ winner: 'bto'|'resale'|'level'|null, gapCents: number, roundedDollars: number, close: boolean, headline: string }}
 */
export function verdict(outcomeA, outcomeB, horizonYear) {
  const a = outcomeA?.netPositionCents;
  const b = outcomeB?.netPositionCents;
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { winner: null, gapCents: 0, roundedDollars: 0, close: false, headline: '' };
  }
  const by = horizonYear ? ` by ${horizonYear}` : '';
  const gapCents = Math.abs(a - b);
  const roundedDollars = roundToThousand(gapCents);
  const larger = Math.max(Math.abs(a), Math.abs(b));
  const close = larger > 0 && gapCents / larger <= CLOSE_SHARE;

  if (gapCents === 0 || roundedDollars === 0) {
    return { winner: 'level', gapCents, roundedDollars, close: true, headline: `BTO and resale leave you about the same${by}` };
  }
  const winner = a > b ? 'bto' : 'resale';
  const name = winner === 'bto' ? 'BTO' : 'Resale';
  const headline = close
    ? `Too close to call: ${name} is only about ${formatMoney(roundedDollars)} ahead${by}`
    : `${name} leaves you about ${formatMoney(roundedDollars)} better off${by}`;
  return { winner, gapCents, roundedDollars, close, headline };
}

// "Keys in" column: "May 2031". keyCollectionDate is an ISO date string.
function monthYear(iso) {
  if (typeof iso !== 'string' || iso.length < 7) return null;
  const [y, m] = iso.slice(0, 7).split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : null;
}

/**
 * The few numbers that matter, side by side, with the better side of each marked ('a', 'b' or null when equal or
 * unknown). "Better" is the higher total position, the higher grants, the lower cash up front, the earlier keys.
 */
export function keyRows(outcomeA, outcomeB, horizonYear) {
  const money = (cents) => (typeof cents === 'number' ? formatMoney(cents / 100) : '—');
  const higher = (x, y) => (typeof x !== 'number' || typeof y !== 'number' || x === y ? null : x > y ? 'a' : 'b');
  const lower = (x, y) => (typeof x !== 'number' || typeof y !== 'number' || x === y ? null : x < y ? 'a' : 'b');
  const keysA = outcomeA?.timeline?.keyCollectionDate;
  const keysB = outcomeB?.timeline?.keyCollectionDate;
  const earlier = (x, y) => (typeof x !== 'string' || typeof y !== 'string' || x === y ? null : x < y ? 'a' : 'b');

  return [
    {
      id: 'position',
      label: horizonYear ? `Your total position in ${horizonYear}` : 'Your total position',
      a: money(outcomeA?.netPositionCents),
      b: money(outcomeB?.netPositionCents),
      better: higher(outcomeA?.netPositionCents, outcomeB?.netPositionCents),
    },
    {
      id: 'grants',
      label: 'Grants you get',
      a: money(outcomeA?.totalGrantsCents),
      b: money(outcomeB?.totalGrantsCents),
      better: higher(outcomeA?.totalGrantsCents, outcomeB?.totalGrantsCents),
    },
    {
      id: 'cash',
      label: 'Cash needed up front',
      a: money(outcomeA?.cashRequiredAtPurchaseCents),
      b: money(outcomeB?.cashRequiredAtPurchaseCents),
      better: lower(outcomeA?.cashRequiredAtPurchaseCents, outcomeB?.cashRequiredAtPurchaseCents),
    },
    {
      id: 'keys',
      label: 'You get the keys',
      a: monthYear(keysA) ?? '—',
      b: monthYear(keysB) ?? '—',
      better: earlier(keysA, keysB),
    },
  ];
}
