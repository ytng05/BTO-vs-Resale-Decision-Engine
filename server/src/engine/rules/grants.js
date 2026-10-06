// SEAT 2 owns this file (rules engine).

/**
 * Grant eligibility. Return the amounts AND one explanation per test, so the UI can render
 * each failed test with its own reason (not a generic message).
 *
 * @param {import('../types.js').Profile} profile
 * @param {import('../types.js').Choice} choice
 * @param {string} assessmentDate  ISO date the household is assessed on (projected for future purchases)
 * @param {object} ruleset
 * @returns {{
 *   ehg: number, familyGrant: number, phg: number, total: number,
 *   eligibility: Array<{ grant: string, passed: boolean, reason: string }>
 * }}
 *
 * Edge cases to cover:
 *  - EHG is tiered by income; income is a 12-month average, so it lags a raise
 *  - test the boundary exactly AT the income ceiling (check inclusive/exclusive in the HDB wording)
 *  - first-timer status is per person; first-timer + second-timer changes how income/grant are treated
 *  - citizenship mix: SC+SC, SC+PR, PR+PR
 *  - lease must cover the youngest buyer to 95, otherwise EHG is pro-rated. Buyers AND lease age
 *    forward in a "wait then buy resale" scenario, so project both to the purchase date
 *  - employment: 12 months continuous employment condition
 *  - Family Grant and PHG apply to resale only. PHG amount depends on living with vs near parents
 *  - each rule has an effective date; projections need a stated assumption (e.g. current rules held constant)
 */
function eligibility(grant, passed, reason) {
  return { grant, passed, reason };
}

function householdIncome(profile) {
  return profile.applicants.reduce((total, applicant) => total + applicant.monthlyIncome, 0);
}

function citizenshipCombination(applicants) {
  if (applicants.length !== 2) return null;

  const citizenships = applicants.map((applicant) => applicant.citizenship);
  if (citizenships[0] === citizenships[1]) return `${citizenships[0]}_${citizenships[1]}`;
  if (citizenships.includes('SC') && citizenships.includes('PR')) return 'SC_PR';
  return null;
}

function findIncomeTier(tiers, income, bandField) {
  for (const tier of tiers ?? []) {
    const band = tier[bandField];
    if (typeof band !== 'string') continue;

    const normalizedBand = band.replaceAll(',', '');
    if (normalizedBand.startsWith('<=')) {
      const upperBound = Number(normalizedBand.slice(2));
      if (income <= upperBound) return tier;
      continue;
    }

    if (normalizedBand.startsWith('>')) {
      const lowerBound = Number(normalizedBand.slice(1));
      if (income > lowerBound) return tier;
      continue;
    }

    const bounds = normalizedBand.split('-').map(Number);
    if (bounds.length === 2 && income >= bounds[0] && income <= bounds[1]) return tier;
  }

  return null;
}

function findFlatAmount(amounts, flatType) {
  const roomCount = Number(String(flatType).match(/\d+/)?.[0]);
  if (!Number.isFinite(roomCount)) return null;

  for (const [roomBand, amount] of Object.entries(amounts ?? {})) {
    const bandNumbers = roomBand.match(/\d+/g)?.map(Number) ?? [];
    const matches = roomBand.includes('+')
      ? bandNumbers.length === 1 && roomCount >= bandNumbers[0]
      : bandNumbers.length === 2 && roomCount >= bandNumbers[0] && roomCount <= bandNumbers[1];
    if (matches && typeof amount === 'number') return amount;
  }

  return null;
}

function evaluateFamilyGrant(profile, choice, ruleset) {
  const grantRules = ruleset.grants.familyGrant;
  const checks = [];

  // Family Grant applies to resale only, per the versioned ruleset.
  const applies = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('Family Grant path', applies, applies
    ? 'Family Grant applies to this purchase path.'
    : 'Family Grant applies to resale only.'));
  if (!applies) return { amount: 0, eligible: false, checks };

  // The checked notes cover first-timer household amount categories; other combinations remain unverified.
  const applicants = profile.applicants ?? [];
  const firstTimerHousehold = applicants.length > 0 && applicants.every((applicant) => applicant.firstTimer);
  const combination = firstTimerHousehold ? citizenshipCombination(applicants) : null;
  const citizenshipRule = combination
    ? ruleset.grants.eligibilityCombinations?.citizenship?.[combination]
    : null;
  const explicitlyIneligible = citizenshipRule?.familyGrantEligible === false;
  const amountSchedule = combination && !explicitlyIneligible ? grantRules.amounts?.[combination] : null;
  checks.push(eligibility('Family Grant household category', amountSchedule !== null && amountSchedule !== undefined,
    explicitlyIneligible
      ? citizenshipRule.familyGrantReason
      : amountSchedule !== null && amountSchedule !== undefined
        ? `A verified Family Grant amount schedule is available for ${combination}.`
        : 'Rule not yet verified in ruleset for this first-timer and citizenship combination.'));

  // Family Grant eligibility requires the ceiling in the ruleset; an unknown ceiling fails closed.
  const incomeCeiling = grantRules.incomeCeiling;
  const income = householdIncome(profile);
  const incomePassed = typeof incomeCeiling === 'number' && income <= incomeCeiling;
  checks.push(eligibility('Family Grant income ceiling', incomePassed,
    typeof incomeCeiling !== 'number'
      ? 'Rule not yet verified in ruleset.'
      : incomePassed
        ? `Household income is within the configured ceiling of ${incomeCeiling}.`
        : `Household income exceeds the configured ceiling of ${incomeCeiling}.`));

  // The verified Family Grant schedule differentiates resale flat size; use its configured band labels.
  const amount = findFlatAmount(amountSchedule, choice.flatType);
  checks.push(eligibility('Family Grant flat-size amount', amount !== null,
    amount !== null
      ? `A configured Family Grant amount applies to ${choice.flatType}.`
      : 'Rule not yet verified in ruleset for this flat size and household category.'));

  const eligible = checks.every((check) => check.passed);
  return { amount: eligible ? amount : 0, eligible, checks };
}

