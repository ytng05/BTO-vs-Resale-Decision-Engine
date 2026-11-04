// About you autofill: each box suggests the different answers it had in saved scenarios, newest first.
import { describe, it, expect } from 'vitest';
import { MAX_SUGGESTIONS, matchingValues, savedValues, suggestionLabel, valueAt } from '../src/utils/savedProfiles.js';

function buyer(age, monthlyIncome, cpfOaBalance) {
  return { id: 'x', age: age, citizenship: 'SC', firstTimer: true, monthlyIncome: monthlyIncome, cpfOaBalance: cpfOaBalance };
}
function household(cash, a, b) {
  return { applicants: [a, b], cashSavings: cash, constraints: { moveInByYear: null } };
}

// Newest first, as GET /api/scenarios lists them.
const newest = household(20000, buyer(33, 5000, 40000), buyer(44, 6000, 4000));
const older = household(20000, buyer(37, 5000, 45123.67), buyer(44, 6200, 4000));
const oldest = household(null, buyer(33, null, null), buyer(null, null, null));
const saved = [newest, older, oldest];

describe('savedValues', () => {
  it('gives each box its own different answers, newest first', () => {
    expect(savedValues(saved, 'applicants.0.age')).toEqual([33, 37]);
    expect(savedValues(saved, 'applicants.1.age')).toEqual([44]);
    expect(savedValues(saved, 'applicants.1.monthlyIncome')).toEqual([6000, 6200]);
    expect(savedValues(saved, 'cashSavings')).toEqual([20000]);
  });

  it('skips empty answers and odd saved data', () => {
    expect(savedValues([oldest, null, {}, { applicants: [] }], 'applicants.1.age')).toEqual([]);
    expect(savedValues([oldest, null, {}], 'cashSavings')).toEqual([]);
  });

  it('stops at MAX_SUGGESTIONS', () => {
    const many = [];
    for (let age = 21; age < 31; age += 1) {
      many.push(household(0, buyer(age, 0, 0), buyer(30, 0, 0)));
    }
    expect(savedValues(many, 'applicants.0.age')).toHaveLength(MAX_SUGGESTIONS);
  });
});

describe('matchingValues', () => {
  it('shows every value in an empty box', () => {
    expect(matchingValues([33, 37], null)).toEqual([33, 37]);
  });

  it('keeps only the values that start with what is typed, without the one already in the box', () => {
    expect(matchingValues([33, 37, 44], 3)).toEqual([33, 37]);
    expect(matchingValues([33, 37], 33)).toEqual([]);
    expect(matchingValues([5000, 6200], 50)).toEqual([5000]);
    expect(matchingValues([33, 37], 4)).toEqual([]);
  });
});

describe('suggestionLabel and valueAt', () => {
  it('shows ages as plain numbers and money in dollars, cents kept', () => {
    expect(suggestionLabel('applicants.0.age', 33)).toBe('33');
    expect(suggestionLabel('applicants.0.monthlyIncome', 5000)).toBe('S$5,000');
    expect(suggestionLabel('applicants.0.cpfOaBalance', 45123.67)).toBe('S$45,123.67');
  });

  it('reads a box by its key, or null', () => {
    expect(valueAt(newest, 'applicants.1.cpfOaBalance')).toBe(4000);
    expect(valueAt(newest, 'applicants.2.age')).toBeNull();
    expect(valueAt(null, 'cashSavings')).toBeNull();
  });
});
