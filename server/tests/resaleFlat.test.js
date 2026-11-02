// The Resale flat search (services/datagov/resaleFlat.js). Seat 1 writes the functions; these tests come first.
// Street spellings are checked against HDB's resale dataset on data.gov.sg (2 Nov 2026), not invented.
// The lookups use fakes in place of OneMap and data.gov.sg, so nothing here goes over the network.
import { describe, it, expect } from 'vitest';
import { FlatLookupError, findResaleFlat, leaseBandFor, normaliseStreet } from '../src/services/datagov/resaleFlat.js';
import { DATASETS } from '../src/services/datagov/client.js';

describe('normaliseStreet', () => {
  it("abbreviates OneMap's road names the way HDB's dataset spells them", () => {
    expect(normaliseStreet('TAMPINES STREET 11')).toBe('TAMPINES ST 11');
    expect(normaliseStreet('ANG MO KIO AVENUE 10')).toBe('ANG MO KIO AVE 10');
    expect(normaliseStreet('BEDOK NORTH ROAD')).toBe('BEDOK NTH RD');
    expect(normaliseStreet('JALAN BUKIT MERAH')).toBe('JLN BT MERAH');
    expect(normaliseStreet('TOA PAYOH CENTRAL')).toBe('TOA PAYOH CTRL');
    expect(normaliseStreet('UPPER BOON KENG ROAD')).toBe('UPP BOON KENG RD');
  });

  it('replaces whole words only, and tidies case and spaces', () => {
    expect(normaliseStreet('  simei   street 1 ')).toBe('SIMEI ST 1');
    expect(normaliseStreet('ROADSIDE WAY')).toBe('ROADSIDE WAY'); // ROAD inside a word stays
  });
});

describe('leaseBandFor', () => {
  it('puts the remaining lease (99 years from the lease start) in its ten-year band', () => {
    expect(leaseBandFor(1988, 2026)).toBe('60-69'); // 61 years left
    expect(leaseBandFor(2020, 2026)).toBe('90-99'); // 93
    expect(leaseBandFor(1987, 2026)).toBe('60-69'); // 60: the band's lower edge
    expect(leaseBandFor(1986, 2026)).toBe('50-59'); // 59
  });

  it('gives null when the lease left is outside the bands the form offers', () => {
    expect(leaseBandFor(1970, 2026)).toBeNull(); // 43 years left
  });
});

describe('findResaleFlat', () => {
  // OneMap's first hit for 520123, as geocode returns it once it passes on BLK_NO and ROAD_NAME.
  const place = {
    lat: 1.3431, lng: 103.9533, address: '123 SIMEI STREET 1 SINGAPORE 520123', postal: '520123', block: '123', road: 'SIMEI STREET 1',
  };
  // The block's latest sales, newest first, as data.gov.sg returns them (strings).
  const records = [
    { month: '2026-07', town: 'TAMPINES', block: '123', street_name: 'SIMEI ST 1', flat_type: '4 ROOM', lease_commence_date: '1988', remaining_lease: '61 years 05 months' },
    { month: '2026-05', town: 'TAMPINES', block: '123', street_name: 'SIMEI ST 1', flat_type: '3 ROOM', lease_commence_date: '1988', remaining_lease: '61 years 07 months' },
    { month: '2025-11', town: 'TAMPINES', block: '123', street_name: 'SIMEI ST 1', flat_type: '4 ROOM', lease_commence_date: '1988', remaining_lease: '62 years 01 month' },
  ];
  const asOf = new Date('2026-11-02T00:00:00+08:00');

  it("finds the block's town, lease start and band from its sales, matching on block and street", async () => {
    let asked;
    const flat = await findResaleFlat('520123', {
      locate: async () => place,
      fetchRecords: async (params) => { asked = params; return records; },
      asOf,
    });
    expect(asked.datasetId).toBe(DATASETS.resaleTransactions);
    expect(asked.filters).toEqual({ block: '123', street_name: 'SIMEI ST 1' });
    expect(flat).toEqual({
      address: '123 SIMEI STREET 1 SINGAPORE 520123',
      postal: '520123',
      block: '123',
      street: 'SIMEI ST 1',
      town: 'TAMPINES',
      leaseCommenceYear: 1988,
      remainingLeaseYears: 61,
      leaseBand: '60-69',
      flatTypes: ['3 ROOM', '4 ROOM'],
      lastSaleMonth: '2026-07',
    });
  });

  it('says NOT_FOUND when OneMap has nothing for what was typed', async () => {
    const lookup = findResaleFlat('999999', { locate: async () => { throw new Error('No location found for "999999"'); }, fetchRecords: async () => records, asOf });
    await expect(lookup).rejects.toBeInstanceOf(FlatLookupError);
    await expect(lookup).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('says NOT_HDB for an address with no HDB resale sales (a condo, or a block never resold)', async () => {
    const lookup = findResaleFlat('238823', { locate: async () => ({ ...place, block: '1', road: 'ORCHARD BOULEVARD' }), fetchRecords: async () => [], asOf });
    await expect(lookup).rejects.toMatchObject({ code: 'NOT_HDB' });
  });

  it('says NOT_HDB for a place that is not a block (a road or a building with no block number)', async () => {
    const lookup = findResaleFlat('TAMPINES MALL', { locate: async () => ({ ...place, block: '', road: '' }), fetchRecords: async () => records, asOf });
    await expect(lookup).rejects.toMatchObject({ code: 'NOT_HDB' });
  });
});
