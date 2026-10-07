// Input validation for the plan stepper.
//
// This checks that the input itself makes sense (filled in, a number, in a sane
// range, one of the allowed options). It deliberately does NOT check eligibility
// (income ceilings, age limits, citizenship rules): those are policy figures that
// live in the versioned ruleset and are checked by the rules engine on the server.
//
// Each validator returns an object of { fieldKey: 'message' }. Empty object = valid.
// Pure functions, so they can be unit-tested without mounting any component.

import { TOWNS, FLAT_TYPES, BTO_FLAT_TYPES, CLASSIFICATIONS, CITIZENSHIPS, MAX_APPLICANTS } from '../constants/planOptions.js';

const isBlank = (v) => v === null || v === undefined || v === '';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const allowed = (options) => options.map((o) => o.value);

function checkNumber(errors, key, value, { label, min, max, integer = false, required = true, hint }) {
  if (isBlank(value)) {
    if (required) errors[key] = `Enter ${label}.`;
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
    errors[key] = `${capitalise(label)} must be at least ${min}.`;
    return;
  }
  if (max !== undefined && value > max) {
    errors[key] = hint ?? `${capitalise(label)} must be at most ${max}.`;
  }
}

function checkOption(errors, key, value, options, label) {
  if (isBlank(value)) {
    errors[key] = `Choose ${label}.`;
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
    checkNumber(errors, `${p}.age`, a.age, { label: 'age', min: 18, max: 100, integer: true });
    checkOption(errors, `${p}.citizenship`, a.citizenship, CITIZENSHIPS, 'citizenship');
    if (typeof a.firstTimer !== 'boolean') errors[`${p}.firstTimer`] = 'Say whether this buyer is a first-timer.';
    checkNumber(errors, `${p}.monthlyIncome`, a.monthlyIncome, {
      label: 'monthly income',
      min: 0,
      max: 100000,
      hint: 'That looks like a yearly figure. Enter monthly income.',
    });
    checkNumber(errors, `${p}.cpfOA`, a.cpfOA, { label: 'CPF OA balance', min: 0, max: 2000000 });
  });

  checkNumber(errors, 'cashSavings', profile?.cashSavings, { label: 'cash savings', min: 0 });
  checkNumber(errors, 'monthlySavings', profile?.monthlySavings, { label: 'monthly savings', min: 0 });

  // Parents' postal code is optional: blank means no parent to live with or near.
  const postal = profile?.parentsAddress;
  if (!isBlank(postal) && !/^\d{6}$/.test(String(postal).trim())) {
    errors.parentsAddress = 'Enter a 6-digit Singapore postal code, or leave it blank.';
  }

  // Growth rates are stored as decimals (0.03 = 3%).
  checkNumber(errors, 'priceGrowth', assumptions?.priceGrowth, { label: 'expected price growth', min: -0.2, max: 0.2, hint: 'Expected price growth must be between -20% and 20% a year.' });
  checkNumber(errors, 'incomeGrowth', assumptions?.incomeGrowth, { label: 'expected income growth', min: -0.2, max: 0.3, hint: 'Expected income growth must be between -20% and 30% a year.' });
  checkNumber(errors, 'horizonYears', assumptions?.horizonYears, { label: 'horizon', min: 1, max: 50, integer: true });

  return errors;
}

export function validateChoice(choice, { currentYear = new Date().getFullYear() } = {}) {
  const errors = {};
  const isBto = choice?.path === 'BTO';

  checkNumber(errors, 'purchaseYear', choice?.purchaseYear, {
    label: 'purchase year',
    min: currentYear,
    max: currentYear + 15,
    integer: true,
  });
  checkOption(errors, 'town', choice?.town, TOWNS, 'town');
  checkOption(errors, 'flatType', choice?.flatType, isBto ? BTO_FLAT_TYPES : FLAT_TYPES, 'flat type');
  if (isBto) checkOption(errors, 'classification', choice?.classification, CLASSIFICATIONS, 'classification');

  return errors;
}

// Errors for whichever step the stepper is on. Step 3 (Results) has no inputs.
export function validateStep(step, store, options) {
  if (step === 0) return validateSituation(store.profile, store.assumptions);
  if (step === 1) return validateChoice(store.choiceA, options);
  if (step === 2) return validateChoice(store.choiceB, options);
  return {};
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}