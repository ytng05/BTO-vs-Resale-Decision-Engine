// Pure helpers for the dashboard's PHG map (D15: the map is DISPLAY-ONLY).
// PHG eligibility stays what the user declared in the plan (choiceB.livingArrangement);
// nothing here changes it. These helpers only say whether the map agrees with the answer.

export const PHG_RADIUS_KM = 4;
const POSTAL = /^\d{6}$/;

export const isValidPostal = (value) => POSTAL.test(String(value ?? '').trim());

// Straight-line distance between two { lat, lng } points, in km (same formula as the server's
// haversineKm in services/onemap/client.js). Returns null if either point is missing.
export function haversineKm(a, b) {
  if (!isPoint(a) || !isPoint(b)) return null;
  const R = 6371;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isPoint(p) {
  return p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

// "3.2 km"
export const formatKm = (km) => `${(Math.round(km * 10) / 10).toFixed(1)} km`;

/**
 * Compares the declared living arrangement with a measured distance.
 * @param {'WITH'|'NEAR'|'NONE'} declared  choiceB.livingArrangement
 * @param {number|null} km                 distance from the parents' home
 * @param {boolean} approximate            true when measured to the town centre, not a flat
 * @returns {{ tone: 'success'|'warning'|'info', text: string } | null}
 */
export function phgCheck(declared, km, approximate = false) {
  if (typeof km !== 'number' || !Number.isFinite(km)) return null;
  const inside = km <= PHG_RADIUS_KM;
  const where = approximate ? 'The resale town centre' : 'The resale flat';
  const dist = formatKm(km);

  if (declared === 'WITH') {
    return { tone: 'info', text: `You said you will live with your parents, so the distance does not affect the PHG.` };
  }
  if (declared === 'NEAR') {
    return inside
      ? { tone: 'success', text: `${where} is ${dist} from your parents, within ${PHG_RADIUS_KM} km. This matches your answer.` }
      : { tone: 'warning', text: `${where} is ${dist} from your parents, more than ${PHG_RADIUS_KM} km. You said you will live near them: check your answer in the plan.` };
  }
  return inside
    ? { tone: 'info', text: `${where} is ${dist} from your parents, within ${PHG_RADIUS_KM} km. If you will live near them, you may qualify for the PHG: update your answer in the plan.` }
    : { tone: 'info', text: `${where} is ${dist} from your parents, more than ${PHG_RADIUS_KM} km.${roughNote}` };
}