function evaluateEHG(profile, choice, assessmentDate, ruleset, familyGrant) {
  const grantRules = ruleset.grants.ehg;
  const combinationRules = ruleset.grants.eligibilityCombinations;
  const applicants = profile.applicants ?? [];
  const checks = [];

  // EHG applies to the paths listed in the versioned ruleset.
  const pathPassed = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('EHG path', pathPassed, pathPassed
    ? 'EHG applies to this purchase path.'
    : 'Rule not yet verified in ruleset for this purchase path.'));

  // Research notes state that EHG covers Singapore Citizen and Singapore PR first-timers.
  const citizenshipPassed = applicants.length > 0
    && applicants.every((applicant) => applicant.citizenship === 'SC' || applicant.citizenship === 'PR');
  checks.push(eligibility('EHG citizenship', citizenshipPassed, citizenshipPassed
    ? 'All applicants have a citizenship category covered by the EHG research notes.'
    : 'EHG citizenship eligibility is not established for this household.'));

  // First-timer status is per person; the checked FT+ST table applies when exactly one of two is a first-timer.
  const firstTimerCount = applicants.filter((applicant) => applicant.firstTimer).length;
  const firstTimerPassed = firstTimerCount > 0 && applicants.length <= 2;
  const firstTimerSecondTimer = applicants.length === 2 && firstTimerCount === 1;
  checks.push(eligibility('EHG first-timer status', firstTimerPassed, firstTimerPassed
    ? 'At least one applicant is a first-timer.'
    : 'EHG requires an eligible first-timer household.'));

  // The checked sources define monthlyIncome as the 12-month average used at assessmentDate.
  const income = householdIncome(profile);
  const assessedIncome = firstTimerSecondTimer ? income / applicants.length : income;
  const incomeCeiling = firstTimerSecondTimer
    ? combinationRules.firstTimerWithSecondTimer?.ehgIncomeCeiling
    : applicants.length === 1
      ? grantRules.incomeCeiling?.single
      : grantRules.incomeCeiling?.family;
  const ceilingPassed = typeof incomeCeiling === 'number' && assessedIncome <= incomeCeiling;
  checks.push(eligibility('EHG income ceiling', ceilingPassed,
    typeof incomeCeiling !== 'number'
      ? 'Rule not yet verified in ruleset.'
      : ceilingPassed
        ? `Assessed monthly income is within the configured ceiling of ${incomeCeiling}.`
        : `Assessed monthly income exceeds the configured ceiling of ${incomeCeiling}.`));

  // For mixed first-timer status, use the checked half-household-income table; other households use the family table.
  const tiers = firstTimerSecondTimer
    ? combinationRules.firstTimerWithSecondTimer?.ehgTiers
    : applicants.length === 2
      ? grantRules.tiers
      : null;
  const tier = findIncomeTier(tiers, assessedIncome, firstTimerSecondTimer
    ? 'halfHouseholdIncomeBand'
    : 'monthlyHouseholdIncomeBand');
  const tierAmount = tier?.grantAmount;
  const tierPassed = typeof tierAmount === 'number';
  checks.push(eligibility('EHG income tier', tierPassed,
    tierPassed
      ? `Assessed monthly income matches configured tier ${tier[firstTimerSecondTimer ? 'halfHouseholdIncomeBand' : 'monthlyHouseholdIncomeBand']}.`
      : tier
        ? 'Household income falls in a configured ineligible tier.'
        : 'Rule not yet verified in ruleset for this household income category.'));

  // Employment is assumed to meet the configured continuous-employment period, as directed for this model.
  const employmentMonths = grantRules.employmentMonthsRequired;
  const employmentPassed = typeof employmentMonths === 'number';
  checks.push(eligibility('EHG employment', employmentPassed, employmentPassed
    ? `Assumed to meet the ${employmentMonths}-month continuous employment condition.`
    : 'Rule not yet verified in ruleset.'));

  // Research state-machine notes require Family Grant qualification before resale EHG can apply.
  const resalePrerequisitePassed = choice.path !== 'RESALE' || familyGrant.eligible;
  checks.push(eligibility('EHG resale Family Grant prerequisite', resalePrerequisitePassed, resalePrerequisitePassed
    ? choice.path === 'RESALE'
      ? 'Family Grant eligibility passed before EHG assessment.'
      : 'Not applicable: this is not a resale purchase.'
    : 'EHG cannot apply because Family Grant eligibility did not pass.'));

  // EHG lease coverage is assessed to the configured age; profile age is treated as age at assessmentDate.
  const leaseTargetAge = grantRules.leaseMustCoverToAge;
  let leasePassed = false;
  let leaseShortfall = false;
  let leaseReason = 'Rule not yet verified in ruleset.';
  if (typeof leaseTargetAge === 'number' && applicants.length > 0) {
    if (typeof choice.remainingLeaseYears !== 'number') {
      leaseReason = `Remaining lease was not supplied for assessment date ${assessmentDate}.`;
    } else {
      const youngestAge = Math.min(...applicants.map((applicant) => applicant.age));
      const requiredLeaseYears = Math.max(0, leaseTargetAge - youngestAge);
      leasePassed = choice.remainingLeaseYears >= requiredLeaseYears;
      leaseShortfall = !leasePassed;
      leaseReason = leasePassed
        ? `At assessment date ${assessmentDate}, the supplied lease covers the youngest applicant to age ${leaseTargetAge}.`
        : 'Lease does not cover youngest buyer to age 95; HDB pro-rating not yet applied, actual EHG may be lower';
    }
  }
  checks.push(eligibility('EHG lease-to-age pro-rating', leasePassed, leaseReason));

  // TODO: Apply the verified HDB lease-to-95 pro-rating formula; until then retain the full tier amount.
  const eligible = checks.every((check) => check.passed
    || (leaseShortfall && check.grant === 'EHG lease-to-age pro-rating'));
  return { amount: eligible ? tierAmount : 0, checks };
}

