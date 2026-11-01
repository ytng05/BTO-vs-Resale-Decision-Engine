// Display helpers for the Dashboard's size and price comparison (D35): how much flat each path gets for the money.
// Pure functions, so they are unit-tested in tests/sizePrice.test.js.
// Inputs are the API's own shapes, money in integer cents until the last step (D14):
//   btoProject  one project from GET /api/data/bto-projects?town=&flatType= (flats trimmed to that type)
//   resale      GET /api/data/resale-price?town=&flatType=&leaseBand= (medians of the last 12 months' sales)
//   priceUsedCents  the price the comparison used for that path, today's (resolvedA/B.purchasePriceCents), if known.
//                   Not outcome.purchasePriceCents: that one is grown to the application year (D31).
import { formatMoney } from './format.js';

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const dollars = (cents) => (isNum(cents) ? cents / 100 : null);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2025-10' -> 'Oct 2025' (UI.md §10); anything else is shown as it came.
export function formatMonth(yearMonth) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(yearMonth ?? ''));
  return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(yearMonth ?? '');
}

// 93 -> "93 m²"; 92.5 -> "92.5 m²"
export function formatArea(sqm) {
  if (!isNum(sqm)) return '—';
  return `${Math.round(sqm * 10) / 10} m²`;
}

// { min: 90, max: 93 } -> "90–93 m²"; one size -> "93 m²"
export function formatAreaRange(range) {
  if (!range || !isNum(range.min) || !isNum(range.max)) return '—';
  return range.min === range.max ? formatArea(range.min) : `${range.min}–${formatArea(range.max)}`;
}

// The newest project is what the server prices when no project was picked (D7), and the API lists newest first.
export function pickBtoProject(projects, id) {
  if (!Array.isArray(projects) || projects.length === 0) return null;
  return projects.find((p) => p.id === id) ?? projects[0];
}

/** BTO column. Price per m² = the price used ÷ the middle of the project's floor area range. */
export function btoColumn(project, priceUsedCents) {
  const flat = project?.flats?.[0];
  if (!flat) return null;
  const area = flat.floorAreaSqm;
  const midArea = area && isNum(area.min) && isNum(area.max) ? (area.min + area.max) / 2 : null;
  const priceCents = isNum(priceUsedCents)
    ? priceUsedCents
    : isNum(flat.priceMinCents) && isNum(flat.priceMaxCents) ? Math.round((flat.priceMinCents + flat.priceMaxCents) / 2) : null;
  return {
    source: `${project.name}${project.launch ? ` (launched ${formatMonth(project.launch)})` : ''}`,
    area: formatAreaRange(area),
    priceRange: isNum(flat.priceMinCents) && isNum(flat.priceMaxCents)
      ? `${formatMoney(dollars(flat.priceMinCents))}–${formatMoney(dollars(flat.priceMaxCents))}`
      : '—',
    price: formatMoney(dollars(priceCents)),
    perSqm: midArea && isNum(priceCents) ? formatMoney(dollars(priceCents) / midArea) : '—',
    lease: '99 years',
  };
}

/**
 * Resale column: recent sales of this flat type in the town, in a lease band when the API applied one (its
 * leaseFilter), else all leases. Price per m² = the price used ÷ the median floor area; without a price used,
 * the medians of the sales.
 */
export function resaleColumn(resale, priceUsedCents) {
  if (!resale || !resale.count) return null;
  const w = resale.window;
  const band = resale.leaseFilter;
  const leases = band && isNum(band.minLeaseYears) && isNum(band.maxLeaseYears)
    ? `${band.minLeaseYears}–${band.maxLeaseYears} years left`
    : 'all leases';
  const used = isNum(priceUsedCents);
  return {
    source: `${resale.count} sales, ${leases}${w?.from && w?.to ? `, ${formatMonth(w.from)} to ${formatMonth(w.to)}` : ''}`,
    area: `${formatArea(resale.medianFloorAreaSqm)} (median)`,
    priceRange: isNum(resale.p25PriceCents) && isNum(resale.p75PriceCents)
      ? `${formatMoney(dollars(resale.p25PriceCents))}–${formatMoney(dollars(resale.p75PriceCents))}`
      : '—',
    price: used ? formatMoney(dollars(priceUsedCents)) : `${formatMoney(dollars(resale.medianPriceCents))} (median)`,
    perSqm: used && isNum(resale.medianFloorAreaSqm)
      ? formatMoney(dollars(priceUsedCents) / resale.medianFloorAreaSqm)
      : `${formatMoney(dollars(resale.medianPricePerSqmCents))} (median)`,
    lease: isNum(resale.medianRemainingLeaseYears) ? `${resale.medianRemainingLeaseYears} years (median)` : '—',
  };
}

// The table's rows, in order: id is kebab-case for data-cy (CONVENTIONS.md), key is the column field.
// A column that could not load shows "—" in every cell.
export const ROWS = [
  { id: 'source', key: 'source', label: 'Based on' },
  { id: 'area', key: 'area', label: 'Floor area' },
  { id: 'price-range', key: 'priceRange', label: 'Price range' },
  { id: 'price', key: 'price', label: 'Price' },
  { id: 'per-sqm', key: 'perSqm', label: 'Price per m²' },
  { id: 'lease', key: 'lease', label: 'Lease left at purchase' },
];

export function sizePriceRows(bto, resale) {
  return ROWS.map(({ id, key, label }) => ({ id, label, bto: bto?.[key] ?? '—', resale: resale?.[key] ?? '—' }));
}
