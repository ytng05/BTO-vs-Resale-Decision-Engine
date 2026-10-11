// SEAT 3. External data, server-side only. Cache in Mongo. See services/datagov and services/onemap.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';
import { FLAT_TYPES, TOWNS, getResalePriceBasis } from '../services/datagov/resalePrice.js';
import { QUARTER_RE, getRpiSeries } from '../services/datagov/rpi.js';



import mongoose from 'mongoose';
import { BtoProject } from '../models/BtoProject.js';

const CLASSIFICATIONS = ['STANDARD', 'PLUS', 'PRIME'];

const router = Router();

router.get('/resale-price', async (req, res, next) => {
  try {
    const town = String(req.query.town ?? '').trim().toUpperCase();
    const flatType = String(req.query.flatType ?? '').trim().toUpperCase();
    const months = req.query.months === undefined ? 12 : Number(req.query.months);

    if (!town) return badRequest(res, 'town is required, e.g. TAMPINES');
    if (!TOWNS.includes(town)) return badRequest(res, `town "${town}" is not an HDB town. Use one of ${TOWNS.join(', ')}`);
    // ^ catches typos for town names
    if (!FLAT_TYPES.includes(flatType)) return badRequest(res, `flatType must be one of ${FLAT_TYPES.join(', ')}`);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      return badRequest(res, 'months must be a whole number from 1 to 60');
    }

    const basis = await getResalePriceBasis({ town, flatType, months });
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

function badRequest(res, message) {
  return res.status(400).json({ error: { code: 'BAD_REQUEST', message } });
}


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

router.get('/distance', notImplemented('seat 3', 'Distance to parents (OneMap)'));
router.get('/bto-projects', async (req, res, next) => {
  try {
    const { town, classification, flatType } = req.query;
    const filter = {};

    if (town) filter.town = String(town).trim().toUpperCase(); // String() to stop query-operator injection like ?town[]
    if (flatType) filter['flats.flatType'] = String(flatType).trim().toUpperCase();
    if (classification) {
      const c = String(classification).trim().toUpperCase();
      if (!CLASSIFICATIONS.includes(c)) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: `classification must be one of ${CLASSIFICATIONS.join(', ')}` },
        });
      }
      filter.classification = c;
    }

   
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: { code: 'DB_UNAVAILABLE', message: 'The database is not connected. Set MONGODB_URI and restart the server.' },
      });
    }

    const docs = await BtoProject.find(filter).select('-__v').sort({ town: 1, name: 1 }); // -__v to leave out the __v from mongoose. sorts town, name in alphabetical order 
    const projects = docs.map((doc) => doc.toObject());
    res.json({ count: projects.length, projects });
  } catch (err) {
    next(err); 
  }
});

export default router;