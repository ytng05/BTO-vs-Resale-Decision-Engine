// Find a resale flat from a postal code or address (GET /api/data/resale-flat, docs/API_CONTRACT.md).
// OneMap turns what the user typed into a block and road; HDB's resale transactions (data.gov.sg) then give the
// block's town and lease start year, from its past sales. Used to fill the Resale flat step's town and
// remaining-lease band, which the user can still change. The lookup never prices the flat: the median is still
// GET /api/data/resale-price.
//
// Seat 1 (Cadence) wrote the three functions below and STREET_ABBREVIATIONS. Claude wrote the scaffolding around
// them: this file's contract, the route, the client, the mock, the UI and the tests. See docs/AI_USAGE_LOG.md.
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

// OneMap's full words -> HDB's abbreviations. Each checked against every street_name in the resale dataset
// (2 Nov 2026, 580 streets): the full word never appears there and the abbreviation does.
export const STREET_ABBREVIATIONS = {
  STREET: 'ST', AVENUE: 'AVE', ROAD: 'RD', DRIVE: 'DR', CRESCENT: 'CRES', CENTRAL: 'CTRL', NORTH: 'NTH', SOUTH: 'STH',
  CLOSE: 'CL', PLACE: 'PL', LORONG: 'LOR', BUKIT: 'BT', JALAN: 'JLN', UPPER: 'UPP', TERRACE: 'TER', HEIGHTS: 'HTS',
  GARDENS: 'GDNS', COMMONWEALTH: "C'WEALTH", KAMPONG: 'KG', PARK: 'PK', MARKET: 'MKT', TANJONG: 'TG',
};
// Whole words only: ROADSIDE keeps its ROAD.
const STREET_WORD = new RegExp(`\\b(?:${Object.keys(STREET_ABBREVIATIONS).join('|')})\\b`, 'g');

/**
 * OneMap's road name -> the street_name spelling in HDB's resale dataset, which abbreviates:
 * 'TAMPINES STREET 11' -> 'TAMPINES ST 11', 'ANG MO KIO AVENUE 10' -> 'ANG MO KIO AVE 10'.
 * @param {string} roadName as OneMap returns it (upper case)
 * @returns {string}
 */
export function normaliseStreet(roadName) {
  const road = String(roadName ?? '').toUpperCase().trim().replace(/\s+/g, ' ');
  return road.replace(STREET_WORD, (word) => STREET_ABBREVIATIONS[word]);
}

/**
 * The remaining-lease band a block falls in this year.
 * @param {number} leaseCommenceYear e.g. 1988
 * @param {number} asOfYear e.g. 2026
 * @returns {string|null} '60-69' etc., or null if the remaining lease is outside the bands offered
 */
export function leaseBandFor(leaseCommenceYear, asOfYear) {
  const remaining = LEASE_YEARS - (asOfYear - leaseCommenceYear);
  const lower = Math.floor(remaining / 10) * 10;
  const band = `${lower}-${lower + 9}`;
  return LEASE_BANDS.includes(band) ? band : null;
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
  let place;
  try {
    place = await locate(query);
  } catch (e) {
    if (/no location found/i.test(e?.message ?? '')) {
      throw new FlatLookupError('We could not find that postal code or address. Check it, or pick the town and lease below.', 'NOT_FOUND');
    }
    throw e; // OneMap down or login failed: the route reports it as an upstream error
  }
  if (!place?.block || !place?.road) throw notHdb();

  const street = normaliseStreet(place.road);
  const records = await fetchRecords({
    datasetId: DATASETS.resaleTransactions,
    filters: { block: place.block, street_name: street },
    sort: 'month desc',
    maxRecords: 200,
  });
  if (!records?.length) throw notHdb();

  const latest = records[0];
  const leaseCommenceYear = Number(latest.lease_commence_date);
  const remainingLeaseYears = LEASE_YEARS - (asOf.getFullYear() - leaseCommenceYear);
  return {
    address: place.address,
    postal: place.postal ?? null,
    block: place.block,
    street,
    town: latest.town,
    leaseCommenceYear,
    remainingLeaseYears,
    leaseBand: leaseBandFor(leaseCommenceYear, asOf.getFullYear()),
    flatTypes: [...new Set(records.map((r) => r.flat_type))].sort(),
    lastSaleMonth: latest.month,
  };
}

// A condo, a building with no block number, a block never resold, or a street spelling not covered yet.
const notHdb = () => new FlatLookupError("That address isn't an HDB block with resale sales. Pick the town and lease by hand.", 'NOT_HDB');
