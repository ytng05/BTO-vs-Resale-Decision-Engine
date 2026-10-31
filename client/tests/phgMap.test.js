import { describe, expect, it } from 'vitest';
import { formatKm, haversineKm, isValidPostal, phgCheck, PHG_RADIUS_KM } from '../src/utils/phgMap.js';

describe('PHG map helpers (display only, D15)', () => {
  it('accepts only 6-digit postal codes', () => {
    expect(isValidPostal('460123')).toBe(true);
    expect(isValidPostal(' 460123 ')).toBe(true);
    expect(isValidPostal('46012')).toBe(false);
    expect(isValidPostal('46012a')).toBe(false);
    expect(isValidPostal('')).toBe(false);
    expect(isValidPostal(null)).toBe(false);
  });

  it('measures zero for the same point and is symmetric', () => {
    const a = { lat: 1.3521, lng: 103.8198 };
    const b = { lat: 1.3496, lng: 103.9568 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it('gives about 111 km for one degree of latitude (sanity check on the formula)', () => {
    expect(haversineKm({ lat: 0, lng: 103 }, { lat: 1, lng: 103 })).toBeCloseTo(111.19, 1);
  });

  it('returns null when a point is missing, so no distance is shown', () => {
    expect(haversineKm({ lat: 1.35, lng: 103.8 }, null)).toBeNull();
    expect(haversineKm({ lat: 1.35 }, { lat: 1.35, lng: 103.8 })).toBeNull();
    expect(phgCheck('NEAR', null)).toBeNull();
  });

  it('formats km to one decimal place', () => {
    expect(formatKm(3.26)).toBe('3.3 km');
    expect(formatKm(4)).toBe('4.0 km');
  });

  it('agrees with a NEAR answer inside 4 km, including exactly 4 km', () => {
    expect(phgCheck('NEAR', 2.5).tone).toBe('success');
    expect(phgCheck('NEAR', PHG_RADIUS_KM).tone).toBe('success');
  });

  it('warns when a NEAR answer is more than 4 km away', () => {
    const c = phgCheck('NEAR', 4.01);
    expect(c.tone).toBe('warning');
    expect(c.text).toMatch(/check your answer/);
  });

  it('only suggests (never changes) the answer when NONE is inside 4 km', () => {
    const c = phgCheck('NONE', 1.2);
    expect(c.tone).toBe('info');
    expect(c.text).toMatch(/update your answer/);
  });

  it('says distance does not matter when living with parents', () => {
    expect(phgCheck('WITH', 9).text).toMatch(/does not affect/);
  });

  it('says when the distance is only to the town centre', () => {
    expect(phgCheck('NEAR', 2, true).text).toMatch(/town centre/);
    expect(phgCheck('NEAR', 2, false).text).not.toMatch(/town centre/);
  });
});