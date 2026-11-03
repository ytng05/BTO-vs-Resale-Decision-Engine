// About you autofill: only distinct, complete household details are suggested, newest first, at most three.
import { describe, it, expect } from 'vitest';
import { profileKey, uniqueProfiles } from '../src/utils/savedProfiles.js';

function buyer(id, age, monthlyIncome, cpfOaBalance) {
  return { id: id, age: age, citizenship: 'SC', firstTimer: true, monthlyIncome: monthlyIncome, cpfOaBalance: cpfOaBalance };
}
function household(cash, a, b) {
  return { applicants: [a, b], cashSavings: cash, constraints: { moveInByYear: null } };
}

const ours = household(20000, buyer('applicant-1', 29, 5000, 40000), buyer('applicant-2', 31, 4800, 30000));
// Same answers, saved in another session: different buyer ids and move-in year.
const oursAgain = { ...household(20000, buyer('applicant-7', 29, 5000, 40000), buyer('applicant-8', 31, 4800, 30000)), constraints: { moveInByYear: 2030 } };
const raise = household(20000, buyer('applicant-3', 29, 6200, 40000), buyer('applicant-4', 31, 4800, 30000));
const moreCash = household(35000, buyer('applicant-5', 29, 5000, 40000), buyer('applicant-6', 31, 4800, 30000));

describe('uniqueProfiles', () => {
  it('shows the same household once, however many times it was saved', () => {
    const list = uniqueProfiles([ours, oursAgain, ours]);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Ages 29 and 31');
    expect(list[0].detail).toBe('S$5,000 + S$4,800 a month');
  });

  it('keeps looking past repeats, so older different households still appear (newest first)', () => {
    const list = uniqueProfiles([ours, oursAgain, ours, oursAgain, raise]);
    expect(list.map((s) => s.detail)).toEqual(['S$5,000 + S$4,800 a month', 'S$6,200 + S$4,800 a month']);
  });

  it('stops at three suggestions', () => {
    const others = [];
    for (let age = 25; age < 30; age += 1) {
      others.push(household(1000, buyer('x', age, 3000, 1000), buyer('y', 30, 3000, 1000)));
    }
    expect(uniqueProfiles(others)).toHaveLength(3);
  });

  it('adds the CPF and cash line only where two suggestions would otherwise look the same', () => {
    const list = uniqueProfiles([ours, moreCash, raise]);
    expect(list).toHaveLength(3);
    expect(list[0].showSavings).toBe(true);
    expect(list[0].savings).toBe('CPF OA S$40,000 + S$30,000 · cash S$20,000');
    expect(list[1].showSavings).toBe(true);
    expect(list[1].savings).toContain('cash S$35,000');
    expect(list[2].showSavings).toBe(false);
  });

  it('skips profiles with a missing age, and copes with odd saved data', () => {
    const halfDone = household(null, buyer('a', 29, null, null), buyer('b', null, null, null));
    expect(uniqueProfiles([halfDone, null, {}, { applicants: [] }, ours])).toHaveLength(1);
  });
});

describe('profileKey', () => {
  it('ignores buyer ids and the move-in year, but not the answers or their order', () => {
    expect(profileKey(ours)).toBe(profileKey(oursAgain));
    expect(profileKey(ours)).not.toBe(profileKey(raise));
    const swapped = household(20000, ours.applicants[1], ours.applicants[0]);
    expect(profileKey(ours)).not.toBe(profileKey(swapped));
  });
});
