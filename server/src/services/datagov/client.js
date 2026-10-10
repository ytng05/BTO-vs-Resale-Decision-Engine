// SEAT 3. data.gov.sg client. Server-side only: never call it from the browser.
// Rate limits and API keys now apply. Register a key, keep it in .env (DATAGOV_API_KEY), cache results,

// Checked against guide.data.gov.sg on 2026-10-07: the key goes in the `x-api-key` header, and Datastore Search
// allows 4 requests per 10 s without a key (8 with a dev key, 20 with prod). Over the limit returns HTTP 429.


import { env } from '../../config/env.js';

export const DATASETS = {
  resaleTransactions: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc',
  priceRangeOfFlatsOffered: 'd_2d493bdcc1d9a44828b6e71cb095b88d',
  resalePriceIndex: 'd_14f63e595975691e7c24a27ae4c07c79', // confirmed 2026-10-07: fields quarter, index
};

const BASE_URL = env.datagovBaseUrl || 'https://data.gov.sg/api/action';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000;

// status and code are picked up by middleware/errorHandler.js
export class UpstreamError extends Error {
  constructor(message, status = 502, code = 'UPSTREAM_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
   Fetch one page of a dataset. Retries on 429 with backoff (1 s, 2 s, 4 s).
   data.gov.sg returns most numbers as strings, e.g. resale_price: "653000".
   @param {{ datasetId: string, limit?: number, offset?: number, filters?: object, sort?: string, retryDelayMs?: number }} params
   @returns {Promise<{ records: object[], total: number }>}
 */

export async function fetchDatastorePage({ datasetId, limit = 1000, offset = 0, filters, sort, retryDelayMs = 1000 }) {
  const url = new URL(`${BASE_URL}/datastore_search`);
  url.searchParams.set('resource_id', datasetId);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (filters) url.searchParams.set('filters', JSON.stringify(filters)); // a value can be an array: { month: ['2026-09', '2026-10'] }
  if (sort) url.searchParams.set('sort', sort);
  const headers = env.datagovApiKey ? { 'x-api-key': env.datagovApiKey } : {};

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      throw new UpstreamError(`data.gov.sg could not be reached (${err.name})`);
    }

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new UpstreamError('data.gov.sg rate limit reached. Try again in a few seconds.', 503, 'UPSTREAM_RATE_LIMITED');
      }
      await sleep(retryDelayMs * 2 ** attempt);
      continue;
    }

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new UpstreamError(`data.gov.sg returned HTTP ${res.status}`);
    return { records: body.result.records, total: body.result.total };
  }
}

/** Fetch every page of a query. maxRecords stops a too-broad filter from pulling the whole dataset. */
export async function fetchAllRecords({ datasetId, filters, sort, pageSize = 2000, maxRecords = 20000 }) {
  const all = [];
  for (let offset = 0; ; offset += pageSize) {
    const { records, total } = await fetchDatastorePage({ datasetId, limit: pageSize, offset, filters, sort });
    all.push(...records);
    if (records.length < pageSize || all.length >= total) return all;
    if (all.length >= maxRecords) throw new UpstreamError(`Query matched more than ${maxRecords} records`);
  }
}