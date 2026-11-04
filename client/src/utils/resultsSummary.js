// The redesigned Results page's boxes, as pure functions (unit-tested in tests/resultsSummary.test.js): the small
// grid in "Would the answer change?", "Why … comes out ahead" (gapBreakdown, D34) as bars either side of a centre
// line, and the Grants card. Money stays in integer cents until formatMoney() at the edge. Wording follows the
// guardrails: net position (D1), never "profit"; nothing here is a forecast.
import { formatMoney } from './format.js';
import { gapRows } from './gapFormat.js';

const k = (cents) => formatMoney(Math.round(Math.abs(cents) / 100 / 1000) * 1000); // nearest S$1,000
const NAME = { A: 'BTO', B: 'resale' };
// "Flat value" -> "flat value" in a sentence; a label that starts with an acronym ("CPF savings…") keeps it.
const lower = (s) => (s && /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * The heatmap in small: every cell's winner, top row = highest income growth (as the full grid draws it), and one
 * line on how many combinations each path wins.
 * @returns {{ rows: string[][], cols: number, total: number, a: number, b: number, line: string }}
 */
export function gridSummary(grid) {
  const rowsIn = Array.isArray(grid) ? grid : [];
  const rows = rowsIn.map((row) => (Array.isArray(row) ? row.map((c) => c?.winner ?? 'TIE') : [])).reverse();
  const flat = rows.flat();
  const total = flat.length;
  const a = flat.filter((w) => w === 'A').length;
  const b = flat.filter((w) => w === 'B').length;
  let line = '';
  if (total) {
    if (a === total) line = 'BTO stays ahead in every growth combination we tested.';
    else if (b === total) line = 'Resale stays ahead in every growth combination we tested.';
    else line = `BTO is ahead in ${a} of the ${total} growth combinations we tested, resale in ${b}.`;
  }
  return { rows, cols: rows[0]?.length ?? 0, total, a, b, line };
}

/**
 * "Why BTO comes out ahead": the gap's lines, biggest first, each with a bar width (0 to 100, against the biggest
 * line) on the side it favours, and one sentence on the main reason and what it outweighs.
 * @returns {{ winner: 'A'|'B'|null, title: string, sentence: string, rows: object[] }}
 */
export function whySummary(gap) {
  const rows = gapRows(gap);
  const margin = gap?.marginCents;
  const winner = typeof margin === 'number' && margin !== 0 ? (margin > 0 ? 'A' : 'B') : null;
  const top = rows.reduce((m, r) => Math.max(m, r.absCents), 0);
  const withBars = rows.map((r) => ({
    ...r,
    pct: top > 0 ? Math.max(1, Math.round((r.absCents / top) * 100)) : 0,
    side: r.favours === 'A' ? 'bto' : 'resale',
  }));
  if (!winner) {
    return { winner: null, title: 'Why the gap', sentence: '', rows: withBars };
  }
  const loser = winner === 'A' ? 'B' : 'A';
  const main = rows.find((r) => r.favours === winner);
  const counter = rows.find((r) => r.favours === loser);
  const name = NAME[winner];
  let sentence = main
    ? `${name === 'BTO' ? 'BTO' : 'Resale'} comes out ahead mostly on the ${lower(main.label)}: about ${k(main.absCents)} in its favour.`
    : '';
  if (main && counter) {
    sentence += ` That outweighs the ${lower(counter.label)}, where ${NAME[loser]} is ahead by about ${k(counter.absCents)}.`;
  }
  return { winner, title: `Why ${name === 'BTO' ? 'BTO' : 'resale'} comes out ahead`, sentence, rows: withBars };
}

const GRANT_NAMES = { EHG: 'Enhanced CPF Housing Grant', FAMILY: 'CPF Housing Grant (Family)', PHG: 'Proximity Housing Grant' };
// Family and Proximity grants exist only for resale flats: on a BTO they say nothing about the household.
const RESALE_ONLY = ['FAMILY', 'PHG'];

/**
 * One path's line in the Grants card: the grants it gets with their amounts, or why it gets none (the engine's own
 * first failed reason). On a BTO, the resale-only grants are left out and named once instead.
 * @param {'bto'|'resale'} tone
 */
export function grantLine(outcome, tone) {
  const grants = Array.isArray(outcome?.grants) ? outcome.grants : [];
  const shown = tone === 'bto' ? grants.filter((g) => !RESALE_ONLY.includes(g.id)) : grants;
  const paying = shown
    .filter((g) => (g.amountCents ?? 0) > 0)
    .map((g) => ({ id: g.id, name: GRANT_NAMES[g.id] ?? g.id, amount: formatMoney(g.amountCents / 100) }));
  let reason = '';
  if (!paying.length) {
    for (const g of shown) {
      const t = (g.tests ?? []).find((x) => !x.passed);
      if (t?.reason) { reason = t.reason; break; }
    }
  }
  const resaleOnly = tone === 'bto' && grants.some((g) => RESALE_ONLY.includes(g.id));
  return { paying, reason, resaleOnly };
}
