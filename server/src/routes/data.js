// SEAT 3. External data, server-side only. Cached in MongoDB (services/cache.js; memory if no database).
//
//   GET /api/data/resale-price?town=TAMPINES&flatType=4 ROOM&months=12&leaseBand=80-89   (leaseBand optional)
//     -> median resale price (cents), spread, floor area and remaining lease from data.gov.sg
//   GET /api/data/rpi?from=2015-Q1&to=2026-Q2        -> HDB Resale Price Index + historical growth
//   GET /api/data/bto-projects?town=&flatType=&classification=   (filters optional)
//     -> seeded BTO projects (3-5 room, prices in cents before grants), plus the list of BTO towns
//   GET /api/data/bto-projects/:id                   -> one project
//   GET /api/data/geocode?postal=460123              -> { lat, lng, address } for the PHG map
//   GET /api/data/town-point?town=TAMPINES           -> an approximate point for a town, for the PHG map
//   GET /api/data/distance?from=460123&to=529510     -> straight-line km between two postal codes
//
// The OneMap routes feed a DISPLAY-ONLY map (D15). PHG eligibility is declared, never measured here.
// Errors follow docs/API_CONTRACT.md: { error: { code, message } }.
import { Router } from 'express';
import { SUPPORTED_FLAT_TYPES, TOWNS, getResalePriceBasis } from '../services/datagov/resalePrice.js';
import { QUARTER_RE, getRpiSeries } from '../services/datagov/rpi.js';
import { btoTowns, CLASSIFICATIONS, findBtoProjects, getBtoProject, latestLaunch } from '../services/btoProjects.js';
import { geocode, townPoint, locateAndMeasure } from '../services/onemap/client.js';
import { cached } from '../services/cache.js';

const POSTAL = /^\d{6}$/;
const ONEMAP_FRESH_MS = 30 * 24 * 60 * 60 * 1000; // addresses barely change: refresh monthly

const router = Router();

function badRequest(res, message) {
  return res.status(400).json({ error: { code: 'BAD_REQUEST', message } });
}

const upperParam = (value) => (value === undefined ? undefined : String(value).trim().toUpperCase() || undefined);

router.get('/resale-price', async (req, res, next) => {
  try {
    const town = String(req.query.town ?? '').trim().toUpperCase();
    const flatType = String(req.query.flatType ?? '').trim().toUpperCase();
    const months = req.query.months === undefined ? 12 : Number(req.query.months);

    if (!town) return badRequest(res, 'town is required, e.g. TAMPINES');
    if (!TOWNS.includes(town)) return badRequest(res, `town "${town}" is not an HDB town. Use one of ${TOWNS.join(', ')}`);
    if (!SUPPORTED_FLAT_TYPES.includes(flatType)) return badRequest(res, `flatType must be one of ${SUPPORTED_FLAT_TYPES.join(', ')}`);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      return badRequest(res, 'months must be a whole number from 1 to 60');
    }

    // Optional remaining-lease band, as /api/compare uses it (D16, D33): '80-89' keeps 80y 0m to 89y 11m.
    let lease = {};
    if (req.query.leaseBand !== undefined) {
      const band = /^(\d{2})-(\d{2})$/.exec(String(req.query.leaseBand).trim());
      if (!band || Number(band[1]) > Number(band[2])) return badRequest(res, 'leaseBand must look like 80-89');
      lease = { minLeaseYears: Number(band[1]), maxLeaseYears: Number(band[2]) };
    }
    const basis = await getResalePriceBasis({ town, flatType, months, ...lease });
    if (basis.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NO_DATA',
          message: `No ${flatType} resale transactions in ${town} in the last ${months} months. Check the town name or widen the window.`,
        },
      });
    }
    res.json(basis);
  } catch (err) {
    next(err);
  }
});

// GET /api/data/rpi?from=2015-Q1&to=2026-Q2   (both optional, inclusive)
router.get('/rpi', async (req, res, next) => {
  try {
    const from = req.query.from === undefined ? undefined : String(req.query.from).trim().toUpperCase();
    const to = req.query.to === undefined ? undefined : String(req.query.to).trim().toUpperCase();

    for (const [name, value] of [['from', from], ['to', to]]) {
      if (value !== undefined && !QUARTER_RE.test(value)) {
        return badRequest(res, `${name} "${value}" is not valid. Use YYYY-Qn, e.g. 2015-Q1`);
      }
    }
    if (from && to && from > to) return badRequest(res, `from (${from}) must not be after to (${to})`);

    res.json(await getRpiSeries({ from, to }));
  } catch (err) {
    next(err);
  }
});

