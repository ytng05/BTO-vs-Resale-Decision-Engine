// Engine-backed routes. Handlers call the pure engine functions in ../engine and return the shapes
// in docs/API_CONTRACT.md. One request returns the WHOLE result (e.g. the whole heatmap grid),
// not one request per cell.
import { Router } from 'express';
import { features } from '../config/features.js';
import { notImplemented } from '../middleware/notImplemented.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';
import { computeAccruedInterest } from '../engine/cpf/accruedInterest.js';
import { computeBuyerStampDuty } from '../engine/costs/transactionCosts.js';

const router = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isCents = (n) => Number.isSafeInteger(n) && n >= 0;
const badRequest = (res, message) =>
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });

// Seat 1. CPF accrued interest owed back to the OA at a given date (D2, D12). Money in integer cents.
// Body: { withdrawals: [{ date: 'YYYY-MM-DD', amountCents, kind? }], asOfDate: 'YYYY-MM-DD' }
router.post('/cpf/accrued-interest', (req, res) => {
  const { withdrawals, asOfDate } = req.body ?? {};
  if (!Array.isArray(withdrawals)) return badRequest(res, 'withdrawals must be an array.');
  if (typeof asOfDate !== 'string' || !ISO_DATE.test(asOfDate)) {
    return badRequest(res, "asOfDate must be a date in 'YYYY-MM-DD' format.");
  }
  for (const [i, w] of withdrawals.entries()) {
    if (typeof w?.date !== 'string' || !ISO_DATE.test(w.date)) {
      return badRequest(res, `withdrawals[${i}].date must be a date in 'YYYY-MM-DD' format.`);
    }
    if (!isCents(w.amountCents)) {
      return badRequest(res, `withdrawals[${i}].amountCents must be a non-negative integer number of cents.`);
    }
  }

  const { ruleset, version, status } = loadRuleset();
  const cpf = ruleset.cpf ?? {};
  if (typeof cpf.oaInterestRate !== 'number' || cpf.accruedInterestCompounding !== 'ANNUAL') {
    return res.status(503).json({
      error: {
        code: 'RULESET_UNAVAILABLE',
        message: `Ruleset ${version} has no verified CPF OA rate and ANNUAL compounding yet.`,
      },
    });
  }

  const ledger = withdrawals.map(({ date, amountCents, kind = 'WITHDRAWAL' }) => ({ date, amountCents, kind }));
  let result;
  try {
    result = computeAccruedInterest(ledger, asOfDate, ruleset);
  } catch (err) {
    // The engine rejects inputs it can't model (e.g. a withdrawal dated after asOfDate).
    return badRequest(res, err.message);
  }

  return res.json({
    ...result,
    asOfDate,
    oaRate: cpf.oaInterestRate,
    accruedInterestCompounding: cpf.accruedInterestCompounding,
    rulesetVersion: version,
    rulesetStatus: status,
  });
});

// Seat 1. Buyer's stamp duty on a purchase price (D20: marginal bands, floored to the dollar, $1 minimum).
// Body: { priceCents }
router.post('/stamp-duty', (req, res) => {
  const { priceCents } = req.body ?? {};
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
    return badRequest(res, 'priceCents must be a positive integer number of cents.');
  }

  const { ruleset, version, status } = loadRuleset();
  if (!Array.isArray(ruleset.transactionCosts?.buyerStampDutyTiers)) {
    return res.status(503).json({
      error: { code: 'RULESET_UNAVAILABLE', message: `Ruleset ${version} has no buyer's stamp duty tiers.` },
    });
  }

  return res.json({
    bsdCents: computeBuyerStampDuty(priceCents, ruleset),
    dutiableValueCents: priceCents,
    rulesetVersion: version,
    rulesetStatus: status,
  });
});

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
