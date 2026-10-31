import { describe, expect, it } from 'vitest';
import { mockBtoProjects, mockResalePrice } from '../src/api/mock/mockData.js';
import {
  btoColumn, formatArea, formatAreaRange, formatMonth, pickBtoProject, resaleColumn, sizePriceRows,
} from '../src/utils/sizePrice.js';

// One project as GET /api/data/bto-projects?town=SEMBAWANG&flatType=4 ROOM returns it (Sembawang Portico, Jun 2026).
const PORTICO = {
  id: 'sembawang-portico', name: 'Sembawang Portico', launch: '2026-06',
  flats: [{ flatType: '4 ROOM', floorAreaSqm: { min: 93, max: 93 }, priceMinCents: 32_000_000, priceMaxCents: 43_700_000 }],
};
const RESALE = {
  count: 312, window: { from: '2025-10', to: '2026-09', months: 12 },
  medianPriceCents: 60_000_000, p25PriceCents: 55_000_000, p75PriceCents: 66_000_000,
  medianPricePerSqmCents: 645_200, medianFloorAreaSqm: 93, medianRemainingLeaseYears: 72.5,
};

describe('formatArea / formatAreaRange', () => {
  it('shows square metres, a range only when the sizes differ', () => {
    expect(formatArea(93)).toBe('93 m²');
    expect(formatArea(92.46)).toBe('92.5 m²');
    expect(formatArea(null)).toBe('—');
    expect(formatAreaRange({ min: 90, max: 93 })).toBe('90–93 m²');
    expect(formatAreaRange({ min: 93, max: 93 })).toBe('93 m²');
    expect(formatAreaRange(undefined)).toBe('—');
  });
});

describe('formatMonth', () => {
  it('turns YYYY-MM into a short month and year', () => {
    expect(formatMonth('2025-10')).toBe('Oct 2025');
    expect(formatMonth('2026-01')).toBe('Jan 2026');
    expect(formatMonth('soon')).toBe('soon');
    expect(formatMonth(undefined)).toBe('');
  });
});

describe('pickBtoProject', () => {
  it('uses the project the comparison priced, else the newest (first) one', () => {
    const other = { ...PORTICO, id: 'other' };
    expect(pickBtoProject([PORTICO, other], 'other')).toBe(other);
    expect(pickBtoProject([PORTICO, other], undefined)).toBe(PORTICO);
    expect(pickBtoProject([PORTICO, other], 'gone')).toBe(PORTICO);
    expect(pickBtoProject([], 'x')).toBeNull();
  });
});

describe('btoColumn', () => {
  it('divides the price used by the floor area', () => {
    // S$400,000 / 93 m² = S$4,301.08 per m²
    const c = btoColumn(PORTICO, 40_000_000);
    expect(c.area).toBe('93 m²');
    expect(c.priceRange).toBe('S$320,000–S$437,000');
    expect(c.price).toBe('S$400,000');
    expect(c.perSqm).toBe('S$4,301');
    expect(c.lease).toBe('99 years');
    expect(c.source).toBe('Sembawang Portico (launched Jun 2026)');
  });

  it('falls back to the middle of the price range, and the middle of a floor area range', () => {
    // no price used: (320,000 + 437,000) / 2 = S$378,500; / 93 m² = S$4,069.89
    expect(btoColumn(PORTICO).perSqm).toBe('S$4,070');
    // S$400,000 / ((90 + 93) / 2 = 91.5 m²) = S$4,371.58
    const ranged = { ...PORTICO, flats: [{ ...PORTICO.flats[0], floorAreaSqm: { min: 90, max: 93 } }] };
    expect(btoColumn(ranged, 40_000_000).perSqm).toBe('S$4,372');
  });

  it('is null without a project', () => {
    expect(btoColumn(null)).toBeNull();
    expect(btoColumn({ name: 'x', flats: [] })).toBeNull();
  });
});

describe('resaleColumn', () => {
    it('shows the medians of recent sales when no price is used', () => {
    const c = resaleColumn(RESALE);
    expect(c.source).toBe('312 sales, all leases, Oct 2025 to Sep 2026');
    expect(c.area).toBe('93 m² (median)');
    expect(c.priceRange).toBe('S$550,000–S$660,000');
    expect(c.price).toBe('S$600,000 (median)');
    expect(c.perSqm).toBe('S$6,452 (median)');
    expect(c.lease).toBe('72.5 years (median)');
  });

  it('shows the price the comparison used, divided by the median floor area', () => {
    // S$660,000 / 93 m² = S$7,096.77 per m²
    const c = resaleColumn(RESALE, 66_000_000);
    expect(c.price).toBe('S$660,000');
    expect(c.perSqm).toBe('S$7,097');
    expect(c.priceRange).toBe('S$550,000–S$660,000'); // the sales' middle half, unchanged
  });

  it('says which lease band the sales are in when the API applied one', () => {
    const c = resaleColumn({ ...RESALE, leaseFilter: { minLeaseYears: 80, maxLeaseYears: 89 } });
    expect(c.source).toBe('312 sales, 80–89 years left, Oct 2025 to Sep 2026');
  });


  it('is null when there were no sales', () => {
    expect(resaleColumn({ count: 0 })).toBeNull();
    expect(resaleColumn(null)).toBeNull();
  });
});

describe('sizePriceRows', () => {
  it('lists every row for both paths, with a dash where a column is missing', () => {
    const rows = sizePriceRows(btoColumn(PORTICO, 40_000_000), null);
    expect(rows.map((r) => r.id)).toEqual(['source', 'area', 'price-range', 'price', 'per-sqm', 'lease']);
    expect(rows.find((r) => r.id === 'per-sqm')).toMatchObject({ bto: 'S$4,301', resale: '—' });
  });

  it('works on the mock data, so the dashboard has a table in mock mode', () => {
    const { projects } = mockBtoProjects({ town: 'TAMPINES', flatType: '4 ROOM' });
    const rows = sizePriceRows(btoColumn(pickBtoProject(projects)), resaleColumn(mockResalePrice()));
    rows.forEach((r) => {
      expect(r.bto).not.toBe('—');
      expect(r.resale).not.toBe('—');
    });
  });
});
