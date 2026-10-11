// The one read-through cache (services/cache.js). A fake store and clock: no database, no waiting.
import { describe, it, expect } from 'vitest';
import { cached, FRESH_MS } from '../src/services/cache.js';

function memoryStore() {
  const map = new Map();
  return { get: async (k) => map.get(k) ?? null, set: async (e) => { map.set(e.key, e); } };
}

describe('cached', () => {
  it('fetches once, serves the copy for a day, then refreshes and logs each refresh', async () => {
    const store = memoryStore();
    let clock = Date.parse('2026-10-10T00:00:00Z');
    const logs = [];
    let loads = 0;
    const opts = { store, now: () => clock, log: (m) => logs.push(m) };
    const fetcher = async () => ({ n: ++loads });

    const first = await cached('k', 'ds', fetcher, opts);
    expect(first).toMatchObject({ payload: { n: 1 }, cached: false, stale: false });
    expect(first.fetchedAt.toISOString()).toBe('2026-10-10T00:00:00.000Z');

    clock += 60 * 60 * 1000; // an hour later: from the cache
    expect(await cached('k', 'ds', fetcher, opts)).toMatchObject({ payload: { n: 1 }, cached: true });

    clock += FRESH_MS; // next day: refreshed
    expect(await cached('k', 'ds', fetcher, opts)).toMatchObject({ payload: { n: 2 }, cached: false });
    expect(logs.filter((m) => m.startsWith('[cache] refreshed k'))).toHaveLength(2);
  });

  it('refreshes early when forced (the manual refresh in the demo)', async () => {
    const store = memoryStore();
    let loads = 0;
    const opts = { store, log: () => {} };
    await cached('k', 'ds', async () => ++loads, opts);
    expect(await cached('k', 'ds', async () => ++loads, { ...opts, force: true })).toMatchObject({ payload: 2, cached: false });
  });

  it('serves the last good copy, marked stale, when the refresh fails', async () => {
    const store = memoryStore();
    let clock = 0;
    const opts = { store, now: () => clock, log: () => {} };
    await cached('k', 'ds', async () => 'old', opts);
    clock = FRESH_MS + 1;
    const out = await cached('k', 'ds', async () => { throw new Error('down'); }, opts);
    expect(out).toMatchObject({ payload: 'old', stale: true, cached: true });
  });

  it('throws when the refresh fails and there is nothing cached', async () => {
    await expect(cached('k', 'ds', async () => { throw new Error('down'); }, { store: memoryStore(), log: () => {} }))
      .rejects.toThrow('down');
  });

  it('never caches an empty result', async () => {
    const store = memoryStore();
    let loads = 0;
    const opts = { store, log: () => {} };
    await cached('k', 'ds', async () => { loads++; return []; }, opts);
    await cached('k', 'ds', async () => { loads++; return []; }, opts);
    expect(loads).toBe(2);
  });
});