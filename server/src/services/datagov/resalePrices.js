// SEAT 3. Resale price basis per town + flat type, fetched from data.gov.sg and cached for a day.
// Shared by the API route (GET /api/data/resale-price) and the manual refresh command (npm run refresh-data),
// so both use exactly the same fetch, summary and cache key.
import { DATASETS, fetchAllRecords } from './client.js';
import { summariseResale } from './resaleSummary.js';
import { cached, ONE_DAY_MS } from '../cache.js';

export const RESALE_SOURCE = `https://data.gov.sg/datasets/${DATASETS.resaleTransactions}/view`;

export const resaleCacheKey = (town, flatType) => `resale:${town}:${flatType}`;

/** Fetch every sale for one town + flat type and summarise the latest 12 months. Null if none. */
export async function loadResale(town, flatType) {
  const records = await fetchAllRecords({
    datasetId: DATASETS.resaleTransactions,
    filters: { town, flat_type: flatType },
    pageSize: 5000,
  });
  return summariseResale(records)[0] ?? null;
}

/**
 * Cached resale summary. `force: true` refreshes even if the cached copy is still fresh.
 * Returns { data, fetchedAt, fromCache, stale }.
 */
export function getResalePrice(town, flatType, { force = false, loader = loadResale, cacheOptions = {} } = {}) {
  return cached(resaleCacheKey(town, flatType), ONE_DAY_MS, () => loader(town, flatType), { force, ...cacheOptions });
}