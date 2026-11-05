// Keeps the plan in progress in sessionStorage, so refreshing Results or the Dashboard does not lose it.
// sessionStorage, not localStorage: the plan holds incomes and CPF balances, so it goes when the tab closes.
// Only the plan itself is kept: the inputs, where the user is in the stepper and which saved scenario they belong
// to. Never the saved answers offered for autofill (savedProfiles) or the login token (stores/auth.js).
// Storage can be blocked (private browsing, settings) or hold an older shape: every call is best-effort, and a
// stored plan with another VERSION is dropped. Bump VERSION when the store's shape changes in a way that would not
// load (stores/scenario.js lays each stored part over the blank plan, so an added field does not need a bump).

export const PLAN_KEY = 'hdb-app:plan';
export const PLAN_VERSION = 1;

export const PLAN_FIELDS = [
  'step', 'aboutPart', 'furthest', 'reviewed', 'wishes',
  'savedId', 'savedName', 'savedKey',
  'profile', 'choiceA', 'choiceB', 'assumptions',
];

// window.sessionStorage itself throws when storage is blocked, so it is looked up inside each try.
const session = () => globalThis.sessionStorage;

export function pickPlan(state) {
  return Object.fromEntries(PLAN_FIELDS.map((k) => [k, state[k]]));
}

// The stored plan, or null when there is none, it is from another version, or storage can't be read.
export function readPlan(storage) {
  try {
    const s = storage ?? session();
    const raw = s.getItem(PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.v !== PLAN_VERSION || typeof parsed.plan !== 'object' || parsed.plan === null) {
      s.removeItem(PLAN_KEY);
      return null;
    }
    return parsed.plan;
  } catch {
    return null;
  }
}

export function writePlan(state, storage) {
  try {
    (storage ?? session()).setItem(PLAN_KEY, JSON.stringify({ v: PLAN_VERSION, plan: pickPlan(state) }));
  } catch {
    // Full or blocked: the plan still works for this page's lifetime.
  }
}

export function clearPlan(storage) {
  try {
    (storage ?? session()).removeItem(PLAN_KEY);
  } catch {
    // Blocked: nothing was stored.
  }
}
