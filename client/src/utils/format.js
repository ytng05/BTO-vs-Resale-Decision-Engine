// Display formatting for money and rates, following docs/UI.md §10:
// "S$" prefix, thousands separators, no decimals on whole currency amounts.

const moneyFormatter = new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 });

// 120000 -> "S$120,000"; -5000 -> "−S$5,000" (true minus sign, reads correctly in screen readers).
export function formatMoney(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  const rounded = Math.round(amount);
  const text = `S$${moneyFormatter.format(Math.abs(rounded))}`;
  return rounded < 0 ? `−${text}` : text;
}

// One rounding rule for the whole app (4 Nov 2026): headlines and summaries (the verdict, the net position bars, the
// "At a glance" tiles) round to the nearest S$1,000, because the projection isn't accurate to the dollar; breakdowns
// that must add up (How you'd pay, the cost and grant tables) stay exact with formatMoney().
// Takes integer cents, like the API: 51_095_900 -> "S$511,000"; -12_345_600 -> "−S$123,000".
export function formatMoneyRounded(cents) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '—';
  return formatMoney(Math.round(cents / 100 / 1000) * 1000);
}

// Growth rates are fractions in the store and the API (0.03 = 3%). 0.025 -> "2.5%".
export function formatPercent(fraction) {
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return '—';
  const pct = Math.round(fraction * 1000) / 10; // one decimal place at most
  const text = `${Math.abs(pct)}%`;
  return pct < 0 ? `−${text}` : text;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000; // Singapore is UTC+8 all year (no daylight saving)

// ISO timestamp -> "21 Sep 2026" (UI.md §10), on the Singapore calendar day whatever the browser's zone.
export function formatDate(iso) {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const sg = new Date(ms + SGT_OFFSET_MS);
  return `${sg.getUTCDate()} ${MONTHS[sg.getUTCMonth()]} ${sg.getUTCFullYear()}`;
}
