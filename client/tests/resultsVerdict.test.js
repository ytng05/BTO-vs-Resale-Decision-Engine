import { describe, expect, it } from 'vitest';
import { keyRows, verdict } from '../src/utils/resultsVerdict.js';

const out = (net, extra = {}) => ({ netPositionCents: net, ...extra });

describe('verdict', () => {
  it('names BTO when path A ends ahead, with the gap rounded to S$1,000', () => {
    const v = verdict(out(18_500_000), out(17_212_300), 2041);
    expect(v.winner).toBe('bto');
    expect(v.roundedDollars).toBe(13000);
    expect(v.headline).toBe('BTO leaves you about S$13,000 better off by 2041');
  });

  it('names resale when path B ends ahead', () => {
    const v = verdict(out(10_000_000), out(25_000_000), 2038);
    expect(v.winner).toBe('resale');
    expect(v.headline).toBe('Resale leaves you about S$150,000 better off by 2038');
  });

  it('says "about the same" when the gap rounds to nothing', () => {
    expect(verdict(out(18_500_000), out(18_500_000), 2041).winner).toBe('level');
    expect(verdict(out(18_500_000), out(18_480_000), 2041).headline).toBe('BTO and resale leave you about the same by 2041');
  });

  it('says "too close to call" when the gap is under 2% of the larger position', () => {
    const v = verdict(out(30_000_000), out(29_600_000), 2041); // S$4,000 on S$300,000
    expect(v.close).toBe(true);
    expect(v.headline).toBe('Too close to call: BTO is only about S$4,000 ahead by 2041');
  });

  it('leaves the year out when there is none, and never says profit', () => {
    const v = verdict(out(18_500_000), out(17_000_000), null);
    expect(v.headline).toBe('BTO leaves you about S$15,000 better off');
    expect(v.headline.toLowerCase()).not.toContain('profit');
  });

  it('returns an empty verdict when an outcome is missing', () => {
    expect(verdict(null, out(1), 2041)).toMatchObject({ winner: null, headline: '' });
  });
});

describe('keyRows', () => {
  const a = out(18_500_000, { totalGrantsCents: 3_000_000, cashRequiredAtPurchaseCents: 4_500_000, timeline: { keyCollectionDate: '2031-05-01' } });
  const b = out(17_200_000, { totalGrantsCents: 13_000_000, cashRequiredAtPurchaseCents: 9_000_000, timeline: { keyCollectionDate: '2027-01-15' } });

  it('marks the better side of each row', () => {
    const rows = Object.fromEntries(keyRows(a, b, 2041).map((r) => [r.id, r]));
    expect(rows.position.better).toBe('a');
    expect(rows.grants.better).toBe('b');
    expect(rows.cash.better).toBe('a'); // lower cash up front is better
    expect(rows.keys.better).toBe('b'); // earlier keys are better
  });

  it('formats money and key dates', () => {
    const rows = Object.fromEntries(keyRows(a, b, 2041).map((r) => [r.id, r]));
    expect(rows.position.a).toBe('S$185,000');
    expect(rows.position.label).toBe('Your total position in 2041');
    expect(rows.keys.a).toBe('May 2031');
    expect(rows.keys.b).toBe('Jan 2027');
  });

  it('marks nothing when a side is equal or missing', () => {
    const rows = Object.fromEntries(keyRows(out(1), out(1), 2041).map((r) => [r.id, r]));
    expect(rows.position.better).toBe(null);
    expect(rows.grants.a).toBe('—');
    expect(rows.keys.better).toBe(null);
  });
});
