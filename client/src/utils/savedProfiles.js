// About you autofill: for each number box, the different answers it had in the user's saved scenarios, for the
// suggestion list under that box (SituationForm.vue, SavedValueList.vue). Each scenario's `profile` is in the
// store's shape (dollars). A box is named by the same key as its error: 'applicants.0.age', 'cashSavings'.

export const MAX_SUGGESTIONS = 5;

// The number at `field` in a profile, or null when it is missing or not a number.
export function valueAt(profile, field) {
  let value = profile;
  for (const part of field.split('.')) {
    if (value === null || typeof value !== 'object') {
      return null;
    }
    value = value[part];
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

// profiles: newest first. The different values of one box, newest first, at most MAX_SUGGESTIONS.
export function savedValues(profiles, field) {
  const values = [];
  for (const profile of profiles) {
    if (values.length >= MAX_SUGGESTIONS) {
      break;
    }
    const value = valueAt(profile, field);
    if (value !== null && !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

// Like the browser's own suggestions: once the user starts typing, only the values that start with what is typed.
// The value already in the box is left out, so the list goes away once it is filled.
export function matchingValues(values, current) {
  if (current === null) {
    return values;
  }
  const typed = String(current);
  const matches = [];
  for (const value of values) {
    if (value !== current && String(value).startsWith(typed)) {
      matches.push(value);
    }
  }
  return matches;
}

// "33" for an age, "S$5,000" or "S$45,123.67" for money (cents kept, unlike formatMoney).
export function suggestionLabel(field, value) {
  if (field.endsWith('.age')) {
    return String(value);
  }
  return 'S$' + value.toLocaleString('en-SG', { maximumFractionDigits: 2 });
}
