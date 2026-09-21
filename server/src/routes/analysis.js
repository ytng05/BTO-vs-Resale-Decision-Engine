// Engine-backed routes. Handlers call the pure engine functions in ../engine and return the shapes
// in docs/API_CONTRACT.md. One request returns the WHOLE result (e.g. the whole heatmap grid),
// not one request per cell.
import { Router } from 'express';
import { features } from '../config/features.js';
import { notImplemented } from '../middleware/notImplemented.js';

const router = Router();

router.post('/compare', notImplemented('seat 1', 'Compare (break-even surface)'));

router.post(
  '/timing',
  features.timingOptimiser ? notImplemented('seat 1', 'Timing optimiser') : disabled('Timing optimiser'),
);
router.post(
  '/strategy',
  features.strategySearch ? notImplemented('seat 1', 'Strategy recommendation') : disabled('Strategy recommendation'),
);
// Later. Off by default (FEATURE_BACKTEST=false).
router.post(
  '/backtest',
  features.backtest ? notImplemented('seat 1 + seat 3', 'Backtest') : disabled('Backtest'),
);

function disabled(feature) {
  return (req, res) =>
    res.status(501).json({ error: { code: 'FEATURE_DISABLED', message: `${feature} is switched off` } });
}

export default router;
