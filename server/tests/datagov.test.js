// Unit tests for the data.gov.sg client and the resale summary (Vitest). No real network calls:
// a fake fetch stands in for data.gov.sg so these run offline and in CI.
import { describe, it, expect } from 'vitest';
import { fetchDatastorePage, fetchAllRecords, DATASETS, DataGovError } from '../src/services/datagov/client.js';
import { summariseResale, parseRemainingLease, median } from '../src/services/datagov/resaleSummary.js';

const ID = DATASETS.resaleTransactions;
const noSleep = async () => {};

function reply(status, body, headers = {}) {
  return { status, ok: status >= 200 && status < 300, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => body };
}
const okPage = (records, total) => reply(200, { success: true, result: { records, total } });

describe('fetchDatastorePage', () => {
  it('builds the request: dataset, paging, filters and API key header', async () => {
    let seen;
    const fetchImpl = async (url, init) => { seen = { url: new URL(url), init }; return okPage([{ town: 'TAMPINES' }], 1); };
    const out = await fetchDatastorePage({
      datasetId: ID, limit: 50, offset: 100, filters: { town: 'TAMPINES', flat_type: '4 ROOM' },
      fetchImpl, env: { DATAGOV_API_KEY: 'secret' },
    });
    expect(out).toEqual({ records: [{ town: 'TAMPINES' }], total: 1 });
    expect(seen.url.origin + seen.url.pathname).toBe('https://data.gov.sg/api/action/datastore_search');
    expect(seen.url.searchParams.get('resource_id')).toBe(ID);
    expect(seen.url.searchParams.get('limit')).toBe('50');
    expect(seen.url.searchParams.get('offset')).toBe('100');
    expect(JSON.parse(seen.url.searchParams.get('filters'))).toEqual({ town: 'TAMPINES', flat_type: '4 ROOM' });
    expect(seen.init.headers['x-api-key']).toBe('secret');
  });

  it('takes the base URL and key header from env when set', async () => {
    let seen;
    const fetchImpl = async (url, init) => { seen = { url: String(url), init }; return okPage([], 0); };
    await fetchDatastorePage({
      datasetId: ID, fetchImpl,
      env: { DATAGOV_API_KEY: 'k', DATAGOV_BASE_URL: 'https://example.test/search', DATAGOV_KEY_HEADER: 'authorization' },
    });
    expect(seen.url.startsWith('https://example.test/search?')).toBe(true);
    expect(seen.init.headers.authorization).toBe('k');
  });

  it('sends no key header when there is no key', async () => {
    let headers;
    await fetchDatastorePage({ datasetId: ID, env: {}, fetchImpl: async (u, init) => { headers = init.headers; return okPage([], 0); } });
    expect(headers).not.toHaveProperty('x-api-key');
  });

  it('retries on 429 using Retry-After, then succeeds', async () => {
    const waits = [];
    let calls = 0;
    const fetchImpl = async () => (++calls === 1 ? reply(429, {}, { 'retry-after': '3' }) : okPage([{ a: 1 }], 1));
    const out = await fetchDatastorePage({ datasetId: ID, env: {}, fetchImpl, sleep: async (ms) => waits.push(ms) });
    expect(calls).toBe(2);
    expect(waits).toEqual([3000]);
    expect(out.records).toEqual([{ a: 1 }]);
  });

  it('backs off exponentially on 5xx and gives up after the retry limit', async () => {
    const waits = [];
    const fetchImpl = async () => reply(503, {});
    await expect(fetchDatastorePage({ datasetId: ID, env: {}, fetchImpl, retries: 2, sleep: async (ms) => waits.push(ms) }))
      .rejects.toMatchObject({ name: 'DataGovError', status: 503 });
    expect(waits).toEqual([1000, 2000]);
  });

  it('fails fast on a 4xx that is not 429', async () => {
    let calls = 0;
    await expect(fetchDatastorePage({ datasetId: ID, env: {}, sleep: noSleep, fetchImpl: async () => { calls++; return reply(403, {}); } }))
      .rejects.toMatchObject({ status: 403 });
    expect(calls).toBe(1);
  });

  it('retries a network failure, then reports it clearly', async () => {
    let calls = 0;
    await expect(fetchDatastorePage({ datasetId: ID, env: {}, retries: 1, sleep: noSleep, fetchImpl: async () => { calls++; throw new Error('ECONNRESET'); } }))
      .rejects.toThrow(/request failed: ECONNRESET/);
    expect(calls).toBe(2);
  });

  it('rejects bad input before calling the network', async () => {
    const fetchImpl = async () => { throw new Error('should not be called'); };
    await expect(fetchDatastorePage({ datasetId: 'not-an-id', fetchImpl })).rejects.toBeInstanceOf(DataGovError);
    await expect(fetchDatastorePage({ datasetId: ID, limit: 0, fetchImpl })).rejects.toBeInstanceOf(DataGovError);
    await expect(fetchDatastorePage({ datasetId: ID, offset: -1, fetchImpl })).rejects.toBeInstanceOf(DataGovError);
  });

  it('rejects an unexpected response shape', async () => {
    await expect(fetchDatastorePage({ datasetId: ID, env: {}, fetchImpl: async () => reply(200, { success: false }) }))
      .rejects.toThrow(/unexpected response/);
  });
});

