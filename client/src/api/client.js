// Axios (MIT) — HTTP client for the Express API.
import axios from 'axios';
import { mockCompare, mockDistance, mockGrants, mockRuleset } from './mock/mockData.js';

// VITE_USE_MOCK=true serves clearly-labelled MOCK data so the UI can be built before the backend exists.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: '/api' });

const toCents = (dollars) => (typeof dollars === 'number' ? Math.round(dollars * 100) : dollars);

// Converts the store's shape (dollars, its own growth-rate field names) into the contract's
// CompareRequest (cents, annualPriceGrowth/annualIncomeGrowth/holdingPeriodYears). This is the
// one conversion boundary D14 describes — nothing else should hand-build a request.
// A choice as the contract wants it: renovation in cents (renovationCents), paid at that choice's keys.
function toChoice(choice) {
  const { renovation, ...rest } = choice;
  return { ...rest, renovationCents: toCents(renovation ?? 0) };
}

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
    choiceA: toChoice(store.choiceA),
    choiceB: toChoice(store.choiceB),
    assumptions: {
      annualPriceGrowth: store.assumptions.priceGrowth,
      annualIncomeGrowth: store.assumptions.incomeGrowth,
      holdingPeriodYears: store.assumptions.horizonYears,
      // Rent (or other housing cost) per month until each path's keys. Optional; 0 = living with parents (D22).
      monthlyHousingCostWhileWaitingCents: toCents(store.assumptions.monthlyHousingCostWhileWaiting ?? 0),
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

export async function grants(payload) {
  if (USE_MOCK) return mockGrants(payload);
  return (await http.post('/grants', payload)).data;
}

// Straight-line distance between two postal codes, with both points (seat 3, GET /api/data/distance).
export async function getDistance(from, to) {
  if (USE_MOCK) return mockDistance(from, to);
  return (await http.get('/data/distance', { params: { from, to } })).data;
}

// TODO: timing() for /api/timing (seat 5), login/register + scenarios (seats 3/4),
// getResalePrice() and getBtoProjects() for /api/data (seat 3). strategy() dropped (future work).