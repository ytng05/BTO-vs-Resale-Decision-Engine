// About you autofill: the distinct household details in the user's saved scenarios, for the suggestion list
// under the "You" age box (SituationForm.vue). Each scenario's `profile` is in the store's shape (dollars).
import { formatMoney } from './format.js';

export const MAX_SUGGESTIONS = 3;

// One buyer's answers, with empty or missing ones as null, so "not filled in" always compares the same.
function buyerAnswers(a) {
  let age = null;
  if (Number.isInteger(a.age)) {
    age = a.age;
  }
  let income = null;
  if (typeof a.monthlyIncome === 'number') {
    income = a.monthlyIncome;
  }
  let cpf = null;
  if (typeof a.cpfOaBalance === 'number') {
    cpf = a.cpfOaBalance;
  }
  let citizenship = null;
  if (a.citizenship) {
    citizenship = a.citizenship;
  }
  let firstTimer = null;
  if (typeof a.firstTimer === 'boolean') {
    firstTimer = a.firstTimer;
  }
  return [age, citizenship, firstTimer, income, cpf];
}

// The answers that matter, without the buyer ids (which change every session), so the same household shows once.
export function profileKey(profile) {
  const parts = [];
  for (const a of profile.applicants) {
    parts.push(buyerAnswers(a));
  }
  let cash = null;
  if (typeof profile.cashSavings === 'number') {
    cash = profile.cashSavings;
  }
  parts.push(cash);
  return JSON.stringify(parts);
}

// Only worth suggesting when every buyer has an age (a half-filled profile would leave screens empty).
function isComplete(profile) {
  if (!profile || !Array.isArray(profile.applicants) || profile.applicants.length === 0) {
    return false;
  }
  for (const a of profile.applicants) {
    if (!Number.isInteger(a.age)) {
      return false;
    }
  }
  return true;
}

function joinMoney(values, ending) {
  const parts = [];
  for (const v of values) {
    if (typeof v === 'number') {
      parts.push(formatMoney(v));
    }
  }
  if (parts.length === 0) {
    return '';
  }
  return parts.join(' + ') + ending;
}

// "Ages 29 and 31", "S$5,000 + S$4,800 a month", and "CPF OA S$40,000 + S$30,000 · cash S$20,000"
function describe(profile) {
  const ages = [];
  const incomes = [];
  const cpf = [];
  for (const a of profile.applicants) {
    ages.push(a.age);
    incomes.push(a.monthlyIncome);
    cpf.push(a.cpfOaBalance);
  }
  let savings = joinMoney(cpf, '');
  if (savings !== '') {
    savings = 'CPF OA ' + savings;
  }
  if (typeof profile.cashSavings === 'number') {
    if (savings !== '') {
      savings = savings + ' · ';
    }
    savings = savings + 'cash ' + formatMoney(profile.cashSavings);
  }
  return {
    title: 'Ages ' + ages.join(' and '),
    detail: joinMoney(incomes, ' a month'),
    savings: savings,
  };
}

// profiles: newest first. Returns at most MAX_SUGGESTIONS distinct, complete ones:
// [{ key, profile, title, detail, savings, showSavings }]. showSavings is true when another suggestion has the same
// ages and incomes, so the CPF and cash line is what tells the two apart.
export function uniqueProfiles(profiles) {
  const suggestions = [];
  const seen = [];
  for (const profile of profiles) {
    if (suggestions.length >= MAX_SUGGESTIONS) {
      break;
    }
    if (!isComplete(profile)) {
      continue;
    }
    const key = profileKey(profile);
    if (seen.includes(key)) {
      continue;
    }
    seen.push(key);
    const text = describe(profile);
    suggestions.push({
      key: key, profile: profile, title: text.title, detail: text.detail, savings: text.savings, showSavings: false,
    });
  }
  for (const s of suggestions) {
    for (const other of suggestions) {
      if (other !== s && other.title === s.title && other.detail === s.detail) {
        s.showSavings = true;
      }
    }
  }
  return suggestions;
}
