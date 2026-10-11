import { DATASETS, fetchAllRecords } from './client.js';
import { cached } from '../cache.js';

// Exactly as they appear in the dataset's flat_type field.
export const FLAT_TYPES = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION'];

// The app compares 3-, 4- and 5-room flats only, on both paths (D27). The route accepts only these.
export const SUPPORTED_FLAT_TYPES = ['3 ROOM', '4 ROOM', '5 ROOM'];

export const LOW_SAMPLE = 20;

// The 26 towns in the dataset's town field 
export const TOWNS = [
  'ANG MO KIO', 'BEDOK', 'BISHAN', 'BUKIT BATOK', 'BUKIT MERAH', 'BUKIT PANJANG', 'BUKIT TIMAH',
  'CENTRAL AREA', 'CHOA CHU KANG', 'CLEMENTI', 'GEYLANG', 'HOUGANG', 'JURONG EAST', 'JURONG WEST',
  'KALLANG/WHAMPOA', 'MARINE PARADE', 'PASIR RIS', 'PUNGGOL', 'QUEENSTOWN', 'SEMBAWANG', 'SENGKANG',
  'SERANGOON', 'TAMPINES', 'TOA PAYOH', 'WOODLANDS', 'YISHUN',
];


/** The `months` calendar months ending at asOf, as 'YYYY-MM', newest first. */
export function monthWindow(asOf, months) {
  const out = [];
  for (let i = 0; i < months; i++) {
    out.push(new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return out;
}

//  `sorted` must be ascending.
function percentile(sorted, p) {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

/** "61 years 04 months" -> 61.33 (years, as a number). Older rows use a plain number of years. null if unreadable. */
export function parseRemainingLease(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const years = /(\d+)\s*year/i.exec(value);
  const months = /(\d+)\s*month/i.exec(value);
  if (years || months) return Number(years?.[1] ?? 0) + Number(months?.[1] ?? 0) / 12;
  const plain = Number(value);
  return Number.isFinite(plain) ? plain : null;
}

const ascending = (values) => values.filter(Number.isFinite).sort((a, b) => a - b);
const toCents = (dollars) => Math.round(dollars * 100);

/**
 * Raw transaction records -> summary statistics. Money is integer CENTS (D14): data.gov.sg gives dollars,
 * converted here, once. Medians, not means, so a few unusual sales do not drag the figure.
 */
export function summariseResale(records) {
  const prices = ascending(records.map((r) => Number(r.resale_price)));
  if (prices.length === 0) return { count: 0 };
  const perSqm = ascending(records.map((r) => Number(r.resale_price) / Number(r.floor_area_sqm)));
  const areas = ascending(records.map((r) => Number(r.floor_area_sqm)));
  const leases = ascending(records.map((r) => parseRemainingLease(r.remaining_lease)));
  return {
    count: prices.length,
    medianPriceCents: toCents(percentile(prices, 0.5)),
    p25PriceCents: toCents(percentile(prices, 0.25)),
    p75PriceCents: toCents(percentile(prices, 0.75)),
    medianPricePerSqmCents: perSqm.length ? toCents(percentile(perSqm, 0.5)) : null,
    medianFloorAreaSqm: areas.length ? Math.round(percentile(areas, 0.5) * 10) / 10 : null,
    medianRemainingLeaseYears: leases.length ? Math.round(percentile(leases, 0.5) * 10) / 10 : null,
    lowSample: prices.length < LOW_SAMPLE,
  };
}

/** Median resale price (and spread) for a town + flat type over the last `months` months. */
export async function getResalePriceBasis({ town, flatType, months, asOf = new Date(), force = false }) {
    // End at the last full month: the current month is still being reported.
  const lastFullMonth = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 1));
  const window = monthWindow(lastFullMonth, months);

  const from = window.at(-1);
  const to = window[0];
  const key = `${DATASETS.resaleTransactions}:${town}:${flatType}:${from}..${to}`;

  const { payload: records, fetchedAt, cached: fromCache, stale } = await cached(key, DATASETS.resaleTransactions, async () => {
    const raw = await fetchAllRecords({
      datasetId: DATASETS.resaleTransactions,
      filters: { town, flat_type: flatType, month: window },
    });
    // Keep only the fields we use so cache entries stay small.
    return raw.map(({ month, resale_price, floor_area_sqm, remaining_lease }) => ({ month, resale_price, floor_area_sqm, remaining_lease }));
  }, { force });

  return {
    town,
    flatType,
    window: { from, to, months },
    ...summariseResale(records),
    source: { datasetId: DATASETS.resaleTransactions, name: 'Resale flat prices (HDB, data.gov.sg)' },
    cached: fromCache,
    stale, // true = data.gov.sg was unreachable and this is the last good copy
    fetchedAt, // "data as of" in the app
  };
}