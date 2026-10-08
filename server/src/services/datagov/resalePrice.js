
import { DATASETS, fetchAllRecords } from './client.js';
import { cached } from '../cache.js';

// Exactly as they appear in the dataset's flat_type field.
export const FLAT_TYPES = ['1 ROOM', '2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE', 'MULTI-GENERATION'];

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

/**  raw transaction records -> summary statistics. */
export function summariseResale(records) {
  const prices = records.map((r) => Number(r.resale_price)).filter(Number.isFinite).sort((a, b) => a - b);
  if (prices.length === 0) return { count: 0 };
  const perSqm = records
    .map((r) => Number(r.resale_price) / Number(r.floor_area_sqm))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    count: prices.length,
    median: Math.round(percentile(prices, 0.5)),
    p25: Math.round(percentile(prices, 0.25)),
    p75: Math.round(percentile(prices, 0.75)),
    medianPricePerSqm: perSqm.length ? Math.round(percentile(perSqm, 0.5)) : null,
    lowSample: prices.length < LOW_SAMPLE,
  };
}

/** Median resale price (and spread) for a town + flat type over the last `months` months. */
export async function getResalePriceBasis({ town, flatType, months, asOf = new Date() }) {
  const window = monthWindow(asOf, months);
  const from = window.at(-1);
  const to = window[0];
  const key = `${DATASETS.resaleTransactions}:${town}:${flatType}:${from}..${to}`;

  const { payload: records, fetchedAt, cached: fromCache } = await cached(key, DATASETS.resaleTransactions, async () => {
    const raw = await fetchAllRecords({
      datasetId: DATASETS.resaleTransactions,
      filters: { town, flat_type: flatType, month: window },
    });
    // Keep only the fields we use so cache entries stay small.
    return raw.map(({ month, resale_price, floor_area_sqm }) => ({ month, resale_price, floor_area_sqm }));
  });

  return {
    town,
    flatType,
    window: { from, to, months },
    ...summariseResale(records),
    source: { datasetId: DATASETS.resaleTransactions, name: 'Resale flat prices (HDB, data.gov.sg)' },
    cached: fromCache,
    fetchedAt,
  };
}
