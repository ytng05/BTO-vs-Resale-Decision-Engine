// SEAT 3. OneMap (free registration): geocoding for the DISPLAY-ONLY PHG map (D15).
// The map shows the parents' postal code and the chosen town with a 4 km circle. Nothing here decides
// PHG eligibility: that is declared by the user (livingArrangement) and checked by the rules engine.
// The token expires and must be refreshed server-side. Credentials in .env, never in git:
//   ONEMAP_EMAIL, ONEMAP_PASSWORD (the account you registered on onemap.gov.sg)
// Base URLs are read from .env with defaults so a change in OneMap's API docs is a config change.
// Distance is straight-line (great-circle) between the two points. Uses Node's built-in fetch (Node 20+).

const DEFAULT_BASE = 'https://www.onemap.gov.sg';
const TOKEN_PATH = '/api/auth/post/getToken';
const SEARCH_PATH = '/api/common/elastic/search';
const REFRESH_EARLY_MS = 60 * 60 * 1000; // renew an hour before expiry

export class OneMapError extends Error {
  constructor(message, { status = null } = {}) {
    super(message);
    this.name = 'OneMapError';
    this.status = status;
  }
}

const sleepFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Great-circle distance in km between two { lat, lng } points (haversine). Pure. */
export function haversineKm(a, b) {
  const R = 6371.0088; // mean Earth radius, km
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * A small OneMap client. One instance per server process is enough; it keeps the token in memory.
 * Options exist for testing: fetchImpl, sleep, env, now, retries.
 */
export function createOneMapClient({
  fetchImpl = (...args) => globalThis.fetch(...args), // looked up per call, so a stubbed fetch in tests is used
  sleep = sleepFor,
  env = process.env,
  now = () => Date.now(),
  retries = 3,
} = {}) {
  const base = (env.ONEMAP_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  let token = null; // { value, expiresAt }
  const geocodeCache = new Map();

  async function request(url, init, attempt = 0) {
    let response;
    try {
      response = await fetchImpl(url, init);
    } catch (err) {
      if (attempt < retries) { await sleep(1000 * 2 ** attempt); return request(url, init, attempt + 1); }
      throw new OneMapError(`OneMap request failed: ${err.message}`);
    }
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await sleep(1000 * 2 ** attempt);
      return request(url, init, attempt + 1);
    }
    return response;
  }

  // Lookups made at the same moment share one login instead of each logging in.
  let pendingLogin = null;
  async function getToken({ force = false } = {}) {
    if (!force && token && now() < token.expiresAt - REFRESH_EARLY_MS) return token.value;
    if (!pendingLogin) pendingLogin = login().finally(() => { pendingLogin = null; });
    return pendingLogin;
  }

  async function login() {
    if (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD) {
      throw new OneMapError('OneMap is not configured: set ONEMAP_EMAIL and ONEMAP_PASSWORD in .env');
    }
    const response = await request(`${base}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: env.ONEMAP_EMAIL, password: env.ONEMAP_PASSWORD }),
    });
    if (!response.ok) throw new OneMapError(`OneMap login failed (HTTP ${response.status})`, { status: response.status });
    const body = await response.json();
    if (!body?.access_token) throw new OneMapError('OneMap login returned no token');
    // expiry_timestamp is in seconds; if missing, assume OneMap's usual 3 days.
    const expires = Number(body.expiry_timestamp) * 1000;
    token = { value: body.access_token, expiresAt: Number.isFinite(expires) && expires > 0 ? expires : now() + 3 * 24 * 3600 * 1000 };
    return token.value;
  }

  /**
   * Postal code (or address text) -> { lat, lng, address, postal, block, road }.
   * Throws OneMapError if nothing is found.
   */
  async function geocode(query) {
    const q = String(query ?? '').trim();
    if (!q) throw new OneMapError('Enter a postal code or address');
    if (geocodeCache.has(q)) return geocodeCache.get(q);

    const url = new URL(`${base}${SEARCH_PATH}`);
    url.searchParams.set('searchVal', q);
    url.searchParams.set('returnGeom', 'Y');
    url.searchParams.set('getAddrDetails', 'Y');
    url.searchParams.set('pageNum', '1');

    const send = async (forceToken) => request(url, {
      headers: { accept: 'application/json', authorization: await getToken({ force: forceToken }) },
    });
    let response = await send(false);
    if (response.status === 401) response = await send(true); // token rejected: log in again once
    if (!response.ok) throw new OneMapError(`OneMap search failed (HTTP ${response.status})`, { status: response.status });

    const body = await response.json();
    const hit = body?.results?.[0];
    const lat = Number(hit?.LATITUDE);
    const lng = Number(hit?.LONGITUDE);
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) throw new OneMapError(`No location found for "${q}"`);

    // block and road feed the resale-flat lookup; OneMap sends 'NIL' when a hit is a building or road, not a block.
    const part = (v) => (v && v !== 'NIL' ? String(v) : '');
    const place = { lat, lng, address: hit.ADDRESS ?? q, postal: hit.POSTAL ?? null, block: part(hit.BLK_NO), road: part(hit.ROAD_NAME) };
    geocodeCache.set(q, place);
    return place;
  }

  /** Both places and the straight-line distance between them, for the PHG check and its map. */
  async function locateAndMeasure(fromAddress, toAddress) {
    const [from, to] = await Promise.all([geocode(fromAddress), geocode(toAddress)]);
    return { from, to, km: Math.round(haversineKm(from, to) * 100) / 100 };
  }

  /**
   * An approximate point for a town (users pick a town, not an address): OneMap's first search hit for the
   * town name. Good enough to centre a map on; never used for any calculation.
   */
  async function townPoint(town) {
    const place = await geocode(String(town ?? '').trim());
    return { lat: place.lat, lng: place.lng, label: place.address, approximate: true };
  }

  return { getToken, geocode, townPoint, locateAndMeasure };
}

let defaultClient;
const client = () => (defaultClient ??= createOneMapClient());

/** Straight-line distance in km between two postal codes or addresses. */
export async function distanceKm(fromAddress, toAddress) {
  return (await client().locateAndMeasure(fromAddress, toAddress)).km;
}

/** Same as distanceKm, plus both points' coordinates and addresses (for the dashboard map). */
export async function locateAndMeasure(fromAddress, toAddress) {
  return client().locateAndMeasure(fromAddress, toAddress);
}

/** Postal code or address -> { lat, lng, address, postal, block, road } (block and road '' when not a block). */
export async function geocode(query) {
  return client().geocode(query);
}

/** Town name -> an approximate { lat, lng, label } to centre the PHG map on. */
export async function townPoint(town) {
  return client().townPoint(town);
}