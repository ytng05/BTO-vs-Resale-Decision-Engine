import { Router } from 'express';
import { features } from '../config/features.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', features });
});

// Ruleset metadata for the UI badge ("Ruleset vX, dated ..."). Full rules are not exposed here.
router.get('/ruleset', (req, res) => {
  const { ruleset, version, status } = loadRuleset();
  res.json({ version, status, effectiveDate: ruleset.effectiveDate, verifiedOn: ruleset.verifiedOn });
});

export default router;
