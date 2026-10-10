import { Router } from 'express';
import { features } from '../config/features.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', features });
});

// The Sources page and UI badge both use the versioned active ruleset response.
router.get('/ruleset', (req, res) => {
  const { ruleset, version, status } = loadRuleset();
  res.json({
    version,
    status,
    effectiveDate: ruleset.effectiveDate,
    verifiedOn: ruleset.verifiedOn,
    verifiedBy: ruleset.verifiedBy,
    rules: ruleset,
  });
});

export default router;
