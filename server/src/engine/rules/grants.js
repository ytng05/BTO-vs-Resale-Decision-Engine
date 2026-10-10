// SEAT 2 owns this file (rules engine).

/**
 * Grant eligibility. Return the amounts AND one explanation per test, so the UI can render
 * each failed test with its own reason (not a generic message).
 *
 * @param {import('../types.js').GrantsProfile} profile
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
function eligibility(grantGroup, grant, id, passed, reason) {
  return { grantGroup, grant, id, passed, reason: reason.charAt(0).toUpperCase() + reason.slice(1) };
}

function householdIncome(profile) {
  return profile.applicants.reduce((total, applicant) => total + applicant.monthlyIncome, 0);
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate) {
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate);
}

function formatFlatType(flatType) {
  return String(flatType).replace(/^(\d+)\s+ROOM$/i, (_, rooms) => `${rooms}-room`);
}

function formatIncomeBand(band) {
  if (typeof band !== 'string') return 'an unlisted income band';
  const normalizedBand = band.replaceAll(',', '');
  const upperOnly = normalizedBand.match(/^<=(\d+)$/);
  if (upperOnly) return `up to ${formatMoney(Number(upperOnly[1]))}`;
  const lowerOnly = normalizedBand.match(/^>(\d+)$/);
  if (lowerOnly) return `above ${formatMoney(Number(lowerOnly[1]))}`;
  const range = normalizedBand.match(/^(\d+)-(\d+)$/);
  if (range) return `${formatMoney(Number(range[1]))} to ${formatMoney(Number(range[2]))}`;
  return band;
}

function citizenshipCombination(applicants) {
  if (applicants.length !== 2) return null;

  const citizenships = applicants.map((applicant) => applicant.citizenship);
  if (citizenships[0] === citizenships[1]) return `${citizenships[0]}_${citizenships[1]}`;
  if (citizenships.includes('SC') && citizenships.includes('PR')) return 'SC_PR';
  return null;
}

function describeCitizenship(applicants) {
  if (applicants.length === 1) {
    return applicants[0].citizenship === 'SC'
      ? 'You are a Singapore Citizen.'
      : 'You are a Permanent Resident.';
  }

  const citizenships = applicants.map((applicant) => applicant.citizenship);
  if (citizenships.every((citizenship) => citizenship === 'SC')) return 'Both of you are Singapore Citizens.';
  if (citizenships.includes('SC') && citizenships.includes('PR')) return 'One of you is a Singapore Citizen and one is a Permanent Resident.';
  if (citizenships.every((citizenship) => citizenship === 'PR')) return 'Both of you are Permanent Residents.';
  return 'Your citizenship details do not match an eligible combination.';
}

function familyGrantHouseholdLabel(applicants) {
  const citizenships = applicants.map((applicant) => applicant.citizenship);
  if (citizenships.length === 2 && citizenships.every((citizenship) => citizenship === 'SC')) return 'two Singapore Citizens';
  if (citizenships.length === 2 && citizenships.includes('SC') && citizenships.includes('PR')) {
    return 'one Singapore Citizen and one Permanent Resident';
  }
  return 'your household type';
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

    // Bands are continuous: tiers are ascending, so the first upper bound >= income wins and cents are never rounded.
    const bounds = normalizedBand.split('-').map(Number);
    if (bounds.length === 2 && income <= bounds[1]) return tier;
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

  // Family Grant purchase-path eligibility comes from the active ruleset.
  const applies = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('Family Grant', 'Family Grant: resale only', 'FAMILY_RESALE_ONLY', applies, applies
    ? 'Your household can receive the Family Grant when buying a resale flat.'
    : 'Your household can receive the Family Grant only when buying a resale flat.'));
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
  checks.push(eligibility('Family Grant', 'Family Grant: household type', 'FAMILY_HOUSEHOLD_TYPE', amountSchedule !== null && amountSchedule !== undefined,
    explicitlyIneligible
      ? 'This household is not eligible for the Family Grant. An applicant must be a Singapore Citizen with at least one other Singapore Citizen or Permanent Resident.'
      : amountSchedule !== null && amountSchedule !== undefined
        ? `${describeCitizenship(applicants)} Your household meets the first-timer and citizenship requirements for the Family Grant.`
        : 'Your household’s first-timer and citizenship requirements for the Family Grant have not yet been confirmed.'));

  // Family Grant eligibility requires the ceiling in the ruleset; an unknown ceiling fails closed.
  const incomeCeiling = grantRules.incomeCeiling;
  const income = householdIncome(profile);
  const incomePassed = typeof incomeCeiling === 'number' && income <= incomeCeiling;
  checks.push(eligibility('Family Grant', 'Family Grant: income limit', 'FAMILY_INCOME_LIMIT', incomePassed,
    typeof incomeCeiling !== 'number'
      ? 'The Family Grant income limit for your household has not yet been confirmed.'
      : incomePassed
        ? `Your household income (${formatMoney(income)}) is within the ${formatMoney(incomeCeiling)} limit for the Family Grant.`
        : `Your household income (${formatMoney(income)}) is above the ${formatMoney(incomeCeiling)} Family Grant limit.`));

  // The verified Family Grant schedule differentiates resale flat size; use its configured band labels.
  const amount = findFlatAmount(amountSchedule, choice.flatType);
  checks.push(eligibility('Family Grant', 'Family Grant: amount', 'FAMILY_AMOUNT', amount !== null,
    amount !== null
      ? `The Family Grant for a ${formatFlatType(choice.flatType)} flat is ${formatMoney(amount)} for ${familyGrantHouseholdLabel(applicants)}, if all requirements are met.`
      : `A Family Grant amount for your ${formatFlatType(choice.flatType)} flat and household type has not yet been confirmed.`));

  const eligible = checks.every((check) => check.passed);
  return { amount: eligible ? amount : 0, eligible, checks };
}

function evaluateEHG(profile, choice, assessmentDate, ruleset, familyGrant) {
  const grantRules = ruleset.grants.ehg;
  const combinationRules = ruleset.grants.eligibilityCombinations;
  const applicants = profile.applicants ?? [];
  const checks = [];

  // EHG purchase-path eligibility comes from the active ruleset.
  const pathApplies = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('EHG', 'EHG: BTO and resale', 'EHG_PATH', pathApplies, pathApplies
    ? 'The EHG applies to your purchase type.'
    : 'The EHG does not apply to this purchase type.'));

  // Research notes state that EHG covers Singapore Citizen and Singapore PR first-timers.
  const citizenshipPassed = applicants.length > 0
    && applicants.every((applicant) => applicant.citizenship === 'SC' || applicant.citizenship === 'PR');
  checks.push(eligibility('EHG', 'EHG: citizenship', 'EHG_CITIZENSHIP', citizenshipPassed, citizenshipPassed
    ? `${describeCitizenship(applicants)} Your household meets the citizenship requirement for EHG.`
    : 'Your household’s citizenship combination does not meet the EHG requirements.'));

  // First-timer status is per person; the checked FT+ST table applies when exactly one of two is a first-timer.
  const firstTimerCount = applicants.filter((applicant) => applicant.firstTimer).length;
  const firstTimerPassed = firstTimerCount > 0 && applicants.length <= 2;
  const firstTimerSecondTimer = applicants.length === 2 && firstTimerCount === 1;
  checks.push(eligibility('EHG', 'EHG: first-timer', 'EHG_FIRST_TIMER', firstTimerPassed, firstTimerPassed
    ? 'At least one person in your household is applying as a first-timer.'
    : 'Your household needs at least one first-timer to qualify for EHG.'));

  // The checked sources define monthlyIncome as the 12-month average used at assessmentDate.
  const income = householdIncome(profile);
  const assessedIncome = firstTimerSecondTimer ? income / applicants.length : income;
  const incomeCeiling = firstTimerSecondTimer
    ? combinationRules.firstTimerWithSecondTimer?.ehgIncomeCeiling
    : applicants.length === 1
      ? grantRules.incomeCeiling?.single
      : grantRules.incomeCeiling?.family;
  const ceilingPassed = typeof incomeCeiling === 'number' && assessedIncome <= incomeCeiling;
  checks.push(eligibility('EHG', 'EHG: income limit', 'EHG_INCOME_CEILING', ceilingPassed,
    typeof incomeCeiling !== 'number'
      ? 'The EHG income limit for your household has not yet been confirmed.'
      : ceilingPassed
        ? firstTimerSecondTimer
          ? `Your household income (${formatMoney(income)}) averages ${formatMoney(assessedIncome)} per applicant, within the ${formatMoney(incomeCeiling)} EHG limit.`
          : `Your household income (${formatMoney(income)}) is within the ${formatMoney(incomeCeiling)} EHG limit.`
        : firstTimerSecondTimer
          ? `Your household income (${formatMoney(income)}) averages ${formatMoney(assessedIncome)} per applicant, above the ${formatMoney(incomeCeiling)} EHG limit.`
          : `Your household income (${formatMoney(income)}) is above the ${formatMoney(incomeCeiling)} EHG limit.`));

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
  const tierBand = tier?.[firstTimerSecondTimer ? 'halfHouseholdIncomeBand' : 'monthlyHouseholdIncomeBand'];
  const tierIncomeDescription = firstTimerSecondTimer
    ? `half of your household income (${formatMoney(assessedIncome)})`
    : `your household income (${formatMoney(assessedIncome)})`;
  checks.push(eligibility('EHG', 'EHG: income band', 'EHG_INCOME_BAND', tierPassed,
    tierPassed
      ? `${tierIncomeDescription} falls in the EHG band ${formatIncomeBand(tierBand)}; the grant amount is ${formatMoney(tierAmount)}.`
      : tier
        ? `Your household income (${formatMoney(assessedIncome)}) is in an EHG band that does not qualify for a grant.`
        : 'An EHG amount for your household’s income has not yet been confirmed.'));

  // Employment is assumed to meet the configured continuous-employment period, as directed for this model.
  const employmentMonths = grantRules.employmentMonthsRequired;
  const employmentPassed = typeof employmentMonths === 'number';
  checks.push(eligibility('EHG', 'EHG: employment (assumed)', 'EHG_EMPLOYMENT_ASSUMED', employmentPassed, employmentPassed
    ? `We assume you meet the ${employmentMonths}-month continuous employment requirement.`
    : 'The continuous employment requirement has not yet been confirmed.'));

  // Research state-machine notes require Family Grant qualification before resale EHG can apply.
  const resalePrerequisitePassed = choice.path !== 'RESALE' || familyGrant.eligible;
  checks.push(eligibility('EHG', 'EHG: Family Grant needed first (resale)', 'EHG_FAMILY_GRANT_PREREQUISITE', resalePrerequisitePassed, resalePrerequisitePassed
    ? choice.path === 'RESALE'
      ? 'Your household meets the Family Grant eligibility requirements needed before EHG can be considered for resale.'
      : 'This requirement applies only when your household buys a resale flat.'
    : 'Your household must qualify for the Family Grant before it can receive EHG on a resale flat.'));

  // HDB's resale EHG minimum remaining lease is a separate eligibility requirement from lease-to-95 pro-rating.
  const resaleLeaseMinimum = grantRules.minRemainingLeaseYearsResale;
  const resaleLeaseUnknown = choice.path === 'RESALE' && typeof choice.remainingLeaseYears !== 'number';
  const leaseNotProvidedReason = 'Remaining lease not provided yet; lease checks not applied.';
  let minimumLeasePassed = true;
  if (choice.path === 'RESALE' && typeof resaleLeaseMinimum === 'number') {
    minimumLeasePassed = resaleLeaseUnknown || choice.remainingLeaseYears >= resaleLeaseMinimum;
    const minimumLeaseReason = resaleLeaseUnknown
      ? leaseNotProvidedReason
      : minimumLeasePassed
        ? `Your flat's remaining lease (${choice.remainingLeaseYears} years) meets the ${resaleLeaseMinimum}-year minimum for the EHG.`
        : `Your flat's remaining lease (${choice.remainingLeaseYears} years) is below the ${resaleLeaseMinimum}-year minimum for the EHG.`;
    checks.push(eligibility('EHG', 'EHG: resale minimum lease', 'EHG_MIN_LEASE', minimumLeasePassed, minimumLeaseReason));
  }

  // EHG lease coverage is assessed to the configured age; profile age is treated as age at assessmentDate.
  const leaseTargetAge = grantRules.leaseMustCoverToAge;
  let leasePassed = false;
  let leaseShortfall = false;
  let leaseReason = 'The lease coverage requirement has not yet been confirmed.';
  if (typeof leaseTargetAge === 'number' && applicants.length > 0) {
    if (resaleLeaseUnknown) {
      leasePassed = true;
      leaseReason = leaseNotProvidedReason;
    } else if (typeof choice.remainingLeaseYears !== 'number') {
      leaseReason = `Please provide the remaining lease term for your purchase on ${formatDate(assessmentDate)} so we can check coverage to age ${leaseTargetAge}.`;
    } else {
      const youngestAge = Math.min(...applicants.map((applicant) => applicant.age));
      const requiredLeaseYears = Math.max(0, leaseTargetAge - youngestAge);
      leasePassed = choice.remainingLeaseYears >= requiredLeaseYears;
      leaseShortfall = !leasePassed;
      leaseReason = leasePassed
        ? `Your remaining lease covers the youngest applicant to age ${leaseTargetAge} on ${formatDate(assessmentDate)}.`
        : `Your remaining lease does not cover the youngest applicant to age ${leaseTargetAge}. HDB pro-rating is not yet applied, so your actual EHG may be lower.`;
    }
  }
  checks.push(eligibility('EHG', 'EHG: lease covers age 95', 'EHG_LEASE_TO_95', leasePassed, leaseReason));

  // TODO: Apply the verified HDB lease-to-95 pro-rating formula; until then retain the full tier amount.
  const eligible = checks.every((check) => check.passed
    || (leaseShortfall && check.id === 'EHG_LEASE_TO_95'));
  return { amount: eligible && minimumLeasePassed ? tierAmount : 0, checks };
}

function evaluatePHG(profile, choice, ruleset) {
  const grantRules = ruleset.grants.proximityHousingGrant;
  const checks = [];

  // PHG purchase-path eligibility is read from the active ruleset.
  const applies = grantRules.appliesTo?.includes(choice.path) === true;
  checks.push(eligibility('PHG', 'PHG: resale only', 'PHG_RESALE_ONLY', applies, applies
    ? 'Your household can apply for the Proximity Housing Grant when buying a resale flat.'
    : 'The Proximity Housing Grant is available only when your household buys a resale flat.'));
  if (!applies) return { amount: 0, checks };

  // The optional choice field records WITH, NEAR, or NONE; omitted arrangements default to NONE.
  const livingArrangement = choice.livingArrangement ?? 'NONE';
  if (livingArrangement === 'NONE') {
    checks.push(eligibility('PHG', 'PHG: living arrangement', 'PHG_LIVING_ARRANGEMENT', true, 'You selected no qualifying arrangement to live with or near your parents or child, so no PHG is included.'));
    return { amount: 0, checks };
  }
  const arrangementPassed = livingArrangement === 'WITH' || livingArrangement === 'NEAR';
  checks.push(eligibility('PHG', 'PHG: living arrangement', 'PHG_LIVING_ARRANGEMENT', arrangementPassed, arrangementPassed
    ? livingArrangement === 'WITH'
      ? 'You selected that you will live with your parents or child.'
      : 'You selected that you will live near your parents or child.'
    : 'Choose whether you will live with, near, or neither to your parents or child.'));
  if (!arrangementPassed) return { amount: 0, checks };

  // PHG has separate configured amounts for living with versus near parents or a child, and for singles versus families.
  const applicantCount = profile.applicants?.length ?? 0;
  const householdType = applicantCount === 1 ? 'singles' : applicantCount > 1 ? 'families' : null;
  const arrangementKey = livingArrangement === 'WITH' ? 'livingWithParentsOrChild' : 'livingNear';
  const configuredAmount = householdType
    ? grantRules.amounts?.[arrangementKey]?.[householdType]
    : null;
  const amountPassed = typeof configuredAmount === 'number';
  const householdDescription = applicantCount === 1 ? 'single-person household' : 'family household';
  checks.push(eligibility('PHG', 'PHG: amount', 'PHG_AMOUNT', amountPassed, amountPassed
    ? livingArrangement === 'NEAR'
      ? `You get ${formatMoney(configuredAmount)} as a ${householdDescription} living near your parents or child.`
      : `You get ${formatMoney(configuredAmount)} as a ${householdDescription} living with your parents or child.`
    : 'A PHG amount for your household and living arrangement has not yet been confirmed.'));

  // The selected NEAR arrangement relies on the ruleset distance threshold; the input is an asserted arrangement.
  const distancePassed = livingArrangement !== 'NEAR' || typeof grantRules.nearDistanceKm === 'number';
  const distanceGrantLabel = typeof grantRules.nearDistanceKm === 'number'
    ? `PHG: ${grantRules.nearDistanceKm} km rule`
    : 'PHG: distance rule';
  checks.push(eligibility('PHG', distanceGrantLabel, 'PHG_NEAR_DISTANCE', distancePassed, distancePassed
    ? livingArrangement === 'NEAR'
      ? `Your selected near arrangement is subject to the ${grantRules.nearDistanceKm} km distance limit.`
      : 'You selected living with your parents or child, so the near-distance limit does not apply.'
    : 'The PHG distance limit has not yet been confirmed.'));

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
