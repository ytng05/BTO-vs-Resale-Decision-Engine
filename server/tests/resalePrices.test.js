// Tests for the shared resale-price function used by the route and the refresh command (Vitest).
import { describe, it, expect } from 'vitest';
import { getResalePrice, resaleCacheKey } from '../src/services/datagov/resalePrices.js';

function memoryStore() {
  const map = new Map();
  return { get: async (k) => map.get(k) ?? null, set: async (e) => { map.set(e.key, e); } };
}

describe('getResalePrice', () => {
  it('uses one cache key per town and flat type', () => {
    expect(resaleCacheKey('TAMPINES', '4 ROOM')).toBe('resale:TAMPINES:4 ROOM');
  });

  it('serves from cache, and force refreshes it (what npm run refresh-data does)', async () => {
    const store = memoryStore();
    let loads = 0;
    const loader = async (town, flatType) => ({ town, flatType, medianPrice: 600000 + ++loads });
    const cacheOptions = { store, log: () => {} };

    const first = await getResalePrice('TAMPINES', '4 ROOM', { loader, cacheOptions });
    const second = await getResalePrice('TAMPINES', '4 ROOM', { loader, cacheOptions });
    const forced = await getResalePrice('TAMPINES', '4 ROOM', { loader, cacheOptions, force: true });

    expect(first).toMatchObject({ fromCache: false, data: { medianPrice: 600001 } });
    expect(second).toMatchObject({ fromCache: true, data: { medianPrice: 600001 } });
    expect(forced).toMatchObject({ fromCache: false, data: { medianPrice: 600002 } });
  });
});