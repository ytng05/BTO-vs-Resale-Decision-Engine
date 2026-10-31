// Axios (MIT) — client for the OneMap routes behind the dashboard's PHG map (D15: display only).
//   GET /api/data/geocode?postal=460123          -> { lat, lng, address, ... }
//   GET /api/data/town-point?town=TAMPINES       -> { town, lat, lng, label, approximate, ... }
//   GET /api/data/distance?from=460123&to=529510 -> { from, to, km, ... }
// Errors come back as { error: { code, message } } (docs/API_CONTRACT.md).
// VITE_USE_MOCK=true serves clearly-labelled MOCK points (mock/mockOneMap.js), like client.js does.
import axios from 'axios';
import { mockDistance, mockGeocode, mockTownPoint } from './mock/mockOneMap.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: '/api' });

export async function geocodePostal(postal) {
  if (USE_MOCK) return mockGeocode(postal);
  const { data } = await http.get('/data/geocode', { params: { postal } });
  return data;
}

export async function getTownPoint(town) {
  if (USE_MOCK) return mockTownPoint(town);
  const { data } = await http.get('/data/town-point', { params: { town } });
  return data;
}

export async function getDistance(from, to) {
  if (USE_MOCK) return mockDistance(from, to);
  const { data } = await http.get('/data/distance', { params: { from, to } });
  return data;
}