describe('fetchAllRecords', () => {
  it('pages through until the total is reached', async () => {
    const all = Array.from({ length: 25 }, (_, i) => ({ i }));
    const offsets = [];
    const fetchImpl = async (url) => {
      const u = new URL(url);
      const offset = Number(u.searchParams.get('offset'));
      const limit = Number(u.searchParams.get('limit'));
      offsets.push(offset);
      return okPage(all.slice(offset, offset + limit), all.length);
    };
    const out = await fetchAllRecords({ datasetId: ID, pageSize: 10, env: {}, fetchImpl });
    expect(out).toHaveLength(25);
    expect(offsets).toEqual([0, 10, 20]);
  });

  it('stops at the page cap instead of looping forever', async () => {
    const fetchImpl = async () => okPage(Array.from({ length: 10 }, () => ({})), 1e9);
    await expect(fetchAllRecords({ datasetId: ID, pageSize: 10, maxPages: 3, env: {}, fetchImpl })).rejects.toThrow(/Stopped after 3 pages/);
  });
});

describe('summariseResale', () => {
  const row = (month, town, flatType, price, area, lease) => ({
    month, town, flat_type: flatType, resale_price: String(price), floor_area_sqm: String(area), remaining_lease: lease,
  });

  it('gives median price, floor area and remaining lease per town and flat type', () => {
    const out = summariseResale([
      row('2026-08', 'TAMPINES', '4 ROOM', 600000, 93, '61 years 06 months'),
      row('2026-07', 'TAMPINES', '4 ROOM', 580000, 92, '60 years'),
      row('2026-06', 'TAMPINES', '4 ROOM', 620000, 104, '70 years 03 months'),
      row('2026-08', 'BEDOK', '4 ROOM', 500000, 91, '55 years'),
    ]);
    expect(out).toEqual([
      { town: 'BEDOK', flatType: '4 ROOM', medianPrice: 500000, medianFloorAreaSqm: 91, medianRemainingLeaseYears: 55, transactions: 1, fromMonth: '2025-09', toMonth: '2026-08' },
      { town: 'TAMPINES', flatType: '4 ROOM', medianPrice: 600000, medianFloorAreaSqm: 93, medianRemainingLeaseYears: 61.5, transactions: 3, fromMonth: '2025-09', toMonth: '2026-08' },
    ]);
  });

  it('only uses the most recent window of sales', () => {
    const out = summariseResale([
      row('2026-08', 'TAMPINES', '4 ROOM', 600000, 93, '60 years'),
      row('2024-01', 'TAMPINES', '4 ROOM', 300000, 93, '60 years'),
    ], { windowMonths: 12 });
    expect(out[0].medianPrice).toBe(600000);
    expect(out[0].transactions).toBe(1);
  });

  it('skips malformed rows and handles an empty input', () => {
    expect(summariseResale([])).toEqual([]);
    expect(summariseResale([{ month: 'bad', resale_price: '1' }, { month: '2026-01', resale_price: 'x' }])).toEqual([]);
  });

  it('parses remaining lease text', () => {
    expect(parseRemainingLease('61 years 04 months')).toBeCloseTo(61.333, 3);
    expect(parseRemainingLease('95 years')).toBe(95);
    expect(parseRemainingLease('')).toBeNaN();
  });

  it('takes the median of even and odd lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});