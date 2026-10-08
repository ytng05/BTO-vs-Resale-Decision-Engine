import { Router } from 'express';
import { evaluateGrants } from '../engine/rules/grants.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';

const router = Router();

router.post('/grants', (req, res) => {
  const validationMessage = validateGrantRequest(req.body);
  if (validationMessage) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationMessage } });
  }

  const { profile, choice } = req.body;
  const assessmentDate = req.body.assessmentDate ?? new Date().toISOString().slice(0, 10);
  const { ruleset, version, status } = loadRuleset();
  const result = evaluateGrants(profile, choice, assessmentDate, ruleset);

  return res.json({ ...result, rulesetVersion: version, rulesetStatus: status, assessmentDate });
});

function validateGrantRequest(body) {
  const applicants = body?.profile?.applicants;
  if (!Array.isArray(applicants) || applicants.length === 0) {
    return 'profile.applicants must contain one or two applicants.';
  }
  if (applicants.length > 2) {
    return 'profile.applicants must contain no more than two applicants.';
  }

  const requiredApplicantFields = ['age', 'citizenship', 'firstTimer', 'monthlyIncome'];
  for (const [index, applicant] of applicants.entries()) {
    const missingField = requiredApplicantFields.find((field) => applicant?.[field] === undefined || applicant[field] === null);
    if (missingField) {
      return `profile.applicants[${index}].${missingField} is required.`;
    }
  }

  if (!['BTO', 'RESALE'].includes(body?.choice?.path)) {
    return "choice.path must be either 'BTO' or 'RESALE'.";
  }

  return null;
}

export default router;