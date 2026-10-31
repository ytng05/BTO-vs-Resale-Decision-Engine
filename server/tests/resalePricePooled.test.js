// getResalePriceBasis({ towns }) pools several towns' sales into one median (D40, seat 3), and NEARBY_TOWNS.
// data.gov.sg is replaced by a fetch stub that answers per town, so this runs offline.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { clearMemoryCache } from '../src/services/cache.js';
import { getResalePriceBasis, NEARBY_TOWNS, TOWNS } from '../src/services/datagov/resalePrice.js';

const tx = (price, lease) => ({ month: '2026-08', resale_price: String(price), floor_area_sqm: '93.00', remaining_lease: `${lease} years` });
const SALES = {
  BISHAN: [tx(600000, 70)],
  'TOA PAYOH': [tx(1000000, 95), tx(1100000, 94), tx(500000, 60)],
  'ANG MO KIO': [tx(990000, 93), tx(1020000, 92)],
};

let fetchMock;
beforeEach(() => {
  clearMemoryCache(); // no database in tests: the cache is in memory, so empty it per test
  fetchMock = vi.fn(async (url) => {
    const { town } = JSON.parse(new URL(url).searchParams.get('filters'));
    const records = SALES[town] ?? [];
    return new Response(JSON.stringify({ success: true, result: { records, total: records.length } }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const asOf = new Date(Date.UTC(2026, 9, 15));

describe('getResalePriceBasis with towns (D40)', () => {
  it('pools the towns\' sales before taking the median, and lists the towns', async () => {
    const r = await getResalePriceBasis({ towns: ['BISHAN', 'TOA PAYOH', 'ANG MO KIO'], flatType: '4 ROOM', months: 12, minLeaseYears: 90, asOf });
    // 90+ only: 990k, 1,000k, 1,020k, 1,100k -> median (1,000k + 1,020k) / 2 = 1,010k
    expect(r.count).toBe(4);
    expect(r.medianPriceCents).toBe(101_000_000);
    expect(r.towns).toEqual(['BISHAN', 'TOA PAYOH', 'ANG MO KIO']);
    expect(r.town).toBe('BISHAN');
    expect(r.leaseFilter).toEqual({ minLeaseYears: 90, maxLeaseYears: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(3); // one request per town
  });

  it('reuses each town\'s cache entry: a pooled lookup after single-town ones fetches nothing new', async () => {
    await getResalePriceBasis({ town: 'TOA PAYOH', flatType: '4 ROOM', months: 12, asOf });
    await getResalePriceBasis({ town: 'ANG MO KIO', flatType: '4 ROOM', months: 12, asOf });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const pooled = await getResalePriceBasis({ towns: ['TOA PAYOH', 'ANG MO KIO'], flatType: '4 ROOM', months: 12, asOf });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pooled.cached).toBe(true);
    expect(pooled.count).toBe(5);
  });

  it('a single town answers as before, with no towns field', async () => {
    const r = await getResalePriceBasis({ town: 'TOA PAYOH', flatType: '4 ROOM', months: 12, asOf });
    expect(r.town).toBe('TOA PAYOH');
    expect(r).not.toHaveProperty('towns');
    expect(r.count).toBe(3);
  });
});

describe('NEARBY_TOWNS', () => {
  it('names only real dataset towns, never the town itself, for every dataset town and Tengah', () => {
    for (const town of [...TOWNS, 'TENGAH']) {
      expect(NEARBY_TOWNS[town], town).toBeDefined();
      expect(NEARBY_TOWNS[town].length, town).toBeGreaterThan(0);
      for (const n of NEARBY_TOWNS[town]) {
        expect(TOWNS, `${town} -> ${n}`).toContain(n);
        expect(n).not.toBe(town);
      }
    }
  });
});
