// Axios (MIT) — HTTP client for the Express API.
import axios from 'axios';
import {
  mockBtoProjects, mockCompare, mockGrants, mockLogin, mockRegister, mockResalePrice, mockRpi, mockRuleset, mockTiming,
} from './mock/mockData.js';

// VITE_USE_MOCK=true serves clearly-labelled MOCK data so the UI can be built before the backend exists.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: '/api' });

const toCents = (dollars) => (typeof dollars === 'number' ? Math.round(dollars * 100) : dollars);
const isSet = (v) => v !== null && v !== undefined && v !== '';
// Leaves out optional fields the user did not fill in, so the server applies its own defaults.
const withoutUnset = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => isSet(v)));

// One choice as the contract's RequestChoice: dollars become …Cents (renovationCents, btoPriceCents,
// resalePriceCents).
function toRequestChoice(choice) {
  const { btoPrice, resalePrice, renovation, ...rest } = choice;
  return withoutUnset({
    ...rest,
    btoPriceCents: isSet(btoPrice) ? toCents(btoPrice) : null,
    resalePriceCents: isSet(resalePrice) ? toCents(resalePrice) : null,
    renovationCents: toCents(renovation ?? 0),
  });
}

// Converts the store's shape (dollars) into the contract's CompareRequest (cents), contract v2/v2.1.
// This is the one conversion boundary D14 describes — nothing else should hand-build a request.
export function toCompareRequest(store) {
  const a = store.assumptions;
  return {
    profile: {
      applicants: store.profile.applicants.map((p) => ({
        age: p.age,
        citizenship: p.citizenship,
        firstTimer: p.firstTimer,
        monthlyIncomeCents: toCents(p.monthlyIncome),
        cpfOaBalanceCents: toCents(p.cpfOaBalance),
      })),
      cashSavingsCents: toCents(store.profile.cashSavings),
      constraints: withoutUnset({ moveInByYear: store.profile.constraints?.moveInByYear }),
    },
    choiceA: toRequestChoice(store.choiceA),
    choiceB: toRequestChoice(store.choiceB),
    assumptions: withoutUnset({
      annualPriceGrowth: a.annualPriceGrowth,
      annualIncomeGrowth: a.annualIncomeGrowth,
      horizonYear: a.horizonYear,
      // Rent until keys, both paths; 0 = living with parents (D1, D22).
      monthlyHousingCostWhileWaitingCents: toCents(a.monthlyHousingCostWhileWaiting ?? 0),
      loanTenureYears: a.loanTenureYears,
      loanType: a.loanType,
      legalFeesCents: isSet(a.legalFees) ? toCents(a.legalFees) : null,
      agentFeesCents: isSet(a.agentFees) ? toCents(a.agentFees) : null,
    }),
  };
}

export async function compare(store) {
  const payload = toCompareRequest(store);
  if (USE_MOCK) return mockCompare(payload);
  return (await http.post('/compare', payload)).data;
}

export async function getRuleset() {
  if (USE_MOCK) return mockRuleset();
  return (await http.get('/ruleset')).data;
}

// { name?, email, password } -> { token, user }. See docs/API_CONTRACT.md "POST /api/auth/register".
export async function register(payload) {
  if (USE_MOCK) return mockRegister(payload);
  return (await http.post('/auth/register', payload)).data;
}

// { email, password } -> { token, user }. See docs/API_CONTRACT.md "POST /api/auth/login".
export async function login(payload) {
  if (USE_MOCK) return mockLogin(payload);
  return (await http.post('/auth/login', payload)).data;
}

// Seeded BTO projects (seat 3, GET /api/data/bto-projects). Filters are optional:
// { town, flatType, classification }. Returns { projects, towns, dataAsOf, ... }; prices in cents.
export async function getBtoProjects(filters = {}) {
  if (USE_MOCK) return mockBtoProjects(filters);
  return (await http.get('/data/bto-projects', { params: filters })).data;
}

// Resale price summary for a town + flat type (seat 3, GET /api/data/resale-price).
export async function getResalePrice(params) {
  if (USE_MOCK) return mockResalePrice(params);
  return (await http.get('/data/resale-price', { params })).data;
}

// Resale Price Index series (seat 3, GET /api/data/rpi).
export async function getRpi(params = {}) {
  if (USE_MOCK) return mockRpi();
  return (await http.get('/data/rpi', { params })).data;
}

export async function grants(payload) {
  if (USE_MOCK) return mockGrants(payload);
  return (await http.post('/grants', payload)).data;
}

