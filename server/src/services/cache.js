// SEAT 3. Read-through cache for external API data.
// Uses MongoDB (collection `dataCache`) when connected, otherwise an in-memory map, so the server
// still works with no MONGODB_URI. Every refresh is logged, which is what the demo shows.
//
//   const { data, fetchedAt, fromCache, stale } = await cached('resale:TAMPINES:4 ROOM', ONE_DAY, loader);
import mongoose from 'mongoose';
import { DataCache } from '../models/DataCache.js';

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const memory = new Map();

/** Mongo when connected; in tests or with no database, an in-memory map. */
export function createStore({ useDb = () => mongoose.connection.readyState === 1 } = {}) {
  return {
    async get(key) {
      if (useDb()) return DataCache.findOne({ key }).lean();
      return memory.get(key) ?? null;
    },
    async set(entry) {
      if (useDb()) {
        await DataCache.updateOne({ key: entry.key }, { $set: entry }, { upsert: true });
        return;
      }
      memory.set(entry.key, entry);
    },
    clearMemory() { memory.clear(); },
  };
}

/**
 * Return cached data if fresh; otherwise call loader(), store the result and return it.
 * If the loader fails and an older copy exists, serve that copy with stale: true.
 * @param {string} key
 * @param {number} ttlMs how long a copy counts as fresh
 * @param {() => Promise<any>} loader fetches fresh data
 * @param {{ force?: boolean, store?: object, now?: () => number, log?: (msg: string) => void }} options
 */
export async function cached(key, ttlMs, loader, {
  force = false,
  store = createStore(),
  now = () => Date.now(),
  log = (msg) => console.info(msg),
} = {}) {
  const existing = await store.get(key);
  const fresh = existing && new Date(existing.expiresAt).getTime() > now();
  if (fresh && !force) {
    return { data: existing.data, fetchedAt: new Date(existing.fetchedAt).toISOString(), fromCache: true, stale: false };
  }

  try {
    const started = now();
    const data = await loader();
    const fetchedAt = new Date(now());
    await store.set({ key, data, fetchedAt, expiresAt: new Date(fetchedAt.getTime() + ttlMs) });
    log(`[cache] refreshed ${key} at ${fetchedAt.toISOString()} (${now() - started} ms)`);
    return { data, fetchedAt: fetchedAt.toISOString(), fromCache: false, stale: false };
  } catch (err) {
    if (existing) {
      log(`[cache] refresh failed for ${key} (${err.message}); serving copy from ${new Date(existing.fetchedAt).toISOString()}`);
      return { data: existing.data, fetchedAt: new Date(existing.fetchedAt).toISOString(), fromCache: true, stale: true };
    }
    throw err;
  }
}