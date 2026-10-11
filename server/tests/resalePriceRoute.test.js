
import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/data/resale-price (mocked data.gov.sg)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the summary built from the upstream records', async () => {
    const records = [400000, 500000, 600000, 700000].map((p) => ({
      month: '2026-09', resale_price: String(p), floor_area_sqm: '100.00',
    }));
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, result: { records, total: records.length } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).get('/api/data/resale-price?town=tampines&flatType=4%20ROOM&months=6');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      town: 'TAMPINES', flatType: '4 ROOM', count: 4, median: 550000, p25: 475000, p75: 625000,
      lowSample: true, cached: false,
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

    const res = await request(app).get('/api/data/resale-price?town=BUKIT%20TIMAH&flatType=1%20ROOM');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_DATA');
  });

  it('rejects an unknown town without calling data.gov.sg', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).get('/api/data/resale-price?town=TAMPNES&flatType=4%20ROOM');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
