import { describe, it, expect, vi, afterEach } from 'vitest';
import { summariseResale, monthWindow } from '../src/services/datagov/resalePrice.js';
import { fetchDatastorePage } from '../src/services/datagov/client.js';

describe('summariseResale', () => {
  it('computes median, quartiles and price per sqm from string values', () => {
    const records = [400000, 500000, 600000, 700000].map((p) => ({ resale_price: String(p), floor_area_sqm: '100.00' }));
    expect(summariseResale(records)).toEqual({
      count: 4, median: 550000, p25: 475000, p75: 625000, medianPricePerSqm: 5500, lowSample: true,
    });
  });

  it('returns count 0 when there are no records', () => {
    expect(summariseResale([])).toEqual({ count: 0 });
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

  it('gives up with UPSTREAM_RATE_LIMITED after repeated 429s', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    await expect(fetchDatastorePage({ datasetId: 'x', retryDelayMs: 0 }))
      .rejects.toMatchObject({ status: 503, code: 'UPSTREAM_RATE_LIMITED' });
  });
});
