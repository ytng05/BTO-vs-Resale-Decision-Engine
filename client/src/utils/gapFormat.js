// Display helpers for the "Why the gap" panel (gapBreakdown in POST /api/compare, D34,
// docs/API_CONTRACT.md). Pure functions, so they are unit-tested in tests/gapFormat.test.js.
// Money stays in integer cents until the last step. Every line is signed so positive helps Path A (BTO),
// negative helps Path B (resale); the lines sum exactly to marginCents. Wording follows the contract's
// guardrails: "net financial position", never "profit".
import { formatMoney } from './format.js';

const DEFAULT_LABELS = { labelA: 'BTO', labelB: 'resale' };

function linesOf(gap) {
  return Array.isArray(gap?.lines) ? gap.lines : [];
}

// Lines that make a difference, biggest first (ties keep the server's order). Each row:
// { id, label, amountCents, absCents, favours: 'A' | 'B', sideText: 'Favours BTO' }.
export function gapRows(gap, labels = DEFAULT_LABELS) {
  const { labelA, labelB } = { ...DEFAULT_LABELS, ...labels };
  return linesOf(gap)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => typeof line.amountCents === 'number' && line.amountCents !== 0)
    .sort((x, y) => Math.abs(y.line.amountCents) - Math.abs(x.line.amountCents) || x.index - y.index)
    .map(({ line }) => {
      const favours = line.amountCents > 0 ? 'A' : 'B';
      return {
        id: line.id,
        label: line.label,
        amountCents: line.amountCents,
        absCents: Math.abs(line.amountCents),
        favours,
        sideText: `Favours ${favours === 'A' ? labelA : labelB}`,
      };
    });
}

// How many of the server's lines are exactly zero (hidden from the list).
export function hiddenLineCount(gap) {
  return linesOf(gap).filter((line) => line.amountCents === 0).length;
}

// The last row: the whole gap. { favours: 'A' | 'B' | null, absCents, text }.
export function gapTotal(gap, labels = DEFAULT_LABELS) {
  const { labelA, labelB } = { ...DEFAULT_LABELS, ...labels };
  const margin = gap?.marginCents;
  if (typeof margin !== 'number') return { favours: null, absCents: 0, text: '' };
  if (margin === 0) return { favours: null, absCents: 0, text: 'No difference between the two paths' };
  const favours = margin > 0 ? 'A' : 'B';
  return {
    favours,
    absCents: Math.abs(margin),
    text: `${favours === 'A' ? labelA : labelB} ends ${formatMoney(Math.abs(margin) / 100)} ahead`,
  };
}

// Grants are not a line in the breakdown (D34), so say what each path received. '' when not given.
export function grantsText(gap, labels = DEFAULT_LABELS) {
  const { labelA, labelB } = { ...DEFAULT_LABELS, ...labels };
  const a = gap?.totalGrants?.aCents;
  const b = gap?.totalGrants?.bCents;
  if (typeof a !== 'number' || typeof b !== 'number') return '';
  return `Grants received: ${labelA} ${formatMoney(a / 100)}, ${labelB} ${formatMoney(b / 100)}.`;
}
