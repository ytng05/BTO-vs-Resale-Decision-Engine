// Input validation for the plan stepper.
//
// This checks that the input itself makes sense (filled in, a number, in a sane
// range, one of the allowed options). It deliberately does NOT check eligibility
// (income ceilings, age limits, citizenship rules): those are policy figures that
// live in the versioned ruleset and are checked by the rules engine on the server.
// The one household rule here (exactly two buyers, at least one Singapore Citizen) is the
// app's SCOPE from API_CONTRACT.md, not a policy figure.
//
// Field keys follow the store (client/src/stores/scenario.js), which follows contract v2/v2.1.
// Each validator returns an object of { fieldKey: 'message' }. Empty object = valid.
// Pure functions, so they can be unit-tested without mounting any component.

import {
  TOWNS,
  FLAT_TYPES,
  BTO_FLAT_TYPES,
  CLASSIFICATIONS,
  CITIZENSHIPS,
  LIVING_ARRANGEMENTS,
  LEASE_BANDS,
  REQUIRED_APPLICANTS,
} from '../constants/planOptions.js';

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

// Step "About you": the two buyers, cash savings and the optional move-in year.
export function validateBuyers(profile, { currentYear = new Date().getFullYear() } = {}) {
  const errors = {};
  const applicants = profile?.applicants ?? [];

  if (applicants.length !== REQUIRED_APPLICANTS) {
    errors.applicants = 'This version compares households of two buyers. Fill in both buyers.';
  } else if (!applicants.some((a) => a.citizenship === 'SC')) {
    errors.applicants = 'At least one buyer must be a Singapore Citizen.';
  }

  applicants.forEach((a, i) => {
    const p = `applicants.${i}`;
    // 21: HDB's minimum age to buy a flat (Cadence, 3 Nov 2026; not in the ruleset yet). 99: a sanity cap.
    checkNumber(errors, `${p}.age`, a.age, {
      label: 'age', min: 21, max: 99, integer: true, requiredMessage: 'Enter an age.', rangeMessage: 'Enter an age between 21 and 99.',
    });
    checkOption(errors, `${p}.citizenship`, a.citizenship, CITIZENSHIPS, 'citizenship');
    if (typeof a.firstTimer !== 'boolean') errors[`${p}.firstTimer`] = 'Say whether this buyer is a first-timer.';
    checkNumber(errors, `${p}.monthlyIncome`, a.monthlyIncome, {
      label: 'monthly income',
      min: 0,
      max: 100000,
      tooHighMessage: 'That looks like a yearly figure. Enter monthly income.',
    });
    checkNumber(errors, `${p}.cpfOaBalance`, a.cpfOaBalance, { label: 'CPF Ordinary Account balance', min: 0, max: 2000000, requiredMessage: 'Enter an amount, or 0 if none.' });
  });

  checkNumber(errors, 'cashSavings', profile?.cashSavings, { label: 'cash savings', min: 0, requiredMessage: 'Enter an amount, or 0 if none.' });

  // Optional "must move in by" year.
  checkNumber(errors, 'moveInByYear', profile?.constraints?.moveInByYear, {
    label: 'move-in year',
    min: currentYear,
    max: currentYear + 30,
    integer: true,
    required: false,
    rangeMessage: `Enter a year from ${currentYear} to ${currentYear + 30}, or leave it blank.`,
  });

  return errors;
}

// A CPF Ordinary Account balance that is probably a typo: more than S$25,000 for each year since age 20, roughly the
// most a top earner's OA builds in a year (Cadence, 3 Nov 2026). A rough guide, not a CPF figure, so it only asks
// the user to double-check and never blocks Next. False when the age or balance is not in yet.
export const CPF_OA_HIGH_PER_YEAR = 25000;
export function cpfLooksHigh(age, balance) {
  if (!Number.isInteger(age) || typeof balance !== 'number') return false;
  return balance > Math.max(age - 20, 1) * CPF_OA_HIGH_PER_YEAR;
}

// "About you" is asked over four screens, one question each (Calm "Easier onboarding" board). Each screen checks only
// its own fields; validateBuyers still checks the whole step, so Results and the Dashboard see every field.
export const ABOUT_PARTS = ['ages', 'buyers', 'incomes', 'savings'];
const PART_BUYER_FIELDS = { ages: ['age'], buyers: ['citizenship', 'firstTimer'], incomes: ['monthlyIncome'], savings: ['cpfOaBalance'] };
const PART_HOUSEHOLD_FIELDS = { ages: [], buyers: ['applicants'], incomes: [], savings: ['cashSavings', 'moveInByYear'] };

export function validateAboutPart(part, profile, options = {}) {
  const name = ABOUT_PARTS[part];
  if (!name) return {};
  return Object.fromEntries(Object.entries(validateBuyers(profile, options)).filter(([key]) => {
    const buyerField = key.match(/^applicants\.\d+\.(.+)$/)?.[1];
    return buyerField ? PART_BUYER_FIELDS[name].includes(buyerField) : PART_HOUSEHOLD_FIELDS[name].includes(key);
  }));
}

