// OneMap routes for the display-only PHG map (D15). OneMap is faked by stubbing fetch: no network calls.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearMemoryCache } from '../src/services/cache.js';

const app = createApp();

const places = {
  '460123': { LATITUDE: '1.3245', LONGITUDE: '103.9300', ADDRESS: '123 BEDOK NORTH ST 2', POSTAL: '460123' },
  '529510': { LATITUDE: '1.3526', LONGITUDE: '103.9447', ADDRESS: '510 TAMPINES CENTRAL 1', POSTAL: '529510' },
  TAMPINES: { LATITUDE: '1.3540', LONGITUDE: '103.9450', ADDRESS: 'TAMPINES', POSTAL: 'NIL' },
};

function fakeOneMap() {
  return vi.fn(async (url) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/getToken')) {
      return new Response(JSON.stringify({ access_token: 't', expiry_timestamp: '2000000000' }), { status: 200 });
    }
    const hit = places[u.searchParams.get('searchVal')];
    return new Response(JSON.stringify({ found: hit ? 1 : 0, results: hit ? [hit] : [] }), { status: 200 });
  });
}

beforeEach(() => {
  clearMemoryCache();
  process.env.ONEMAP_EMAIL = 'team@example.com';
  process.env.ONEMAP_PASSWORD = 'pw';
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/data/geocode', () => {
  it('turns a postal code into a point for the map', async () => {
    vi.stubGlobal('fetch', fakeOneMap());
    const res = await request(app).get('/api/data/geocode?postal=460123');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lat: 1.3245, lng: 103.93, postal: '460123', source: expect.stringMatching(/OneMap/) });
  });

  it('checks the postal code and says plainly when it is not found', async () => {
    vi.stubGlobal('fetch', fakeOneMap());
    expect((await request(app).get('/api/data/geocode?postal=12')).status).toBe(400);
    const missing = await request(app).get('/api/data/geocode?postal=000000');
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toMatch(/not found/);
  });
});

describe('GET /api/data/town-point', () => {
  it('gives an approximate point for the chosen town, and rejects unknown towns', async () => {
    vi.stubGlobal('fetch', fakeOneMap());
    const res = await request(app).get('/api/data/town-point?town=tampines');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ town: 'TAMPINES', lat: 1.354, lng: 103.945, approximate: true });
    expect((await request(app).get('/api/data/town-point?town=ATLANTIS')).status).toBe(400);
  });
});

describe('GET /api/data/distance', () => {
  it('measures the straight-line distance between two postal codes', async () => {
    vi.stubGlobal('fetch', fakeOneMap());
    const res = await request(app).get('/api/data/distance?from=460123&to=529510');
    expect(res.status).toBe(200);
    expect(res.body.km).toBeGreaterThan(3);
    expect(res.body.km).toBeLessThan(4);
  });

  it('says the map is unavailable, without crashing, when OneMap is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 400 })));
    const res = await request(app).get('/api/data/distance?from=460124&to=529511');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.error.message).toMatch(/unavailable/);
  });
});