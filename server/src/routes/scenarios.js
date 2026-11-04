// Saved scenarios. Every route needs a logged-in user, and a user only ever sees their own.
import { Router } from 'express';
import mongoose from 'mongoose';
import { Scenario } from '../models/Scenario.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';
import { SUMMARY_FIELDS, scenarioSummary } from '../services/scenarioSummary.js';

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

// The ruleset that produced a saved result, and the year it was calculated from, so "recalculate" on a reopened
// scenario uses the same ones. With no result saved: the current ruleset and this year.
function savedStamps(result) {
  const rulesetVersion = typeof result?.rulesetVersion === 'string' ? result.rulesetVersion : loadRuleset().version;
  const evaluationStartYear = Number.isInteger(result?.evaluationStartYear)
    ? result.evaluationStartYear
    : new Date().getFullYear();
  return { rulesetVersion, evaluationStartYear };
}

// GET /api/scenarios -> { scenarios: [{ id, name, rulesetVersion, createdAt, updatedAt, summary }] }, newest first.
// The list leaves out the inputs and result to stay small, apart from the few fields My scenarios filters on
// (summary, services/scenarioSummary.js); GET /:id returns everything.
router.get('/', requireDb, async (req, res, next) => {
  try {
    const docs = await Scenario.find({ userId: req.user.id })
      .select(['name', 'rulesetVersion', 'createdAt', 'updatedAt', ...SUMMARY_FIELDS].join(' '))
      .sort({ updatedAt: -1 })
      .lean();
    const scenarios = docs.map(({ _id, name, rulesetVersion, createdAt, updatedAt, ...saved }) => ({
      id: String(_id), name, rulesetVersion, createdAt, updatedAt, summary: scenarioSummary(saved),
    }));
    res.json({ scenarios });
  } catch (err) {
    next(err);
  }
});

// POST /api/scenarios  { name, profile, choiceA, choiceB, assumptions, result? } -> 201 { scenario }
router.post('/', validateScenario, requireDb, async (req, res, next) => {
  try {
    const doc = await Scenario.create({ ...req.scenario, ...savedStamps(req.scenario.result), userId: req.user.id });

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

// PUT /api/scenarios/:id  { name, profile, choiceA, choiceB, assumptions, result? } -> 200 { scenario }
// Saves over the user's own scenario (same id), e.g. after changing the inputs of one they reopened.
// Someone else's scenario gets 404, as for GET and DELETE.
router.put('/:id', validateScenario, requireDb, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const { result, ...inputs } = req.scenario;
    const update = { $set: { ...inputs, ...savedStamps(result) } };
    if (result === undefined) update.$unset = { result: 1 };
    else update.$set.result = result;
    const doc = await Scenario.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, update, {
      returnDocument: 'after',
      runValidators: true, // the schema's checks apply to updates too, as they do to create
    }).lean();
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
