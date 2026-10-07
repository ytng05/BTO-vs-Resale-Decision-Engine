// SEAT 3. External data, server-side only. Cache in Mongo. See services/datagov and services/onemap.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';
import { FLAT_TYPES, getResalePriceBasis } from '../services/datagov/resalePrice.js';


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


router.get('/rpi', notImplemented('seat 3', 'Resale Price Index series (data.gov.sg)'));
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