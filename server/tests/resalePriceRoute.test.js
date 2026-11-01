import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearMemoryCache } from '../src/services/cache.js';

beforeEach(() => clearMemoryCache()); // no database in tests: the cache is in memory, so empty it per test

const app = createApp();

describe('GET /api/data/resale-price (mocked data.gov.sg)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('filters to a remaining-lease band when given one, as /api/compare does', async () => {
    const records = [['400000', '72 years'], ['500000', '81 years 06 months'], ['600000', '85 years'], ['700000', '95 years']]
      .map(([p, lease]) => ({ month: '2026-09', resale_price: p, floor_area_sqm: '100.00', remaining_lease: lease }));
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ success: true, result: { records, total: records.length } }), { status: 200 })));

    const res = await request(app).get('/api/data/resale-price?town=TAMPINES&flatType=4%20ROOM&leaseBand=80-89');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2); // only the 81y 6m and 85y sales
    expect(res.body.medianPriceCents).toBe(55_000_000);
  });

  it('400 for a lease band that is not like 80-89', async () => {
    const res = await request(app).get('/api/data/resale-price?town=TAMPINES&flatType=4%20ROOM&leaseBand=eighty');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/leaseBand/);
  });

  it('returns the summary built from the upstream records', async () => {
    const records = [400000, 500000, 600000, 700000].map((p) => ({
      month: '2026-09', resale_price: String(p), floor_area_sqm: '100.00', remaining_lease: '80 years',
    }));
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, result: { records, total: records.length } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).get('/api/data/resale-price?town=tampines&flatType=4%20ROOM&months=6');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      town: 'TAMPINES', flatType: '4 ROOM', count: 4, medianPriceCents: 55_000_000, p25PriceCents: 47_500_000,
      p75PriceCents: 62_500_000, medianRemainingLeaseYears: 80, lowSample: true, cached: false, stale: false,
    });
    expect(res.body.window.months).toBe(6);

    // The filter sent upstream is the normalised town, flat type and exactly 6 months.
    const sent = JSON.parse(new URL(fetchMock.mock.calls[0][0]).searchParams.get('filters'));
    expect(sent).toMatchObject({ town: 'TAMPINES', flat_type: '4 ROOM' });
    expect(sent.month).toHaveLength(6);
  });

  it('returns 404 NO_DATA when upstream has no transactions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ success: true, result: { records: [], total: 0 } }), { status: 200 })));

    const res = await request(app).get('/api/data/resale-price?town=BUKIT%20TIMAH&flatType=3%20ROOM');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_DATA');
  });

  it('serves the second request from the cache', async () => {
    const records = [{ month: '2026-09', resale_price: '500000', floor_area_sqm: '90' }];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, result: { records, total: 1 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await request(app).get('/api/data/resale-price?town=BEDOK&flatType=4%20ROOM');
    const again = await request(app).get('/api/data/resale-price?town=BEDOK&flatType=4%20ROOM');
    expect(again.body.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('only accepts 3-, 4- and 5-room (D27)', async () => {
    const res = await request(app).get('/api/data/resale-price?town=BEDOK&flatType=EXECUTIVE');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/3 ROOM, 4 ROOM, 5 ROOM/);
  });

  it('rejects an unknown town without calling data.gov.sg', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).get('/api/data/resale-price?town=TAMPNES&flatType=4%20ROOM');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});