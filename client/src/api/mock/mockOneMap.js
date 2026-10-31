// MOCK OneMap points for the dashboard's PHG map (VITE_USE_MOCK=true). Not real addresses.
// Town points are rough town centres; postal codes map to made-up points near Bedok.
import { haversineKm } from '../../utils/phgMap.js';

const MOCK_TOWN_POINTS = {
  'JURONG EAST': { lat: 1.3329, lng: 103.7436 },
  TAMPINES: { lat: 1.3496, lng: 103.9568 },
  BEDOK: { lat: 1.3236, lng: 103.9273 },
  PUNGGOL: { lat: 1.3984, lng: 103.9072 },
  SENGKANG: { lat: 1.3868, lng: 103.8914 },
  'ANG MO KIO': { lat: 1.3691, lng: 103.8454 },
  'JURONG WEST': { lat: 1.3404, lng: 103.7090 },
};

const notFound = (message) =>
  Object.assign(new Error(message), { response: { status: 404, data: { error: { code: 'NOT_FOUND', message } } } });

export function mockGeocode(postal) {
  if (postal === '000000') throw notFound('That postal code was not found.');
  // Nudged by the postal code so two different codes give two different points.
  const n = Number(String(postal).slice(-3));
  return { lat: 1.3236 + (n % 40) / 1000, lng: 103.9273 + (n % 50) / 1000, address: `MOCK ADDRESS ${postal}`, mock: true };
}

export function mockTownPoint(town) {
  const p = MOCK_TOWN_POINTS[town] ?? { lat: 1.3521, lng: 103.8198 };
  return { town, ...p, label: town, approximate: true, mock: true };
}

export function mockDistance(from, to) {
  const a = mockGeocode(from);
  const b = mockGeocode(to);
  return { from: a, to: b, km: Math.round(haversineKm(a, b) * 100) / 100, mock: true };
}