// Onboarding's early EHG estimate (D38): the household as typed so far, applying for a BTO flat in the plan's
// application year. Ages and incomes are projected to that year as evaluate() projects them for the grants
// (income grown at the plan's income growth, rounded to the cent), so this matches the grant on Results.
// The flat isn't chosen yet, so it uses the BTO choice so far (4-room Standard if blank); the EHG doesn't
// depend on the town. Returns the grants response plus { applicationYear, years }.
export async function ehgEstimate(store) {
  const a = store.choiceA;
  const thisYear = new Date().getFullYear();
  const applicationYear = a.applicationYear ?? thisYear + 1;
  const years = Math.max(0, applicationYear - thisYear);
  const growth = (1 + (store.assumptions.annualIncomeGrowth ?? 0)) ** years;
  const res = await grants({
    profile: {
      applicants: store.profile.applicants.map((p) => ({
        age: typeof p.age === 'number' ? p.age + years : p.age,
        citizenship: p.citizenship,
        firstTimer: p.firstTimer,
        monthlyIncomeCents: typeof p.monthlyIncome === 'number' ? Math.round(toCents(p.monthlyIncome) * growth) : p.monthlyIncome,
        cpfOaBalanceCents: toCents(p.cpfOaBalance ?? 0),
      })),
      cashSavingsCents: toCents(store.profile.cashSavings ?? 0),
    },
    choice: withoutUnset({
      path: 'BTO',
      applicationYear,
      town: a.town,
      flatType: a.flatType ?? '4 ROOM',
      classification: a.classification ?? 'STANDARD',
    }),
  });
  return { ...res, applicationYear, years };
}

// Converts the store's shape into the /api/timing TimingRequest (contract "POST /api/timing").
// choiceKey picks which stored choice ('choiceA' | 'choiceB') to search timing for — its
// applicationYear is ignored server-side since candidateYears sweeps that instead.
export function toTimingRequest(store, choiceKey = 'choiceA', candidateYears) {
  const a = store.assumptions;
  return withoutUnset({
    profile: {
      applicants: store.profile.applicants.map((p) => ({
        age: p.age,
        citizenship: p.citizenship,
        firstTimer: p.firstTimer,
        monthlyIncomeCents: toCents(p.monthlyIncome),
        cpfOaBalanceCents: toCents(p.cpfOaBalance),
      })),
      cashSavingsCents: toCents(store.profile.cashSavings),
      constraints: withoutUnset({ moveInByYear: store.profile.constraints?.moveInByYear }),
    },
    choiceBase: toRequestChoice(store[choiceKey]),
    candidateYears,
    assumptions: withoutUnset({
      annualPriceGrowth: a.annualPriceGrowth,
      annualIncomeGrowth: a.annualIncomeGrowth,
      horizonYear: a.horizonYear,
      monthlyHousingCostWhileWaitingCents: toCents(a.monthlyHousingCostWhileWaiting ?? 0),
      loanTenureYears: a.loanTenureYears,
      loanType: a.loanType,
      legalFeesCents: isSet(a.legalFees) ? toCents(a.legalFees) : null,
      agentFeesCents: isSet(a.agentFees) ? toCents(a.agentFees) : null,
    }),
  });
}

// (store, 'choiceA' | 'choiceB', candidateYears?) -> TimingResponse. See docs/API_CONTRACT.md "POST /api/timing".
export async function timing(store, choiceKey = 'choiceA', candidateYears) {
  const payload = toTimingRequest(store, choiceKey, candidateYears);
  if (USE_MOCK) return mockTiming(payload);
  return (await http.post('/timing', payload)).data;
}

// ---- Saved scenarios (seat 3) ----
// No mock versions: these always call the real API (run `npm run dev` with MONGODB_URI set).

// Attach the logged-in user's token to every API request. stores/auth.js (seat 4) saves
// { token, user } under this key; the server needs the token on /api/scenarios* and /api/auth/me.
const AUTH_STORAGE_KEY = 'hdb-app:auth';
function storedToken() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))?.token ?? null;
  } catch {
    return null; // storage blocked or corrupt: send the request without a token
  }
}

http.interceptors.request.use((config) => {
  const token = storedToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getMe() {
  return (await http.get('/auth/me')).data;
}

export async function listScenarios() {
  return (await http.get('/scenarios')).data;
}

// payload: { name, profile, choiceA, choiceB, assumptions, result? }, in the store's shape
export async function saveScenario(payload) {
  return (await http.post('/scenarios', payload)).data;
}

export async function getScenario(id) {
  return (await http.get(`/scenarios/${encodeURIComponent(id)}`)).data;
}

export async function deleteScenario(id) {
  await http.delete(`/scenarios/${encodeURIComponent(id)}`);
}
