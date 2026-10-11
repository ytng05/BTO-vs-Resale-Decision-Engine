// HDB Resale Price Index (quarterly, 2009-Q1 = 100) from data.gov.sg.
import { DATASETS, fetchAllRecords, UpstreamError } from './client.js';
import { cached } from '../cache.js';

export const QUARTER_RE = /^\d{4}-Q[1-4]$/;

/** raw records - [{ quarter, index }], oldest first, with index parsed from its string form. */
export function parseRpi(records) {
  return records
    .map((r) => ({ quarter: r.quarter, index: Number(r.index) }))
    .filter((r) => QUARTER_RE.test(r.quarter) && Number.isFinite(r.index))
    .sort((a, b) => a.quarter.localeCompare(b.quarter)); // 'YYYY-Qn' strings sort in time order
}

// '2026-Q2' minus 5 years -> '2021-Q2'
function yearsBefore(quarter, years) {
  const [year, q] = quarter.split('-Q');
  return `${Number(year) - years}-Q${q}`;
}

/**
 * compound annual growth of the index over the `years` years ending at the latest quarter,
 * as a fraction (0.03 = 3%). Describes the past only, NOT a forecast. returns null if the series is too short.
 */
export function historicalAnnualGrowth(series, years) {
  const end = series.at(-1);
  if (!end) return null;
  const start = series.find((p) => p.quarter === yearsBefore(end.quarter, years));
  if (!start) return null;
  return Number(((end.index / start.index) ** (1 / years) - 1).toFixed(4));
}

/** The RPI series (optionally limited to from..to, inclusive) plus historical growth rates. */
export async function getRpiSeries({ from, to } = {}) {
  // One cache entry for the whole series (about 150 rows). The 7-day TTL picks up each new quarter.
  const { payload: all, fetchedAt, cached: fromCache } = await cached(
    `${DATASETS.resalePriceIndex}:all`,
    DATASETS.resalePriceIndex,
    async () => parseRpi(await fetchAllRecords({ datasetId: DATASETS.resalePriceIndex })),
  );
  if (all.length === 0) throw new UpstreamError('data.gov.sg returned an empty Resale Price Index');

  const series = all.filter((p) => (!from || p.quarter >= from) && (!to || p.quarter <= to));
  return {
    base: '2009-Q1 = 100',
    latest: all.at(-1),
    // Always measured back from the latest quarter, whatever from/to is.
    historicalAnnualGrowth: {
      '5y': historicalAnnualGrowth(all, 5),
      '10y': historicalAnnualGrowth(all, 10),
      '20y': historicalAnnualGrowth(all, 20),
    },
    count: series.length,
    series,
    source: { datasetId: DATASETS.resalePriceIndex, name: 'Resale Price Index (HDB, data.gov.sg)' },
    cached: fromCache,
    fetchedAt,
  };
}
