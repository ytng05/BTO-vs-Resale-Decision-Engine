// Find a resale flat from a postal code or address (GET /api/data/resale-flat, docs/API_CONTRACT.md).
// OneMap turns what the user typed into a block and road; HDB's resale transactions (data.gov.sg) then give the
// block's town and lease start year, from its past sales. Used to fill the Resale flat step's town and
// remaining-lease band, which the user can still change. The lookup never prices the flat: the median is still
// GET /api/data/resale-price.
//
// SEAT 1 (Cadence) writes the three functions below (course rule: core logic is ours). Claude wrote the
// scaffolding around them: this file's contract, the route, the client, the mock, the UI and the tests.
// eslint-disable-next-line no-unused-vars -- DATASETS is for findResaleFlat's step 3 (seat 1)
import { DATASETS, fetchAllRecords } from './client.js';
import { geocode } from '../onemap/client.js';

export const LEASE_YEARS = 99;

// Remaining-lease bands the Resale flat step offers (client/src/constants/planOptions.js LEASE_BANDS, D16).
export const LEASE_BANDS = ['90-99', '80-89', '70-79', '60-69', '50-59'];

export class FlatLookupError extends Error {
  /** @param {string} message shown to the user @param {'NOT_FOUND'|'NOT_HDB'} code */
  constructor(message, code) {
    super(message);
    this.name = 'FlatLookupError';
    this.code = code;
  }
}

/**
 * OneMap's road name -> the street_name spelling in HDB's resale dataset, which abbreviates:
 * 'TAMPINES STREET 11' -> 'TAMPINES ST 11', 'ANG MO KIO AVENUE 10' -> 'ANG MO KIO AVE 10'.
 * @param {string} roadName as OneMap returns it (upper case)
 * @returns {string}
 */
export function normaliseStreet(roadName) {
  // TODO (Cadence):
  // 1. Upper-case and trim; collapse repeated spaces.
  // 2. Replace whole words only (\b...\b), using HDB's abbreviations, e.g. STREET->ST, AVENUE->AVE, ROAD->RD,
  //    DRIVE->DR, CRESCENT->CRES, CENTRAL->CTRL, NORTH->NTH, SOUTH->STH, CLOSE->CL, PLACE->PL, LORONG->LOR,
  //    BUKIT->BT, JALAN->JLN, UPPER->UPP, TERRACE->TER, HEIGHTS->HTS, GARDENS->GDNS, COMMONWEALTH->C'WEALTH,
  //    KAMPONG->KG, PARK->PK. Check each against the dataset (a q= search on data.gov.sg) before adding it.
  // 3. Return the result. Leave words not in the list as they are.
  throw new Error('normaliseStreet: not written yet (seat 1)');
}

/**
 * The remaining-lease band a block falls in this year.
 * @param {number} leaseCommenceYear e.g. 1988
 * @param {number} asOfYear e.g. 2026
 * @returns {string|null} '60-69' etc., or null if the remaining lease is outside the bands offered
 */
export function leaseBandFor(leaseCommenceYear, asOfYear) {
  // TODO (Cadence):
  // 1. remaining = LEASE_YEARS - (asOfYear - leaseCommenceYear)   (whole years; the band is only a guide)
  // 2. lower = Math.floor(remaining / 10) * 10;  band = `${lower}-${lower + 9}`
  // 3. Return the band if LEASE_BANDS includes it, else null (e.g. under 50 years left).
  throw new Error('leaseBandFor: not written yet (seat 1)');
}

/**
 * Postal code or address -> the HDB block and what we can fill in from it.
 * @param {string} query what the user typed
 * @param {{ locate?: Function, fetchRecords?: Function, asOf?: Date }} [deps] swapped in by the tests
 * @returns {Promise<{ address: string, postal: string|null, block: string, street: string, town: string,
 *   leaseCommenceYear: number, remainingLeaseYears: number, leaseBand: string|null, flatTypes: string[],
 *   lastSaleMonth: string }>}
 * @throws {FlatLookupError} NOT_FOUND when OneMap finds nothing; NOT_HDB when the block has no HDB resale records
 */
export async function findResaleFlat(query, { locate = geocode, fetchRecords = fetchAllRecords, asOf = new Date() } = {}) {
  // TODO (Cadence):
  // 1. place = await locate(query). OneMap's geocode returns { lat, lng, address, postal } today: add
  //    block: hit.BLK_NO and road: hit.ROAD_NAME to `place` in services/onemap/client.js (createOneMapClient's
  //    geocode). If OneMap throws "No location found", throw new FlatLookupError(<message>, 'NOT_FOUND').
  //    If place.block or place.road is empty (a road or building, not a block), throw NOT_HDB.
  // 2. street = normaliseStreet(place.road)
  // 3. records = await fetchRecords({ datasetId: DATASETS.resaleTransactions,
  //      filters: { block: place.block, street_name: street }, sort: 'month desc', maxRecords: 200 })
  //    Match on block AND street, not town: the same block number exists on several streets in a town.
  // 4. No records -> throw new FlatLookupError(<message>, 'NOT_HDB') (private condo, new block not yet resold, or a
  //    spelling normaliseStreet doesn't cover yet).
  // 5. From records[0] (the latest sale): town, lease_commence_date (a string: Number() it), month.
  //    flatTypes = the distinct flat_type values, sorted.
  // 6. remainingLeaseYears = LEASE_YEARS - (asOf.getFullYear() - leaseCommenceYear); leaseBand = leaseBandFor(...)
  // 7. Return the object in the @returns above (address and postal from OneMap; block, street, town from HDB).
  throw new Error('findResaleFlat: not written yet (seat 1)');
}
