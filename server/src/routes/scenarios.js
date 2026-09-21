// SEAT 3. Saved scenarios (CRUD). Protect with requireAuth once auth exists.
import { Router } from 'express';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();
router.get('/', notImplemented('seat 3', 'List scenarios'));
router.post('/', notImplemented('seat 3', 'Save scenario'));
router.get('/:id', notImplemented('seat 3', 'Load scenario'));
router.delete('/:id', notImplemented('seat 3', 'Delete scenario'));
export default router;
