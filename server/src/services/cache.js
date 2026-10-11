// Read-through cache for external data (data.gov.sg, OneMap), one model: models/ResaleCache.js.
//   - fresh (fetched less than FRESH_MS ago)  -> served from the cache, no upstream call
//   - older, or missing                        -> fetched again; every refresh is logged ("[cache] refreshed …")
//   - upstream fails but an older copy exists  -> the old copy is served, marked stale: true (never an error)
// Uses MongoDB when connected. Without MONGODB_URI it falls back to an in-memory Map, so the app and the
// demo still work (the memory copy is lost on restart).
import mongoose from 'mongoose';
import { ResaleCache } from '../models/ResaleCache.js';

export const FRESH_MS = 24 * 60 * 60 * 1000; // data.gov.sg updates daily at most: refresh once a day

const memory = new Map();

/** Where entries live: Mongo if connected, else memory. Tests pass their own store. */
export function defaultStore() {
  if (mongoose.connection.readyState === 1) {
    return {
      get: (key) => ResaleCache.findOne({ key }).lean(),
      set: ({ key, datasetId, payload, fetchedAt }) =>
        ResaleCache.updateOne({ key }, { key, datasetId, payload, fetchedAt }, { upsert: true }),
    };
  }
  return {
    get: async (key) => memory.get(key) ?? null,
    set: async (entry) => { memory.set(entry.key, entry); },
  };
}

/**
 * @param {string} key cache key
 * @param {string} datasetId data.gov.sg dataset id (or 'onemap'), stored with the entry
 * @param {() => Promise<any>} fetcher fetches fresh data from upstream
 * @param {{ force?: boolean, store?: object, now?: () => number, log?: (msg: string) => void, freshMs?: number }} options
 * @returns {Promise<{ payload: any, fetchedAt: Date, cached: boolean, stale: boolean }>}
 */
export async function cached(key, datasetId, fetcher, {
  force = false,
  store = defaultStore(),
  now = () => Date.now(),
  log = (msg) => console.info(msg),
  freshMs = FRESH_MS,
} = {}) {
  const hit = await store.get(key);
  const age = hit ? now() - new Date(hit.fetchedAt).getTime() : Infinity;
  if (hit && !force && age < freshMs) {
    return { payload: hit.payload, fetchedAt: new Date(hit.fetchedAt), cached: true, stale: false };
  }

  try {
    const started = now();
    const payload = await fetcher();
    const fetchedAt = new Date(now());
    const isEmpty = Array.isArray(payload) && payload.length === 0;
    if (!isEmpty) await store.set({ key, datasetId, payload, fetchedAt }); // never cache "no data"
    log(`[cache] refreshed ${key} at ${fetchedAt.toISOString()} (${now() - started} ms)`);
    return { payload, fetchedAt, cached: false, stale: false };
  } catch (err) {
    if (hit) {
      log(`[cache] refresh failed for ${key} (${err.message}); serving the copy from ${new Date(hit.fetchedAt).toISOString()}`);
      return { payload: hit.payload, fetchedAt: new Date(hit.fetchedAt), cached: true, stale: true };
    }
    throw err;
  }
}

/** Tests only: empty the in-memory store. */
export function clearMemoryCache() {
  memory.clear();
}