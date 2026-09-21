// SEAT 3. data.gov.sg client. Server-side only: never call it from the browser.
// Rate limits and API keys now apply. Register a key, keep it in .env (DATAGOV_API_KEY), cache results,
// and handle HTTP 429 with backoff. Confirm the base URL and key header in the CURRENT developer guide.
import { NotImplementedError } from '../../engine/errors.js';

export const DATASETS = {
  resaleTransactions: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc',
  priceRangeOfFlatsOffered: 'd_2d493bdcc1d9a44828b6e71cb095b88d',
  // TODO confirm this ID on data.gov.sg before relying on it (it appeared in a search result).
  resalePriceIndex: 'd_14f63e595975691e7c24a27ae4c07c79',
};

/**
 * Fetch one page of a dataset. Page with limit/offset, filter by town and flat type.
 * @param {{ datasetId: string, limit?: number, offset?: number, filters?: object }} params
 */
export async function fetchDatastorePage(params) {
  throw new NotImplementedError('fetchDatastorePage', 'seat 3');
}
