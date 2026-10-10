// Axios (MIT) — HTTP client for the Express API.
import axios from 'axios';
import { mockCompare, mockGrants, mockRuleset, mockBtoProjects, mockResalePrice, mockRpi } from './mock/mockData.js';

// VITE_USE_MOCK=true serves clearly-labelled MOCK data so the UI can be built before the backend exists.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: '/api' });

const toCents = (dollars) => (typeof dollars === 'number' ? Math.round(dollars * 100) : dollars);

// Converts the store's shape (dollars, its own growth-rate field names) into the contract's
// CompareRequest (cents, annualPriceGrowth/annualIncomeGrowth/holdingPeriodYears). This is the
// one conversion boundary D14 describes — nothing else should hand-build a request.
export function toCompareRequest(store) {
  return {
    profile: {
      applicants: store.profile.applicants.map((a) => ({
        age: a.age,
        citizenship: a.citizenship,
        firstTimer: a.firstTimer,
        monthlyIncomeCents: toCents(a.monthlyIncome),
        cpfOaBalanceCents: toCents(a.cpfOaBalance),
      })),
      cashSavingsCents: toCents(store.profile.cashSavings),
    },
    choiceA: { ...store.choiceA },
    choiceB: { ...store.choiceB },
    assumptions: {
      annualPriceGrowth: store.assumptions.priceGrowth,
      annualIncomeGrowth: store.assumptions.incomeGrowth,
      holdingPeriodYears: store.assumptions.horizonYears,
    },
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

// TODO (seats 3/4/5): timing(), strategy(), auth, scenarios, data endpoints. See docs/API_CONTRACT.md.

export async function getBtoProjects(params = {}) {
  if (USE_MOCK) return mockBtoProjects();
  return (await http.get('/data/bto-projects', { params })).data;
}

export async function getResalePrice(params) {
  if (USE_MOCK) return mockResalePrice();
  return (await http.get('/data/resale-price', { params })).data;
}

export async function getRpi(params = {}) {
  if (USE_MOCK) return mockRpi();
  return (await http.get('/data/rpi', { params })).data;
}
export async function grants(payload) {
  if (USE_MOCK) return mockGrants(payload);
  return (await http.post('/grants', payload)).data;
}


// ---- Auth and saved scenarios ----
// No mock versions: these always call the real API (run `npm run dev` with MONGODB_URI set).

// The token from login/register, kept in localStorage so a page refresh keeps the user logged in.
// try/catch because storage can be blocked (private windows, strict browser settings).
const TOKEN_KEY = 'bto-auth-token';
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* stays logged in until refresh */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing stored */ }
  },
};

// Attach the token to every API request when there is one.
http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function register(email, password) {
  return (await http.post('/auth/register', { email, password })).data;
}

export async function login(email, password) {
  return (await http.post('/auth/login', { email, password })).data;
}

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
