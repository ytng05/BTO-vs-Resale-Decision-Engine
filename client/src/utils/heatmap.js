// Pure helpers for the break-even heatmap. Kept out of the component so they can be unit-tested.
// Grid shape (docs/API_CONTRACT.md): rows of { annualPriceGrowth, annualIncomeGrowth, winner: 'A'|'B'|'TIE', marginCents }.
// Rows share an income growth value; columns share a price growth value.

export function axes(grid) {
  if (!grid?.length || !grid[0]?.length) return { priceGrowth: [], incomeGrowth: [] };
  return {
    priceGrowth: grid[0].map((cell) => cell.annualPriceGrowth),
    incomeGrowth: grid.map((row) => row[0].annualIncomeGrowth),
  };
}

// (nearestCell, closestIndex, outOfRange, isNum unchanged — they work on the axes()-derived
// arrays and the ad-hoc {priceGrowth, incomeGrowth} "point" built in ResultsView, not on the raw
// API field names, so nothing else here needs to change.)

// The cell closest to the user's own assumptions, so the heatmap can mark "you are here".
// Returns null if the user has no assumptions yet. `outside` is true when either assumption
// lies beyond the range the grid covers (the marker then sits on the nearest edge cell).
export function nearestCell(grid, point) {
  const { priceGrowth, incomeGrowth } = axes(grid);
  if (!priceGrowth.length || !isNum(point?.priceGrowth) || !isNum(point?.incomeGrowth)) return null;

  const col = closestIndex(priceGrowth, point.priceGrowth);
  const row = closestIndex(incomeGrowth, point.incomeGrowth);
  const outside =
    outOfRange(priceGrowth, point.priceGrowth) || outOfRange(incomeGrowth, point.incomeGrowth);
  return { row, col, outside };
}

function closestIndex(values, target) {
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(v - target) < Math.abs(values[best] - target)) best = i;
  });
  return best;
}

function outOfRange(values, target) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = values.length > 1 ? Math.abs(values[1] - values[0]) : 0;
  return target < lo - step / 2 || target > hi + step / 2;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);