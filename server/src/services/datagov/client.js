// SEAT 3. data.gov.sg client. Server-side only: never call it from the browser.
// Rate limits and API keys apply: keep the key in .env (DATAGOV_API_KEY), cache results, and back off on HTTP 429.
// The base URL and key header are read from .env with defaults, so a change in data.gov.sg's
// developer guide is a config change, not a code change. Confirm both in the CURRENT guide.
// Uses Node's built-in fetch (Node 20+), so no extra library is needed.

export const DATASETS = {
  resaleTransactions: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc',
  priceRangeOfFlatsOffered: 'd_2d493bdcc1d9a44828b6e71cb095b88d',
  // TODO confirm this ID on data.gov.sg before relying on it (it appeared in a search result).
  resalePriceIndex: 'd_14f63e595975691e7c24a27ae4c07c79',
};

const DEFAULT_BASE_URL = 'https://data.gov.sg/api/action/datastore_search';
const DEFAULT_KEY_HEADER = 'x-api-key';
const DATASET_ID = /^d_[0-9a-f]{32}$/;
const MAX_PAGE_SIZE = 10000;

export class DataGovError extends Error {
  constructor(message, { status = null, datasetId = null } = {}) {
    super(message);
    this.name = 'DataGovError';
    this.status = status;
    this.datasetId = datasetId;
  }
}

const sleepFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry-After can be seconds ("5") or an HTTP date. Fall back to exponential backoff: 1s, 2s, 4s, 8s.
function retryDelayMs(response, attempt) {
  const header = response.headers?.get?.('retry-after');
  const seconds = Number(header);
  if (header && Number.isFinite(seconds)) return Math.min(seconds * 1000, 30000);
  const date = header ? Date.parse(header) : NaN;
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 30000);
  return 1000 * 2 ** attempt;
}

/**
 * Fetch one page of a dataset. Page with limit/offset, filter by town and flat type.
 * @param {{ datasetId: string, limit?: number, offset?: number, filters?: object }} params
 * @returns {Promise<{ records: object[], total: number }>}
 *
 * Options after the documented params exist for testing: fetchImpl, sleep, env, retries, timeoutMs.
 */
export async function fetchDatastorePage(params) {
  const {
    datasetId,
    limit = 1000,
    offset = 0,
    filters,
    fetchImpl = globalThis.fetch,
    sleep = sleepFor,
    env = process.env,
    retries = 4,
    timeoutMs = 15000,
  } = params ?? {};

  if (!DATASET_ID.test(String(datasetId))) throw new DataGovError(`Unknown dataset id: ${datasetId}`, { datasetId });
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new DataGovError(`limit must be 1-${MAX_PAGE_SIZE}`, { datasetId });
  if (!Number.isInteger(offset) || offset < 0) throw new DataGovError('offset must be a non-negative integer', { datasetId });

  const url = new URL(env.DATAGOV_BASE_URL || DEFAULT_BASE_URL);
  url.searchParams.set('resource_id', datasetId);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  if (filters && Object.keys(filters).length) url.searchParams.set('filters', JSON.stringify(filters));

  const headers = { accept: 'application/json' };
  if (env.DATAGOV_API_KEY) headers[env.DATAGOV_KEY_HEADER || DEFAULT_KEY_HEADER] = env.DATAGOV_API_KEY;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, { headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries) { await sleep(1000 * 2 ** attempt); continue; }
      throw new DataGovError(`data.gov.sg request failed: ${err.message}`, { datasetId });
    }
    clearTimeout(timer);

    // 429 = rate limited, 5xx = their side: wait and retry. Other errors are ours: fail now.
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await sleep(retryDelayMs(response, attempt));
      continue;
    }
    if (!response.ok) {
      throw new DataGovError(`data.gov.sg returned HTTP ${response.status}`, { status: response.status, datasetId });
    }

    const body = await response.json();
    if (!body?.success || !Array.isArray(body?.result?.records)) {
      throw new DataGovError('data.gov.sg returned an unexpected response shape', { status: response.status, datasetId });
    }
    return { records: body.result.records, total: Number(body.result.total ?? body.result.records.length) };
  }
}

/**
 * Fetch every record matching the filters, page by page.
 * Stops when a page comes back short or the reported total is reached; maxPages is a safety cap.
 */
export async function fetchAllRecords({ datasetId, filters, pageSize = 1000, maxPages = 200, ...options }) {
  const records = [];
  for (let page = 0; page < maxPages; page++) {
    const { records: batch, total } = await fetchDatastorePage({
      datasetId, filters, limit: pageSize, offset: page * pageSize, ...options,
    });
    records.push(...batch);
    if (batch.length < pageSize || records.length >= total) return records;
  }
  throw new DataGovError(`Stopped after ${maxPages} pages; narrow the filters`, { datasetId });
}