// The assumptions: defaults in onboarding (D38), changed on the Dashboard.
export function validateAssumptions(assumptions, { currentYear = new Date().getFullYear() } = {}) {
  const errors = {};

  // Growth rates are stored as decimals (0.03 = 3%).
  checkNumber(errors, 'annualPriceGrowth', assumptions?.annualPriceGrowth, {
    label: 'flat price growth',
    min: -0.2,
    max: 0.2,
    requiredMessage: 'Enter flat price growth (% a year).',
    rangeMessage: 'Flat price growth must be between -20% and 20% a year.',
  });
  checkNumber(errors, 'annualIncomeGrowth', assumptions?.annualIncomeGrowth, {
    label: 'income growth',
    min: -0.2,
    max: 0.3,
    requiredMessage: 'Enter income growth (% a year).',
    rangeMessage: 'Income growth must be between -20% and 30% a year.',
  });

  // Optional: the year both paths are compared at. Blank = the server's default (later key year + 10).
  // The server also checks it is not before either path's keys.
  checkNumber(errors, 'horizonYear', assumptions?.horizonYear, {
    label: 'year to compare at',
    min: currentYear + 1,
    max: currentYear + 60,
    integer: true,
    required: false,
    rangeMessage: `Enter a year from ${currentYear + 1} to ${currentYear + 60}, or leave it blank.`,
  });

  // Rent (or other housing cost) per month until keys; blank or 0 = living with parents.
  checkNumber(errors, 'monthlyHousingCostWhileWaiting', assumptions?.monthlyHousingCostWhileWaiting, {
    label: 'monthly rent while waiting',
    min: 0,
    max: 20000,
    required: false,
    tooHighMessage: 'That looks too high for monthly rent. Enter the amount per month.',
  });

  return errors;
}

// The buyers and the assumptions together (the old single "Situation" step).
export function validateSituation(profile, assumptions, options = {}) {
  return { ...validateBuyers(profile, options), ...validateAssumptions(assumptions, options) };
}

export function validateChoice(choice, { currentYear = new Date().getFullYear(), btoPriceRange } = {}) {
  const errors = {};
  const isBto = choice?.path === 'BTO';

  checkNumber(errors, 'applicationYear', choice?.applicationYear, {
    label: 'year',
    min: currentYear,
    max: currentYear + 15,
    integer: true,
    requiredMessage: 'Enter a year.',
    rangeMessage: `Enter a year from ${currentYear} to ${currentYear + 15}.`,
  });
  checkOption(errors, 'town', choice?.town, TOWNS, 'town');
  checkOption(errors, 'flatType', choice?.flatType, isBto ? BTO_FLAT_TYPES : FLAT_TYPES, 'flat type');

  if (isBto) {
    checkOption(errors, 'classification', choice?.classification, CLASSIFICATIONS, 'classification');
    // Optional price slider: must sit inside the chosen project's HDB range (D26).
    // `btoPriceRange` is { min, max } in dollars, passed in by the form when a project is chosen.
    if (!isBlank(choice?.btoPrice) && btoPriceRange) {
      checkNumber(errors, 'btoPrice', choice.btoPrice, {
        label: 'BTO price',
        min: btoPriceRange.min,
        max: btoPriceRange.max,
        rangeMessage: "Choose a price inside the project's HDB price range.",
      });
    }
    checkNumber(errors, 'btoWaitMonths', choice?.btoWaitMonths, {
      label: 'waiting time', min: 1, max: 120, integer: true, required: false,
      rangeMessage: 'Enter a waiting time from 1 to 120 months, or leave it blank.',
    });
  } else {
    checkOption(errors, 'livingArrangement', choice?.livingArrangement, LIVING_ARRANGEMENTS, 'living arrangement');
    checkOption(errors, 'leaseBand', choice?.leaseBand, LEASE_BANDS, 'remaining lease band');
    // Optional asking price (D39); blank = the median of recent sales.
    checkNumber(errors, 'resalePrice', choice?.resalePrice, {
      label: 'asking price',
      min: 50000,
      max: 3000000,
      required: false,
      rangeMessage: 'Enter an asking price from $50,000 to $3,000,000, or leave it blank to use the median.',
    });
  }

  // Renovation budget for this flat; blank or 0 = none.
  checkNumber(errors, 'renovation', choice?.renovation, {
    label: 'renovation budget',
    min: 0,
    max: 500000,
    required: false,
  });

  return errors;
}

// Errors for whichever step the stepper is on (STEPS in the store, D38). Step 0 (what matters most) is
// optional and step 4 (Results) has no inputs.
export function validateStep(step, store, options = {}) {
  if (step === 1) return validateBuyers(store.profile, options);
  if (step === 2) return validateChoice(store.choiceA, options);
  if (step === 3) return validateChoice(store.choiceB, options);
  return {};
}

// Every input the comparison needs, whichever step asks for it (or the default that stands in for it).
export function validatePlan(store, options = {}) {
  return {
    ...validateBuyers(store.profile, options),
    ...validateAssumptions(store.assumptions, options),
    ...prefixed('choiceA', validateChoice(store.choiceA, options)),
    ...prefixed('choiceB', validateChoice(store.choiceB, options)),
  };
}

// True when the plan can be compared: Results and the Dashboard check this before calling the server.
export function isPlanComplete(store, options = {}) {
  return Object.keys(validatePlan(store, options)).length === 0;
}

function prefixed(prefix, errors) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${prefix}.${k}`, v]));
}

function withArticle(noun) {
  return (/^[aeiou]/i.test(noun) ? 'an ' : 'a ') + noun;
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}