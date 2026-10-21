import { describe, it, expect, vi, afterEach } from 'vitest';
import { summariseResale, monthWindow, parseRemainingLease, filterByLease } from '../src/services/datagov/resalePrice.js';
import { fetchDatastorePage, retryDelay } from '../src/services/datagov/client.js';

describe('summariseResale', () => {
  it('computes median, quartiles and price per sqm in cents (D14) from string values', () => {
    const records = [400000, 500000, 600000, 700000].map((p) => ({
      resale_price: String(p), floor_area_sqm: '100.00', remaining_lease: '61 years 06 months',
    }));
    expect(summariseResale(records)).toEqual({
      count: 4,
      medianPriceCents: 55_000_000,
      p25PriceCents: 47_500_000,
      p75PriceCents: 62_500_000,
      medianPricePerSqmCents: 550_000,
      medianFloorAreaSqm: 100,
      medianRemainingLeaseYears: 61.5,
      lowSample: true,
    });
  });

  it('returns count 0 when there are no records', () => {
    expect(summariseResale([])).toEqual({ count: 0 });
  });
});

describe('parseRemainingLease', () => {
  it('reads "61 years 04 months", "95 years", plain numbers, and gives null for nonsense', () => {
    expect(parseRemainingLease('61 years 04 months')).toBeCloseTo(61.333, 2);
    expect(parseRemainingLease('95 years')).toBe(95);
    expect(parseRemainingLease('70')).toBe(70);
    expect(parseRemainingLease(undefined)).toBeNull();
    expect(parseRemainingLease('n/a')).toBeNull();
  });
});

describe('monthWindow', () => {
  it('counts back across a year boundary', () => {
    expect(monthWindow(new Date('2026-02-15'), 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });
});

describe('fetchDatastorePage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries after a 429, then succeeds', async () => {
    const ok = { success: true, result: { records: [{ id: 1 }], total: 1 } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ok), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const page = await fetchDatastorePage({ datasetId: 'x', retryDelayMs: 0 });
    expect(page.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('also retries a 5xx before giving up', async () => {
    const ok = { success: true, result: { records: [], total: 0 } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ok), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchDatastorePage({ datasetId: 'x', retryDelayMs: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('waits as long as Retry-After says, else backs off 1 s, 2 s, 4 s (capped at 30 s)', () => {
    const withHeader = (v) => new Response('', { status: 429, headers: { 'retry-after': v } });
    expect(retryDelay(withHeader('5'), 0)).toBe(5000);
    expect(retryDelay(withHeader('120'), 0)).toBe(30000);
    expect(retryDelay(new Response('', { status: 429 }), 2)).toBe(4000);
  });

  it('gives up with UPSTREAM_RATE_LIMITED after repeated 429s', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    await expect(fetchDatastorePage({ datasetId: 'x', retryDelayMs: 0 }))
      .rejects.toMatchObject({ status: 503, code: 'UPSTREAM_RATE_LIMITED' });
  });
});

describe('filterByLease (D16 lease bands)', () => {
  const r = (lease) => ({ remaining_lease: lease });
  const records = [r('89 years 11 months'), r('90 years'), r('80 years'), r('79 years 11 months'), r('n/a')];
  it('keeps a band of whole years, top year included up to 11 months', () => {
    expect(filterByLease(records, { minLeaseYears: 80, maxLeaseYears: 89 }).map((x) => x.remaining_lease))
      .toEqual(['89 years 11 months', '80 years']);
  });
  it('a lower bound alone keeps everything from it up', () => {
    expect(filterByLease(records, { minLeaseYears: 90 }).map((x) => x.remaining_lease)).toEqual(['90 years']);
  });
  it('no bounds keeps every record, unreadable leases included', () => {
    expect(filterByLease(records)).toHaveLength(5);
  });
});
