// Saved scenarios. Every route needs a logged-in user, and a user only ever sees their own.
import { Router } from 'express';
import mongoose from 'mongoose';
import { Scenario } from '../models/Scenario.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';

const router = Router();
router.use(requireAuth);

const NAME_MAX = 100;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Mongo document -> API shape: `id` instead of `_id`, and no internal fields.
const toJson = ({ _id, __v, userId, ...rest }) => ({ id: String(_id), ...rest });

function validationError(res, message) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

// Someone else's scenario also gets 404 (not 403), so ids cannot be probed for existence.
function notFound(res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario not found.' } });
}

// Runs before requireDb, so bad input gets a 400 even without a database.
function validateScenario(req, res, next) {
  const { name, profile, choiceA, choiceB, assumptions, result } = req.body ?? {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || trimmed.length > NAME_MAX) {
    return validationError(res, `name is required (at most ${NAME_MAX} characters).`);
  }
  for (const [field, value] of Object.entries({ profile, choiceA, choiceB, assumptions })) {
    if (!isPlainObject(value)) return validationError(res, `${field} must be an object.`);
  }
  if (result !== undefined && !isPlainObject(result)) return validationError(res, 'result must be an object if given.');
  req.scenario = { name: trimmed, profile, choiceA, choiceB, assumptions, result };
  return next();
}

// GET /api/scenarios -> { scenarios: [{ id, name, rulesetVersion, createdAt, updatedAt }] }, newest first.
// The list leaves out the inputs and result to stay small; GET /:id returns everything.
router.get('/', requireDb, async (req, res, next) => {
  try {
    const docs = await Scenario.find({ userId: req.user.id })
      .select('name rulesetVersion createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ scenarios: docs.map(toJson) });
  } catch (err) {
    next(err);
  }
});

// POST /api/scenarios  { name, profile, choiceA, choiceB, assumptions, result? } -> 201 { scenario }
router.post('/', validateScenario, requireDb, async (req, res, next) => {
  try {
    const { result } = req.scenario;
    // Record the ruleset that produced the result. With no result saved, it is the current ruleset.
    const rulesetVersion = typeof result?.rulesetVersion === 'string' ? result.rulesetVersion : loadRuleset().version;
    const doc = await Scenario.create({ ...req.scenario, rulesetVersion, userId: req.user.id });
    res.status(201).json({ scenario: toJson(doc.toObject()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/scenarios/:id -> { scenario } with all inputs and the saved result
router.get('/:id', requireDb, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Scenario.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!doc) return notFound(res);
    res.json({ scenario: toJson(doc) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/scenarios/:id -> 204
router.delete('/:id', requireDb, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Scenario.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!doc) return notFound(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

