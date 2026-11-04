// My scenarios filter bar: search, town, flat type, path ahead and price range on the list summaries.
import { describe, it, expect } from 'vitest';
import {
  emptyFilters, filterScenarios, flatTypeOptions, hasFilters, summaryLine, townOptions, keepValidFilters, priceRangeProblem
} from '../src/utils/scenarioFilter.js';

const tampines = {
  id: '1',
  name: 'Tampines BTO vs Bedok resale',
  summary: { btoTown: 'TAMPINES', btoFlatType: '4 ROOM', resaleTown: 'BEDOK', resaleFlatType: '4 ROOM', ahead: 'A', btoPriceCents: 54_000_000, resalePriceCents: 62_000_000 },
};
const punggol = {
  id: '2',
  name: 'Punggol plan',
  summary: { btoTown: 'PUNGGOL', btoFlatType: '5 ROOM', resaleTown: 'TAMPINES', resaleFlatType: '5 ROOM', ahead: 'B', btoPriceCents: 70_000_000, resalePriceCents: 80_000_000 },
};
const unsaved = {
  id: '3',
  name: 'Draft',
  summary: { btoTown: 'BEDOK', btoFlatType: '3 ROOM', resaleTown: 'BEDOK', resaleFlatType: '3 ROOM', ahead: null, btoPriceCents: null, resalePriceCents: null },
};
const all = [tampines, punggol, unsaved];

function ids(list) {
  return list.map((s) => s.id);
}
function withFilters(changes) {
  return { ...emptyFilters(), ...changes };
}

describe('filterScenarios', () => {
  it('keeps everything when no filter is set', () => {
    expect(ids(filterScenarios(all, emptyFilters()))).toEqual(['1', '2', '3']);
  });

  it('searches names, ignoring case and spaces around the words', () => {
    expect(ids(filterScenarios(all, withFilters({ search: '  PUNGGOL ' })))).toEqual(['2']);
  });

  it('matches a town on either path', () => {
    expect(ids(filterScenarios(all, withFilters({ town: 'TAMPINES' })))).toEqual(['1', '2']);
    expect(ids(filterScenarios(all, withFilters({ town: 'BEDOK' })))).toEqual(['1', '3']);
  });

  it('matches a flat type on either path', () => {
    expect(ids(filterScenarios(all, withFilters({ flatType: '5 ROOM' })))).toEqual(['2']);
  });

  it('filters by the path ahead, with NONE for scenarios saved without a result', () => {
    expect(ids(filterScenarios(all, withFilters({ ahead: 'A' })))).toEqual(['1']);
    expect(ids(filterScenarios(all, withFilters({ ahead: 'B' })))).toEqual(['2']);
    expect(ids(filterScenarios(all, withFilters({ ahead: 'NONE' })))).toEqual(['3']);
  });

  it('keeps a scenario when either price is inside the range (dollars)', () => {
    expect(ids(filterScenarios(all, withFilters({ maxPrice: '600000' })))).toEqual(['1']);
    expect(ids(filterScenarios(all, withFilters({ minPrice: '750000' })))).toEqual(['2']);
    expect(ids(filterScenarios(all, withFilters({ minPrice: '550000', maxPrice: '650000' })))).toEqual(['1']);
  });

  it('ignores a price box that is not a number', () => {
    expect(ids(filterScenarios(all, withFilters({ maxPrice: 'abc' })))).toEqual(['1', '2', '3']);
  });

  it('combines filters', () => {
    expect(ids(filterScenarios(all, withFilters({ town: 'TAMPINES', ahead: 'B' })))).toEqual(['2']);
    expect(filterScenarios(all, withFilters({ town: 'TAMPINES', flatType: '3 ROOM' }))).toEqual([]);
  });

  it('copes with a scenario that has no summary', () => {
    expect(ids(filterScenarios([{ id: '9', name: 'Old' }], withFilters({ ahead: 'NONE' })))).toEqual(['9']);
    expect(filterScenarios([{ id: '9', name: 'Old' }], withFilters({ town: 'BEDOK' }))).toEqual([]);
  });
});

describe('hasFilters', () => {
  it('is false when empty or only spaces, true when anything is set', () => {
    expect(hasFilters(emptyFilters())).toBe(false);
    expect(hasFilters(withFilters({ search: '   ' }))).toBe(false);
    expect(hasFilters(withFilters({ town: 'BEDOK' }))).toBe(true);
  });
});

describe('dropdown options', () => {
  it('lists only the towns and flat types in the scenarios, once each, A to Z', () => {
    expect(townOptions(all)).toEqual([
      { value: 'BEDOK', label: 'Bedok' },
      { value: 'PUNGGOL', label: 'Punggol' },
      { value: 'TAMPINES', label: 'Tampines' },
    ]);
    expect(flatTypeOptions(all)).toEqual([
      { value: '3 ROOM', label: '3-room' },
      { value: '4 ROOM', label: '4-room' },
      { value: '5 ROOM', label: '5-room' },
    ]);
  });
});

describe('summaryLine', () => {
  it('says both flats and which path is ahead', () => {
    expect(summaryLine(tampines)).toBe('Tampines 4-room BTO vs Bedok 4-room resale · BTO ahead');
    expect(summaryLine(punggol)).toBe('Punggol 5-room BTO vs Tampines 5-room resale · Resale ahead');
    expect(summaryLine(unsaved)).toBe('Bedok 3-room BTO vs Bedok 3-room resale · Not calculated');
  });
});

describe('keepValidFilters', () => {
  it('resets a town or flat type that no scenario has any more, and keeps the rest', () => {
    const picked = withFilters({ search: 'plan', town: 'PUNGGOL', flatType: '5 ROOM', ahead: 'B' });
    expect(keepValidFilters(picked, all)).toEqual(picked);
    // Punggol plan deleted: no Punggol and no 5-room left.
    expect(keepValidFilters(picked, [tampines, unsaved])).toEqual(withFilters({ search: 'plan', ahead: 'B' }));
  });
});

describe('priceRangeProblem', () => {
  it('says when the range cannot match, and nothing when it can', () => {
    expect(priceRangeProblem(withFilters({ minPrice: '700000', maxPrice: '500000' }))).toContain('higher than');
    expect(priceRangeProblem(withFilters({ minPrice: '-1' }))).toContain('negative');
    expect(priceRangeProblem(withFilters({ minPrice: '500000', maxPrice: '500000' }))).toBe('');
    expect(priceRangeProblem(emptyFilters())).toBe('');
  });
});

describe('flatTypeLabel', () => {
  it('replaces every space, not just the first', () => {
    const multi = { id: '9', name: 'x', summary: { btoFlatType: 'MULTI GENERATION FLAT' } };
    expect(flatTypeOptions([multi])).toEqual([{ value: 'MULTI GENERATION FLAT', label: 'multi-generation-flat' }]);
  });
});
