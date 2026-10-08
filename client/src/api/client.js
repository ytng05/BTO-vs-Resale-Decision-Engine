// Axios (MIT) — HTTP client for the Express API.
import axios from 'axios';
import { mockCompare, mockRuleset } from './mock/mockData.js';

// VITE_USE_MOCK=true serves clearly-labelled MOCK data so the UI can be built before the backend exists.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: '/api' });

export async function compare(payload) {
  if (USE_MOCK) return mockCompare(payload);
  return (await http.post('/compare', payload)).data;
}

export async function getRuleset() {
  if (USE_MOCK) return mockRuleset();
  return (await http.get('/ruleset')).data;
}

// TODO (seats 3/4/5): timing(), strategy(), auth, scenarios, data endpoints. See docs/API_CONTRACT.md.