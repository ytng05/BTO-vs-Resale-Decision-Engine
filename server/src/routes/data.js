// SEAT 3. External data, server-side only. Cache in Mongo. See services/datagov and services/onemap.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

import mongoose from 'mongoose';
import { BtoProject } from '../models/BtoProject.js';

const CLASSIFICATIONS = ['STANDARD', 'PLUS', 'PRIME'];

const router = Router();
router.get('/resale-price', notImplemented('seat 3', 'Resale price basis (data.gov.sg)'));
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

    const projects = await BtoProject.find(filter).select('-__v').sort({ town: 1, name: 1 }).lean();
    res.json({ count: projects.length, projects });
  } catch (err) {
    next(err); 
  }
});

export default router;