// Input validation for the plan stepper.
//
// This checks that the input itself makes sense (filled in, a number, in a sane
// range, one of the allowed options). It deliberately does NOT check eligibility
// (income ceilings, age limits, citizenship rules): those are policy figures that
// live in the versioned ruleset and are checked by the rules engine on the server.
//
// Each validator returns an object of { fieldKey: 'message' }. Empty object = valid.
// Pure functions, so they can be unit-tested without mounting any component.

import { TOWNS, FLAT_TYPES, BTO_FLAT_TYPES, CLASSIFICATIONS, CITIZENSHIPS, LIVING_ARRANGEMENTS, MAX_APPLICANTS } from '../constants/planOptions.js';

const isBlank = (v) => v === null || v === undefined || v === '';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const allowed = (options) => options.map((o) => o.value);

// `label` is the field's name as the user sees it, used in every message.
// `rangeMessage` replaces BOTH the below-minimum and above-maximum messages, for fields
// whose stored value differs from what the user typed (growth rates: typed 3, stored 0.03).
// `tooHighMessage` replaces only the above-maximum message.
function checkNumber(errors, key, value, { label, min, max, integer = false, required = true, requiredMessage, rangeMessage, tooHighMessage }) {
  if (isBlank(value)) {
    if (required) errors[key] = requiredMessage ?? `Enter ${withArticle(label)}.`;
    return;
  }
  if (!isNumber(value)) {
    errors[key] = `${capitalise(label)} must be a number.`;
    return;
  }
  if (integer && !Number.isInteger(value)) {
    errors[key] = `${capitalise(label)} must be a whole number.`;
    return;
  }
  if (min !== undefined && value < min) {
    errors[key] = rangeMessage ?? `${capitalise(label)} must be at least ${min}.`;
    return;
  }
  if (max !== undefined && value > max) {
    errors[key] = rangeMessage ?? tooHighMessage ?? `${capitalise(label)} must be at most ${max}.`;
  }
}

function checkOption(errors, key, value, options, label) {
  if (isBlank(value)) {
    errors[key] = `Choose ${withArticle(label)}.`;
  } else if (!allowed(options).includes(value)) {
    errors[key] = `Choose a valid ${label}.`;
  }
}

export function validateSituation(profile, assumptions) {
  const errors = {};
  const applicants = profile?.applicants ?? [];

  if (applicants.length === 0) {
    errors.applicants = 'Add at least one buyer.';
  } else if (applicants.length > MAX_APPLICANTS) {
    errors.applicants = `Add at most ${MAX_APPLICANTS} buyers.`;
  }

  applicants.forEach((a, i) => {
    const p = `applicants.${i}`;
    checkNumber(errors, `${p}.age`, a.age, { label: 'age', min: 18, max: 100, integer: true, requiredMessage: 'Enter an age.' });
    checkOption(errors, `${p}.citizenship`, a.citizenship, CITIZENSHIPS, 'citizenship');
    if (typeof a.firstTimer !== 'boolean') errors[`${p}.firstTimer`] = 'Say whether this buyer is a first-timer.';
    checkNumber(errors, `${p}.monthlyIncome`, a.monthlyIncome, {
      label: 'monthly income',
      min: 0,
      max: 100000,
      tooHighMessage: 'That looks like a yearly figure. Enter monthly income.',
    });
    checkNumber(errors, `${p}.cpfOaBalance`, a.cpfOaBalance, { label: 'CPF OA balance', min: 0, max: 2000000, requiredMessage: 'Enter a CPF OA balance (0 if none).' });
  });

  checkNumber(errors, 'cashSavings', profile?.cashSavings, { label: 'cash savings', min: 0, requiredMessage: 'Enter your cash savings (0 if none).' });
  checkNumber(errors, 'monthlySavings', profile?.monthlySavings, { label: 'cash saved each month', min: 0, requiredMessage: 'Enter how much cash you save each month (0 if none).' });

  // Parents' postal code is optional: blank means no parent to live with or near.
  // Stored as { postal: '123456' } to match Profile.parentsAddress in engine/types.js.
  const postal = profile?.parentsAddress?.postal;
  if (!isBlank(postal) && !/^\d{6}$/.test(String(postal).trim())) {
    errors.parentsAddress = 'Enter a 6-digit Singapore postal code, or leave it blank.';
  }

  // Growth rates are stored as decimals (0.03 = 3%).
  checkNumber(errors, 'priceGrowth', assumptions?.priceGrowth, {
    label: 'flat price growth',
    min: -0.2,
    max: 0.2,
    requiredMessage: 'Enter flat price growth (% a year).',
    rangeMessage: 'Flat price growth must be between -20% and 20% a year.',
  });
  checkNumber(errors, 'incomeGrowth', assumptions?.incomeGrowth, {
    label: 'income growth',
    min: -0.2,
    max: 0.3,
    requiredMessage: 'Enter income growth (% a year).',
    rangeMessage: 'Income growth must be between -20% and 30% a year.',
  });
  checkNumber(errors, 'horizonYears', assumptions?.horizonYears, {
    label: 'number of years to compare after',
    min: 1,
    max: 50,
    integer: true,
    requiredMessage: 'Enter how many years to compare after.',
    rangeMessage: 'Choose between 1 and 50 years.',
  });

  return errors;
}

// `profile` is only needed for one cross-step check: living with or near parents
// needs their postal code from the Situation step.
export function validateChoice(choice, { currentYear = new Date().getFullYear(), profile } = {}) {
  const errors = {};
  const isBto = choice?.path === 'BTO';

  checkNumber(errors, 'purchaseYear', choice?.purchaseYear, {
    label: 'year',
    min: currentYear,
    max: currentYear + 15,
    integer: true,
    requiredMessage: 'Enter a year.',
    rangeMessage: `Enter a year from ${currentYear} to ${currentYear + 15}.`,
  });
  checkOption(errors, 'town', choice?.town, TOWNS, 'town');
  checkOption(errors, 'flatType', choice?.flatType, isBto ? BTO_FLAT_TYPES : FLAT_TYPES, 'flat type');
  if (isBto) checkOption(errors, 'classification', choice?.classification, CLASSIFICATIONS, 'classification');

  if (!isBto) {
    checkOption(errors, 'livingArrangement', choice?.livingArrangement, LIVING_ARRANGEMENTS, 'living arrangement');
    const needsParents = choice?.livingArrangement === 'WITH' || choice?.livingArrangement === 'NEAR';
    if (needsParents && profile && isBlank(profile.parentsAddress?.postal)) {
      errors.livingArrangement = "Add your parents' postal code on the Situation step first.";
    }
  }

  return errors;
}

// Errors for whichever step the stepper is on. Step 3 (Results) has no inputs.
export function validateStep(step, store, options) {
  if (step === 0) return validateSituation(store.profile, store.assumptions);
  if (step === 1) return validateChoice(store.choiceA, { ...options, profile: store.profile });
  if (step === 2) return validateChoice(store.choiceB, { ...options, profile: store.profile });
  return {};
}

function withArticle(noun) {
  return (/^[aeiou]/i.test(noun) ? 'an ' : 'a ') + noun;
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}