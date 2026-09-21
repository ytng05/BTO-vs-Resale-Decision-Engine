// SEAT 3. External data, server-side only. Cache in Mongo. See services/datagov and services/onemap.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();
router.get('/resale-price', notImplemented('seat 3', 'Resale price basis (data.gov.sg)'));
router.get('/rpi', notImplemented('seat 3', 'Resale Price Index series (data.gov.sg)'));
router.get('/bto-projects', notImplemented('seat 3', 'Seeded BTO projects'));
router.get('/distance', notImplemented('seat 3', 'Distance to parents (OneMap)'));
export default router;
