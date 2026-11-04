// The redesigned Results page's "Would the answer change?" box, as a pure function (unit-tested in
// tests/resultsSummary.test.js): the heatmap in small. Nothing here is a forecast.

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
