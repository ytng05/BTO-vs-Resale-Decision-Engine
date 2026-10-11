import { Router } from 'express';
import { evaluateGrants } from '../engine/rules/grants.js';
import { loadRuleset } from '../engine/rules/loadRuleset.js';

const router = Router();
const grantIds = { EHG: 'EHG', 'Family Grant': 'FAMILY', PHG: 'PHG' };
const grantGroups = ['EHG', 'Family Grant', 'PHG'];
const grantKeys = { EHG: 'ehg', 'Family Grant': 'familyGrant', PHG: 'phg' };

function centsToDollars(cents) {
  return cents / 100;
}

function dollarsToCents(dollars) {
  return Math.round(dollars * 100);
}

router.post('/grants', (req, res) => {
  const validationMessage = validateGrantRequest(req.body);
  if (validationMessage) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationMessage } });
  }

  const { profile, choice: requestedChoice } = req.body;
  // BTO flats always have a 99-year lease (D16).
  const choice = requestedChoice.path === 'BTO' && (requestedChoice.remainingLeaseYears ?? null) === null
    ? { ...requestedChoice, remainingLeaseYears: 99 }
    : requestedChoice;
  const grantsProfile = {
    applicants: profile.applicants.map(({ monthlyIncomeCents, cpfOaBalanceCents, ...applicant }) => ({
      ...applicant,
      monthlyIncome: centsToDollars(monthlyIncomeCents),
      cpfOaBalance: centsToDollars(cpfOaBalanceCents),
    })),
  };
  const assessmentDate = req.body.assessmentDate ?? `${choice.purchaseYear}-01-01`;
  const { ruleset, version, status } = loadRuleset();
  const result = evaluateGrants(grantsProfile, choice, assessmentDate, ruleset);
  const grants = grantGroups.map((grantGroup) => ({
    id: grantIds[grantGroup],
    amountCents: dollarsToCents(result[grantKeys[grantGroup]]),
    tests: result.eligibility
      .filter((test) => test.grantGroup === grantGroup)
      .map(({ id, passed, reason, sourceUrl }) => ({ id, passed, reason, sourceUrl })),
  }));

  return res.json({
    totalGrantsCents: dollarsToCents(result.total),
    grants,
    rulesetVersion: version,
    rulesetStatus: status,
    assessmentDate,
  });
});

function validateGrantRequest(body) {
  const applicants = body?.profile?.applicants;
  if (!Array.isArray(applicants) || applicants.length === 0) {
    return 'profile.applicants must contain one or two applicants.';
  }
  if (applicants.length === 1) {
    return "Single-buyer purchases aren't modelled yet.";
  }
  if (applicants.length > 2) {
    return 'profile.applicants must contain no more than two applicants.';
  }

  const requiredApplicantFields = ['age', 'citizenship', 'firstTimer', 'monthlyIncomeCents', 'cpfOaBalanceCents'];
  for (const [index, applicant] of applicants.entries()) {
    const missingField = requiredApplicantFields.find((field) => applicant?.[field] === undefined || applicant[field] === null);
    if (missingField) {
      return `profile.applicants[${index}].${missingField} is required.`;
    }
    if (typeof applicant.firstTimer !== 'boolean') {
      return `profile.applicants[${index}].firstTimer must be a boolean.`;
    }
    for (const field of ['monthlyIncomeCents', 'cpfOaBalanceCents']) {
      if (!Number.isSafeInteger(applicant[field]) || applicant[field] < 0) {
        return `profile.applicants[${index}].${field} must be a non-negative integer number of cents.`;
      }
    }
  }

  if (!['BTO', 'RESALE'].includes(body?.choice?.path)) {
    return "choice.path must be either 'BTO' or 'RESALE'.";
  }
  if (!Number.isInteger(body.choice.purchaseYear)) {
    return 'choice.purchaseYear must be a four-digit calendar year.';
  }

  return null;
}

export default router;