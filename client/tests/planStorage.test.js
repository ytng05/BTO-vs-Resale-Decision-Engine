import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { PLAN_KEY, PLAN_VERSION, clearPlan, readPlan, writePlan } from '../src/stores/planStorage.js';
import { useScenarioStore } from '../src/stores/scenario.js';
import { useAuthStore } from '../src/stores/auth.js';

// A stand-in for window.sessionStorage (the tests run in Node, which has none).
function memoryStorage() {
  const items = new Map();
  return {
    getItem: (k) => (items.has(k) ? items.get(k) : null),
    setItem: (k, v) => items.set(k, String(v)),
    removeItem: (k) => items.delete(k),
    items,
  };
}
// Storage the browser has blocked: every call throws, as Safari's private mode and blocked cookies do.
const blocked = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
  removeItem() { throw new Error('SecurityError'); },
};

// A plan with answers in it, as the store holds it.
function fillPlan(s) {
  s.profile.applicants[0].age = 30;
  s.profile.applicants[0].monthlyIncome = 5000;
  s.profile.applicants[0].cpfOaBalance = 40000;
  s.profile.cashSavings = 20000;
  s.choiceA.town = 'TAMPINES';
  s.choiceA.flatType = '4 ROOM';
  s.choiceB.town = 'BEDOK';
  s.choiceB.flatType = '4 ROOM';
  s.choiceB.leaseBand = '80-89';
  s.step = 3;
  s.furthest = 3;
  s.reviewed = true;
}

describe('planStorage', () => {
  it('writes the plan under a version and reads it back', () => {
    const storage = memoryStorage();
    writePlan({ step: 2, profile: { cashSavings: 1 } }, storage);
    expect(JSON.parse(storage.getItem(PLAN_KEY)).v).toBe(PLAN_VERSION);
    expect(readPlan(storage)).toMatchObject({ step: 2, profile: { cashSavings: 1 } });
    clearPlan(storage);
    expect(readPlan(storage)).toBeNull();
  });

  it('keeps only the plan: never the saved answers, the token or anything else in the state', () => {
    const storage = memoryStorage();
    writePlan({ step: 1, savedProfiles: [{ age: 30 }], savedProfilesOwner: 'u1', token: 'jwt', savedListVersion: 4 }, storage);
    const { plan } = JSON.parse(storage.getItem(PLAN_KEY));
    expect(plan).not.toHaveProperty('savedProfiles');
    expect(plan).not.toHaveProperty('savedProfilesOwner');
    expect(plan).not.toHaveProperty('token');
    expect(plan).not.toHaveProperty('savedListVersion');
  });

  it('drops a plan stored by another version, and anything that is not JSON', () => {
    const storage = memoryStorage();
    storage.setItem(PLAN_KEY, JSON.stringify({ v: PLAN_VERSION + 1, plan: { step: 2 } }));
    expect(readPlan(storage)).toBeNull();
    expect(storage.getItem(PLAN_KEY)).toBeNull();
    storage.setItem(PLAN_KEY, JSON.stringify({ step: 2 })); // no version at all
    expect(readPlan(storage)).toBeNull();
    storage.setItem(PLAN_KEY, '{not json');
    expect(readPlan(storage)).toBeNull();
  });

  it('never throws when storage is blocked or missing', () => {
    expect(readPlan(blocked)).toBeNull();
    expect(() => writePlan({ step: 1 }, blocked)).not.toThrow();
    expect(() => clearPlan(blocked)).not.toThrow();
    // No sessionStorage at all (Node here; a locked-down browser): the defaults are looked up inside the try.
    expect(readPlan()).toBeNull();
    expect(() => writePlan({ step: 1 })).not.toThrow();
    expect(() => clearPlan()).not.toThrow();
  });
});

describe('scenario store: the plan survives a refresh (sessionStorage)', () => {
  let storage;
  beforeEach(() => {
    storage = memoryStorage();
    globalThis.sessionStorage = storage;
  });
  afterEach(() => {
    delete globalThis.sessionStorage;
  });
  // A new Pinia is what a refresh gives: the store starts again from blank() and whatever is stored.
  const refresh = () => {
    setActivePinia(createPinia());
    const s = useScenarioStore();
    s.keepInSession();
    return s;
  };

  it('stores nothing until something is entered', () => {
    const s = refresh();
    s.step = 0; // a change that leaves the plan blank
    expect(storage.getItem(PLAN_KEY)).toBeNull();
  });

  it('gives back the same plan after a refresh, with the stepper where it was', () => {
    const s = refresh();
    fillPlan(s);
    const before = s.inputsKey;
    const again = refresh();
    expect(again.profile.applicants[0]).toMatchObject({ age: 30, monthlyIncome: 5000, cpfOaBalance: 40000 });
    expect(again.choiceB).toMatchObject({ town: 'BEDOK', leaseBand: '80-89' });
    expect(again).toMatchObject({ step: 3, furthest: 3, reviewed: true });
    // Same answers; only the applicant ids are new.
    const withoutIds = (key) => key.replace(/applicant-\d+/g, 'id');
    expect(withoutIds(again.inputsKey)).toBe(withoutIds(before));
  });

  it('gives restored buyers new ids, so adding a buyer after a refresh cannot clash', () => {
    const s = refresh();
    fillPlan(s);
    const again = refresh();
    again.addApplicant();
    const ids = again.profile.applicants.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays "saved, nothing changed" after a refresh, and "changed" if it was', () => {
    const s = refresh();
    fillPlan(s);
    s.markSaved('abc', 'Our plan');
    let again = refresh();
    expect(again.savedId).toBe('abc');
    expect(again.savedName).toBe('Our plan');
    expect(again.inputsKey).toBe(again.savedKey);
    again.profile.cashSavings = 30000;
    again = refresh();
    expect(again.savedId).toBe('abc');
    expect(again.inputsKey).not.toBe(again.savedKey);
  });

  it('never stores or restores the saved answers', () => {
    const s = refresh();
    fillPlan(s);
    s.keepSavedProfiles('u1', [{ age: 30 }]);
    expect(storage.getItem(PLAN_KEY)).not.toContain('savedProfiles');
    expect(refresh().savedProfiles).toBeNull();
  });

  it('clears the stored plan on reset (logging out, or Start planning once it is saved)', () => {
    const s = refresh();
    fillPlan(s);
    expect(storage.getItem(PLAN_KEY)).not.toBeNull();
    s.reset();
    expect(storage.getItem(PLAN_KEY)).toBeNull();
    expect(refresh().profile.cashSavings).toBeNull();
  });

  it('keeps the plan when a login expires (auth.logout alone), so it can still be saved after logging in again', () => {
    const s = refresh();
    fillPlan(s);
    useAuthStore().logout();
    expect(refresh().profile.cashSavings).toBe(20000);
  });

  it('starts blank, instead of breaking, from a stored plan with odd or missing parts', () => {
    storage.setItem(PLAN_KEY, JSON.stringify({
      v: PLAN_VERSION,
      plan: { step: 99, aboutPart: -1, wishes: ['parents', 'not-a-wish'], profile: { applicants: 'oops' }, choiceA: null, assumptions: [1] },
    }));
    const s = refresh();
    expect(s.step).toBe(0);
    expect(s.aboutPart).toBe(0);
    expect(s.wishes).toEqual(['parents']);
    expect(s.profile.applicants).toHaveLength(1);
    expect(s.choiceA.path).toBe('BTO');
    expect(s.assumptions.annualPriceGrowth).toBe(0.03);
  });
});
