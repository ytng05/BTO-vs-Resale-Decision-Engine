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

// D41: the towns whose near-new sales stand in for a BTO town's when it has too few of its own (engineInputs.js).
// Chosen by hand: next to each other, and similar estates. Clementi is left out of Jurong East's list on purpose:
// its near-new flats sell far higher (5-room about S$1.45M against S$0.74-0.83M in Jurong West and Bukit Batok).
// TENGAH is not a dataset town yet: its first flats are not old enough to resell.
export const NEARBY_TOWNS = {
  'ANG MO KIO': ['BISHAN', 'SERANGOON'],
  BEDOK: ['TAMPINES', 'GEYLANG'],
  BISHAN: ['TOA PAYOH', 'ANG MO KIO'],
  'BUKIT BATOK': ['BUKIT PANJANG', 'JURONG WEST', 'CHOA CHU KANG'],
  'BUKIT MERAH': ['QUEENSTOWN', 'CENTRAL AREA'],
  'BUKIT PANJANG': ['CHOA CHU KANG', 'BUKIT BATOK'],
  'BUKIT TIMAH': ['QUEENSTOWN', 'CLEMENTI'],
  'CENTRAL AREA': ['BUKIT MERAH', 'KALLANG/WHAMPOA'],
  'CHOA CHU KANG': ['BUKIT PANJANG', 'BUKIT BATOK'],
  CLEMENTI: ['JURONG EAST', 'QUEENSTOWN'],
  GEYLANG: ['KALLANG/WHAMPOA', 'MARINE PARADE'],
  HOUGANG: ['SERANGOON', 'SENGKANG'],
  'JURONG EAST': ['JURONG WEST', 'BUKIT BATOK'],
  'JURONG WEST': ['JURONG EAST', 'BUKIT BATOK'],
  'KALLANG/WHAMPOA': ['GEYLANG', 'TOA PAYOH'],
  'MARINE PARADE': ['BEDOK', 'GEYLANG'],
  'PASIR RIS': ['TAMPINES', 'PUNGGOL'],
  PUNGGOL: ['SENGKANG', 'PASIR RIS'],
  QUEENSTOWN: ['BUKIT MERAH', 'CLEMENTI'],
  SEMBAWANG: ['YISHUN', 'WOODLANDS'],
  SENGKANG: ['PUNGGOL', 'HOUGANG'],
  SERANGOON: ['HOUGANG', 'ANG MO KIO'],
  TAMPINES: ['PASIR RIS', 'BEDOK'],
  TENGAH: ['BUKIT BATOK', 'JURONG WEST', 'CHOA CHU KANG'],
  'TOA PAYOH': ['BISHAN', 'KALLANG/WHAMPOA'],
  WOODLANDS: ['SEMBAWANG', 'YISHUN'],
  YISHUN: ['SEMBAWANG', 'ANG MO KIO'],
};


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

/**
 * Keep the records whose remaining lease falls in a band of whole years, e.g. { minLeaseYears: 80, maxLeaseYears: 89 }
 * keeps 80 years 0 months up to 89 years 11 months (D16). Either bound may be omitted; records with an unreadable
 * lease are dropped only when a bound is given.
 */
export function filterByLease(records, { minLeaseYears, maxLeaseYears } = {}) {
  if (minLeaseYears === undefined && maxLeaseYears === undefined) return records;
  return records.filter((r) => {
    const lease = parseRemainingLease(r.remaining_lease);
    if (lease === null) return false;
    return (minLeaseYears === undefined || lease >= minLeaseYears) && (maxLeaseYears === undefined || lease < maxLeaseYears + 1);
  });
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

/** One town + flat type's sales for the window, cached per town (so pooling towns reuses each town's entry). */
async function townRecords(town, flatType, window, force) {
  const key = `${DATASETS.resaleTransactions}:${town}:${flatType}:${window.at(-1)}..${window[0]}`;
  return cached(key, DATASETS.resaleTransactions, async () => {
    const raw = await fetchAllRecords({
      datasetId: DATASETS.resaleTransactions,
      filters: { town, flat_type: flatType, month: window },
    });
    // Keep only the fields we use so cache entries stay small.
    return raw.map(({ month, resale_price, floor_area_sqm, remaining_lease }) => ({ month, resale_price, floor_area_sqm, remaining_lease }));
  }, { force });
}

/**
 * Median resale price (and spread) for a town + flat type over the last `months` months. Optional
 * minLeaseYears / maxLeaseYears narrow it to a remaining-lease band (filterByLease); the cache holds the
 * whole town + flat type, so a band never needs its own fetch.
 * `towns` (instead of `town`) pools several towns' sales into one median (D41): the response then lists them,
 * is only `cached` if every town was, is `stale` if any was, and is as of the oldest town's fetch.
 */
export async function getResalePriceBasis({ town, towns, flatType, months, minLeaseYears, maxLeaseYears, asOf = new Date(), force = false }) {
  // End at the last full month: the current month is still being reported.
  const lastFullMonth = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 1));
  const window = monthWindow(lastFullMonth, months);

  const from = window.at(-1);
  const to = window[0];
  const list = towns ?? [town];
  const parts = await Promise.all(list.map((t) => townRecords(t, flatType, window, force)));
  const records = parts.flatMap((p) => p.payload);
  const oldest = parts.reduce((a, b) => (new Date(b.fetchedAt) < new Date(a.fetchedAt) ? b : a));

  return {
    town: list[0],
    ...(towns ? { towns: list } : {}),
    flatType,
    window: { from, to, months },
    ...(minLeaseYears !== undefined || maxLeaseYears !== undefined ? { leaseFilter: { minLeaseYears, maxLeaseYears } } : {}),
    ...summariseResale(filterByLease(records, { minLeaseYears, maxLeaseYears })),
    source: { datasetId: DATASETS.resaleTransactions, name: 'Resale flat prices (HDB, data.gov.sg)' },
    cached: parts.every((p) => p.cached),
    stale: parts.some((p) => p.stale), // true = data.gov.sg was unreachable and this is the last good copy
    fetchedAt: oldest.fetchedAt, // "data as of" in the app
  };
}