function evaluatePHG(profile, choice, ruleset) {
  const grantRules = ruleset.grants.proximityHousingGrant;
  const checks = [];

  // PHG applies only to resale, as recorded in the versioned ruleset.
  const applies = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('PHG path', applies, applies
    ? 'PHG applies to this purchase path.'
    : 'PHG applies to resale only.'));
  if (!applies) return { amount: 0, checks };

  // The optional choice field records WITH, NEAR, or NONE; omitted arrangements default to NONE.
  const livingArrangement = choice.livingArrangement ?? 'NONE';
  if (livingArrangement === 'NONE') {
    checks.push(eligibility('PHG living arrangement', true, 'No PHG is claimed because no qualifying parents arrangement was selected.'));
    return { amount: 0, checks };
  }
  const arrangementPassed = livingArrangement === 'WITH' || livingArrangement === 'NEAR';
  checks.push(eligibility('PHG living arrangement', arrangementPassed, arrangementPassed
    ? `The selected parents arrangement is ${livingArrangement}.`
    : 'Rule not yet verified in ruleset for this parents arrangement.'));
  if (!arrangementPassed) return { amount: 0, checks };

  // PHG has separate configured amounts for living with versus near parents or a child, and for singles versus families.
  const applicantCount = profile.applicants?.length ?? 0;
  const householdType = applicantCount === 1 ? 'singles' : applicantCount > 1 ? 'families' : null;
  const arrangementKey = livingArrangement === 'WITH' ? 'livingWithParentsOrChild' : 'livingNear';
  const configuredAmount = householdType
    ? grantRules.amounts?.[arrangementKey]?.[householdType]
    : null;
  const amountPassed = typeof configuredAmount === 'number';
  checks.push(eligibility('PHG configured amount', amountPassed, amountPassed
    ? `A configured ${householdType} amount applies for living ${livingArrangement.toLowerCase()} parents or a child.`
    : 'Rule not yet verified in ruleset.'));

  // The selected NEAR arrangement relies on the distance threshold held in the ruleset; the input is an asserted arrangement.
  const distancePassed = livingArrangement !== 'NEAR' || typeof grantRules.nearDistanceKm === 'number';
  checks.push(eligibility('PHG near-distance condition', distancePassed, distancePassed
    ? livingArrangement === 'NEAR'
      ? `NEAR eligibility is based on the configured ${grantRules.nearDistanceKm} km threshold and the selected arrangement.`
      : 'Not applicable: living with parents or a child was selected.'
    : 'Rule not yet verified in ruleset.'));

  const eligible = checks.every((check) => check.passed);
  return { amount: eligible ? configuredAmount : 0, checks };
}

export function evaluateGrants(profile, choice, assessmentDate, ruleset) {
  const familyGrant = evaluateFamilyGrant(profile, choice, ruleset);
  const ehg = evaluateEHG(profile, choice, assessmentDate, ruleset, familyGrant);
  const phg = evaluatePHG(profile, choice, ruleset);
  const eligibilityChecks = [...familyGrant.checks, ...ehg.checks, ...phg.checks];

  return {
    ehg: ehg.amount,
    familyGrant: familyGrant.amount,
    phg: phg.amount,
    total: ehg.amount + familyGrant.amount + phg.amount,
    eligibility: eligibilityChecks,
  };
}
