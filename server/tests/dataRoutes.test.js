// Tests for the cache and the /api/data routes (Vitest + Supertest). Fakes replace data.gov.sg and OneMap.
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { cached, ONE_DAY_MS } from '../src/services/cache.js';
import { createDataRouter } from '../src/routes/data.js';

// A private in-memory store per test, so tests never share cached data.
function memoryStore() {
  const map = new Map();
  return { get: async (k) => map.get(k) ?? null, set: async (e) => { map.set(e.key, e); } };
}

describe('cached', () => {
  it('calls the loader once, then serves the cached copy until it expires', async () => {
    const store = memoryStore();
    let clock = Date.parse('2026-10-10T00:00:00Z');
    const logs = [];
    let loads = 0;
    const opts = { store, now: () => clock, log: (m) => logs.push(m) };
    const loader = async () => ({ n: ++loads });

    const first = await cached('k', ONE_DAY_MS, loader, opts);
    expect(first).toMatchObject({ data: { n: 1 }, fromCache: false, stale: false, fetchedAt: '2026-10-10T00:00:00.000Z' });

    clock += 60 * 60 * 1000; // an hour later
    const second = await cached('k', ONE_DAY_MS, loader, opts);
    expect(second).toMatchObject({ data: { n: 1 }, fromCache: true });

    clock += ONE_DAY_MS; // next day: refresh
    const third = await cached('k', ONE_DAY_MS, loader, opts);
    expect(third).toMatchObject({ data: { n: 2 }, fromCache: false });
    expect(logs.filter((m) => m.startsWith('[cache] refreshed k'))).toHaveLength(2);
  });

  it('refreshes early when forced (manual refresh)', async () => {
    const store = memoryStore();
    let loads = 0;
    const opts = { store, log: () => {} };
    await cached('k', ONE_DAY_MS, async () => ++loads, opts);
    const forced = await cached('k', ONE_DAY_MS, async () => ++loads, { ...opts, force: true });
    expect(forced).toMatchObject({ data: 2, fromCache: false });
  });

  it('serves the last good copy, marked stale, when the refresh fails', async () => {
    const store = memoryStore();
    let clock = 0;
    const opts = { store, now: () => clock, log: () => {} };
    await cached('k', 1000, async () => 'old', opts);
    clock = 5000;
    const out = await cached('k', 1000, async () => { throw new Error('down'); }, opts);
    expect(out).toMatchObject({ data: 'old', stale: true, fromCache: true });
  });

  it('throws when the refresh fails and there is nothing cached', async () => {
    await expect(cached('k', 1000, async () => { throw new Error('down'); }, { store: memoryStore(), log: () => {} }))
      .rejects.toThrow('down');
  });
});

function appWith(overrides) {
  const store = memoryStore();
  const app = express();
  app.use('/api/data', createDataRouter({
    cached: (key, ttl, loader) => cached(key, ttl, loader, { store, log: () => {} }),
    ...overrides,
  }));
  return app;
}

const tampines = {
  town: 'TAMPINES', flatType: '4 ROOM', medianPrice: 600000, medianFloorAreaSqm: 93,
  medianRemainingLeaseYears: 61.5, transactions: 3, fromMonth: '2025-09', toMonth: '2026-08',
};

describe('GET /api/data/resale-price', () => {
  it('returns the summary with a data-as-of date and source, and caches it', async () => {
    let loads = 0;
    const app = appWith({ loadResale: async (town, flatType) => { loads++; return { ...tampines, town, flatType }; } });

    const res = await request(app).get('/api/data/resale-price').query({ town: 'tampines', flatType: '4 room' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ...tampines, fromCache: false, stale: false });
    expect(res.body.dataAsOf).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(res.body.source).toMatch(/data\.gov\.sg\/datasets\/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/);

    const again = await request(app).get('/api/data/resale-price').query({ town: 'TAMPINES', flatType: '4 ROOM' });
    expect(again.body.fromCache).toBe(true);
    expect(loads).toBe(1);
  });

  it('rejects a missing or invalid town or flat type', async () => {
    const app = appWith({ loadResale: async () => { throw new Error('should not be called'); } });
    expect((await request(app).get('/api/data/resale-price').query({ flatType: '4 ROOM' })).body.error.code).toBe('BAD_REQUEST');
    expect((await request(app).get('/api/data/resale-price').query({ town: 'TAMPINES', flatType: 'PENTHOUSE' })).status).toBe(400);
  });

  it('returns 404 when there are no recent sales', async () => {
    const app = appWith({ loadResale: async () => null });
    const res = await request(app).get('/api/data/resale-price').query({ town: 'TENGAH', flatType: '4 ROOM' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 502 with a plain message when data.gov.sg fails', async () => {
    const app = appWith({ loadResale: async () => { throw new Error('HTTP 503'); } });
    const res = await request(app).get('/api/data/resale-price').query({ town: 'BEDOK', flatType: '4 ROOM' });
    expect(res.status).toBe(502);
    expect(res.body.error).toEqual({ code: 'UPSTREAM_ERROR', message: 'Resale prices are unavailable right now. Try again in a minute.' });
  });
});

describe('GET /api/data/distance', () => {
  const measured = {
    from: { lat: 1.3245, lng: 103.93, address: '123 BEDOK NORTH ST 2', postal: '460123' },
    to: { lat: 1.3526, lng: 103.9447, address: '510 TAMPINES CENTRAL 1', postal: '529510' },
    km: 3.52,
  };

  it('returns both points and the distance', async () => {
    const app = appWith({ measure: async () => measured });
    const res = await request(app).get('/api/data/distance').query({ from: '460123', to: '529510' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ...measured, fromCache: false });
    expect(res.body.source).toMatch(/OneMap/);
  });

  it('rejects anything that is not two 6-digit postal codes', async () => {
    const app = appWith({ measure: async () => { throw new Error('should not be called'); } });
    expect((await request(app).get('/api/data/distance').query({ from: '4601', to: '529510' })).status).toBe(400);
    expect((await request(app).get('/api/data/distance').query({ from: '460123' })).status).toBe(400);
  });

  it('returns 404 for an unknown postal code and 502 when OneMap is down', async () => {
    const notFound = appWith({ measure: async () => { throw new Error('No location found for "000000"'); } });
    expect((await request(notFound).get('/api/data/distance').query({ from: '000000', to: '529510' })).status).toBe(404);
    const down = appWith({ measure: async () => { throw new Error('OneMap search failed (HTTP 503)'); } });
    expect((await request(down).get('/api/data/distance').query({ from: '460123', to: '529510' })).status).toBe(502);
  });
});

describe('routes not built yet', () => {
  it('still answer 501 with an owner', async () => {
    const res = await request(appWith({})).get('/api/data/bto-projects');
    expect(res.status).toBe(501);
  });
});