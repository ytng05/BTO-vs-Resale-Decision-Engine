// Unit tests for the OneMap client (Vitest). A fake fetch stands in for OneMap, so no network calls.
import { describe, it, expect } from 'vitest';
import { createOneMapClient, haversineKm, OneMapError } from '../src/services/onemap/client.js';

const env = { ONEMAP_EMAIL: 'team@example.com', ONEMAP_PASSWORD: 'pw' };
const noSleep = async () => {};

function reply(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

// Fake OneMap: a token endpoint plus a search that knows two postal codes.
function fakeOneMap({ expiry = 2_000_000_000, rejectFirstSearch = false } = {}) {
  const calls = { token: 0, search: [] };
  const places = {
    '460123': { LATITUDE: '1.3245', LONGITUDE: '103.9300', ADDRESS: '123 BEDOK NORTH ST 2', POSTAL: '460123', BLK_NO: '123', ROAD_NAME: 'BEDOK NORTH STREET 2' },
    // A building, not a block: OneMap sends 'NIL' for the block number.
    '529510': { LATITUDE: '1.3526', LONGITUDE: '103.9447', ADDRESS: '510 TAMPINES CENTRAL 1', POSTAL: '529510', BLK_NO: 'NIL', ROAD_NAME: 'TAMPINES CENTRAL 1' },
  };
  let rejected = !rejectFirstSearch;
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/getToken')) {
      calls.token++;
      return reply(200, { access_token: `tok${calls.token}`, expiry_timestamp: String(expiry) });
    }
    calls.search.push({ q: u.searchParams.get('searchVal'), auth: init.headers.authorization });
    if (!rejected) { rejected = true; return reply(401, {}); }
    const hit = places[u.searchParams.get('searchVal')];
    return reply(200, { found: hit ? 1 : 0, results: hit ? [hit] : [] });
  };
  return { fetchImpl, calls };
}

describe('haversineKm', () => {
  it('is zero for the same point and symmetric', () => {
    const p = { lat: 1.3, lng: 103.8 };
    expect(haversineKm(p, p)).toBe(0);
    const q = { lat: 1.35, lng: 103.94 };
    expect(haversineKm(p, q)).toBeCloseTo(haversineKm(q, p), 10);
  });

  it('matches a known distance (0.01° of latitude is about 1.11 km)', () => {
    expect(haversineKm({ lat: 1.3, lng: 103.8 }, { lat: 1.31, lng: 103.8 })).toBeCloseTo(1.112, 2);
  });
});

describe('OneMap client', () => {
  it('logs in once, geocodes both postal codes and measures the distance', async () => {
    const { fetchImpl, calls } = fakeOneMap();
    const om = createOneMapClient({ fetchImpl, env, sleep: noSleep, now: () => 1_000_000_000_000 });
    const out = await om.locateAndMeasure('460123', '529510');
    expect(calls.token).toBe(1);
    expect(calls.search.every((s) => s.auth === 'tok1')).toBe(true);
    expect(out.from).toEqual({ lat: 1.3245, lng: 103.93, address: '123 BEDOK NORTH ST 2', postal: '460123', block: '123', road: 'BEDOK NORTH STREET 2' });
    expect(out.to.block).toBe(''); // 'NIL' (no block number) comes back empty, for the resale-flat lookup
    expect(out.km).toBeGreaterThan(3);
    expect(out.km).toBeLessThan(4);
  });

  it('caches geocodes so the same postal code is looked up once', async () => {
    const { fetchImpl, calls } = fakeOneMap();
    const om = createOneMapClient({ fetchImpl, env, sleep: noSleep, now: () => 1_000_000_000_000 });
    await om.geocode('460123');
    await om.geocode('460123');
    expect(calls.search).toHaveLength(1);
  });

  it('reuses the token while it has more than an hour left, then logs in again', async () => {
    const expirySeconds = 2_000_000;
    const { fetchImpl, calls } = fakeOneMap({ expiry: expirySeconds });
    let clock = (expirySeconds - 3 * 3600) * 1000; // 3 hours before expiry
    const om = createOneMapClient({ fetchImpl, env, sleep: noSleep, now: () => clock });
    expect(await om.getToken()).toBe('tok1');
    expect(await om.getToken()).toBe('tok1');
    expect(calls.token).toBe(1);
    clock = (expirySeconds - 30 * 60) * 1000; // 30 minutes before expiry: renew early
    expect(await om.getToken()).toBe('tok2');
    expect(calls.token).toBe(2);
  });

  it('refreshes once and retries when OneMap rejects the token', async () => {
    const { fetchImpl, calls } = fakeOneMap({ rejectFirstSearch: true });
    const om = createOneMapClient({ fetchImpl, env, sleep: noSleep, now: () => 1_000_000_000_000 });
    const place = await om.geocode('460123');
    expect(place.postal).toBe('460123');
    expect(calls.token).toBe(2);
    expect(calls.search.map((s) => s.auth)).toEqual(['tok1', 'tok2']);
  });

  it('gives a clear error when nothing is found', async () => {
    const { fetchImpl } = fakeOneMap();
    const om = createOneMapClient({ fetchImpl, env, sleep: noSleep, now: () => 1_000_000_000_000 });
    await expect(om.geocode('000000')).rejects.toThrow(/No location found for "000000"/);
  });

  it('explains missing credentials instead of calling OneMap', async () => {
    const om = createOneMapClient({ fetchImpl: async () => { throw new Error('should not be called'); }, env: {} });
    await expect(om.geocode('460123')).rejects.toThrow(/ONEMAP_EMAIL and ONEMAP_PASSWORD/);
  });

  it('rejects an empty query', async () => {
    const om = createOneMapClient({ fetchImpl: async () => reply(200, {}), env });
    await expect(om.geocode('  ')).rejects.toBeInstanceOf(OneMapError);
  });
});

describe('townPoint', () => {
  it('gives an approximate point for a town from OneMap search', async () => {
    const fetchImpl = async (url) => {
      const u = new URL(url);
      if (u.pathname.endsWith('/getToken')) return reply(200, { access_token: 't', expiry_timestamp: '2000000000' });
      return reply(200, { found: 1, results: [{ LATITUDE: '1.3540', LONGITUDE: '103.9450', ADDRESS: 'TAMPINES', POSTAL: 'NIL' }] });
    };
    const client = createOneMapClient({ fetchImpl, env, sleep: noSleep });
    expect(await client.townPoint('TAMPINES')).toEqual({ lat: 1.354, lng: 103.945, label: 'TAMPINES', approximate: true });
  });
});