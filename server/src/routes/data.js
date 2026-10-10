// SEAT 3. External data, server-side only. Cache in Mongo. See services/datagov and services/onemap.
// Express (MIT).
//
//   GET /api/data/resale-price?town=TAMPINES&flatType=4 ROOM
//     -> median price, floor area and remaining lease over the latest 12 months of resale sales
//   GET /api/data/distance?from=460123&to=529510
//     -> straight-line km between two postal codes, plus both points for the map
//   GET /api/data/bto-projects?town=TAMPINES&flatType=4 ROOM&classification=STANDARD   (all filters optional)
//     -> seeded BTO projects: waiting months, floor areas, launch price ranges (cents), source link
//   GET /api/data/bto-projects/:id
//     -> one project
//
// Errors follow docs/API_CONTRACT.md: { error: { code, message } }.
// No policy figures here: whether a distance passes the PHG test is the rules engine's job.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';
import { loadResale, resaleCacheKey, RESALE_SOURCE } from '../services/datagov/resalePrices.js';
import { locateAndMeasure } from '../services/onemap/client.js';
import { cached, ONE_DAY_MS } from '../services/cache.js';
import { btoTowns, CLASSIFICATIONS, findBtoProjects, getBtoProject, latestLaunch } from '../services/btoProjects.js';

const TOWN = /^[A-Z][A-Z /'-]{1,40}$/;
const FLAT_TYPE = /^(1 ROOM|2 ROOM|3 ROOM|4 ROOM|5 ROOM|EXECUTIVE|MULTI-GENERATION)$/;
const POSTAL = /^\d{6}$/;

const badRequest = (res, message) => res.status(400).json({ error: { code: 'BAD_REQUEST', message } });
const upstream = (res, message) => res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message } });

/** Default loaders talk to the real APIs; tests pass fakes. */
const defaultDeps = {
  loadResale,
  measure: (from, to) => locateAndMeasure(from, to),
  cached,
};

export function createDataRouter(overrides = {}) {
  const deps = { ...defaultDeps, ...overrides };
  const router = Router();

  router.get('/resale-price', async (req, res) => {
    const town = String(req.query.town ?? '').trim().toUpperCase();
    const flatType = String(req.query.flatType ?? '').trim().toUpperCase();
    if (!TOWN.test(town)) return badRequest(res, 'Give a town, e.g. ?town=TAMPINES');
    if (!FLAT_TYPE.test(flatType)) return badRequest(res, 'Give a flat type, e.g. ?flatType=4 ROOM');

    try {
      const { data, fetchedAt, fromCache, stale } = await deps.cached(
        resaleCacheKey(town, flatType), ONE_DAY_MS, () => deps.loadResale(town, flatType),
      );
      if (!data) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: `No recent resale sales for ${flatType} in ${town}` } });
      }
      return res.json({ ...data, dataAsOf: fetchedAt, fromCache, stale, source: RESALE_SOURCE });
    } catch (err) {
      console.error('[data] resale-price failed:', err.message);
      return upstream(res, 'Resale prices are unavailable right now. Try again in a minute.');
    }
  });

  router.get('/distance', async (req, res) => {
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    if (!POSTAL.test(from) || !POSTAL.test(to)) return badRequest(res, 'Give two 6-digit postal codes, e.g. ?from=460123&to=529510');

    try {
      const { data, fetchedAt, fromCache } = await deps.cached(
        `distance:${from}:${to}`, 30 * ONE_DAY_MS, () => deps.measure(from, to),
      );
      return res.json({ ...data, dataAsOf: fetchedAt, fromCache, source: 'OneMap (Singapore Land Authority)' });
    } catch (err) {
      console.error('[data] distance failed:', err.message);
      if (/No location found/.test(err.message)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'One of those postal codes was not found.' } });
      }
      return upstream(res, 'Distance lookup is unavailable right now. Try again in a minute.');
    }
  });

  router.get('/rpi', notImplemented('seat 3', 'Resale Price Index series (data.gov.sg)'));

  router.get('/bto-projects', (req, res) => {
    const town = String(req.query.town ?? '').trim().toUpperCase() || undefined;
    const flatType = String(req.query.flatType ?? '').trim().toUpperCase() || undefined;
    const classification = String(req.query.classification ?? '').trim().toUpperCase() || undefined;
    if (town && !TOWN.test(town)) return badRequest(res, 'Give a town, e.g. ?town=TAMPINES');
    if (flatType && !FLAT_TYPE.test(flatType)) return badRequest(res, 'Give a flat type, e.g. ?flatType=4 ROOM');
    if (classification && !CLASSIFICATIONS.includes(classification)) {
      return badRequest(res, `Classification must be one of ${CLASSIFICATIONS.join(', ')}`);
    }
    const projects = findBtoProjects({ town, flatType, classification });
    return res.json({ projects, count: projects.length, towns: btoTowns(), dataAsOf: latestLaunch(), source: 'HDB BTO sales launches (see sourceUrl per project)' });
  });

  router.get('/bto-projects/:id', (req, res) => {
    const project = getBtoProject(req.params.id);
    if (!project) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No BTO project with that id.' } });
    return res.json(project);
  });

  return router;
}

export default createDataRouter();