router.get('/bto-projects', (req, res) => {
  const town = upperParam(req.query.town);
  const flatType = upperParam(req.query.flatType);
  const classification = upperParam(req.query.classification);
  if (town && !TOWNS.includes(town)) return badRequest(res, `town "${town}" is not an HDB town. Use one of ${TOWNS.join(', ')}`);
  if (flatType && !SUPPORTED_FLAT_TYPES.includes(flatType)) {
    return badRequest(res, `BTO flat type must be one of ${SUPPORTED_FLAT_TYPES.join(', ')}`);
  }
  if (classification && !CLASSIFICATIONS.includes(classification)) {
    return badRequest(res, `classification must be one of ${CLASSIFICATIONS.join(', ')}`);
  }
  const projects = findBtoProjects({ town, flatType, classification });
  return res.json({
    count: projects.length,
    projects,
    towns: btoTowns(),
    dataAsOf: latestLaunch(),
    source: 'HDB BTO launch tables (Annex A of each launch press release); see sourceUrl per project',
  });
});

router.get('/bto-projects/:id', (req, res) => {
  const project = getBtoProject(String(req.params.id));
  if (!project) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No BTO project with that id.' } });
  return res.json(project);
});

// OneMap failures -> plain messages. Never blocks the rest of the app: the map is display-only.
function oneMapError(res, err, notFoundMessage) {
  console.error('[data] OneMap:', err.message);
  if (/not configured/.test(err.message)) {
    return res.status(503).json({ error: { code: 'ONEMAP_NOT_CONFIGURED', message: 'The map is unavailable: OneMap is not set up on this server.' } });
  }
  if (/No location found/.test(err.message)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: notFoundMessage } });
  }
  return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'The map service is unavailable right now. Try again in a minute.' } });
}

router.get('/geocode', async (req, res) => {
  const postal = String(req.query.postal ?? '').trim();
  if (!POSTAL.test(postal)) return badRequest(res, 'Give a 6-digit postal code, e.g. ?postal=460123');
  try {
    const { payload, fetchedAt, cached: fromCache } = await cached(
      `onemap:postal:${postal}`, 'onemap', () => geocode(postal), { freshMs: ONEMAP_FRESH_MS },
    );
    return res.json({ ...payload, cached: fromCache, fetchedAt, source: 'OneMap (Singapore Land Authority)' });
  } catch (err) {
    return oneMapError(res, err, 'That postal code was not found.');
  }
});

router.get('/town-point', async (req, res) => {
  const town = String(req.query.town ?? '').trim().toUpperCase();
  if (!TOWNS.includes(town)) return badRequest(res, `town "${town}" is not an HDB town. Use one of ${TOWNS.join(', ')}`);
  try {
    const { payload, fetchedAt, cached: fromCache } = await cached(
      `onemap:town:${town}`, 'onemap', () => townPoint(town), { freshMs: ONEMAP_FRESH_MS },
    );
    return res.json({ town, ...payload, cached: fromCache, fetchedAt, source: 'OneMap (Singapore Land Authority)' });
  } catch (err) {
    return oneMapError(res, err, `No map point found for ${town}.`);
  }
});

router.get('/distance', async (req, res) => {
  const from = String(req.query.from ?? '').trim();
  const to = String(req.query.to ?? '').trim();
  if (!POSTAL.test(from) || !POSTAL.test(to)) return badRequest(res, 'Give two 6-digit postal codes, e.g. ?from=460123&to=529510');
  try {
    const { payload, fetchedAt, cached: fromCache } = await cached(
      `onemap:distance:${from}:${to}`, 'onemap', () => locateAndMeasure(from, to), { freshMs: ONEMAP_FRESH_MS },
    );
    return res.json({ ...payload, cached: fromCache, fetchedAt, source: 'OneMap (Singapore Land Authority)' });
  } catch (err) {
    return oneMapError(res, err, 'One of those postal codes was not found.');
  }
});

export default router;