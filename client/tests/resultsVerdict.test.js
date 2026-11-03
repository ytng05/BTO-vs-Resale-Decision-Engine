import { describe, expect, it } from 'vitest';
import { barShares, CLOSE_SHARE, durationText, keyRows, reasonLine, verdict } from '../src/utils/resultsVerdict.js';

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

  it('treats exactly CLOSE_SHARE as close, and a little more as a clear lead', () => {
    expect(CLOSE_SHARE).toBe(0.02);
    expect(verdict(out(30_000_000), out(29_400_000), 2041).close).toBe(true); // S$6,000 on S$300,000 = 2%
    expect(verdict(out(30_000_000), out(29_300_000), 2041).close).toBe(false); // S$7,000 = 2.3%
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
    expect(rows.grants.better).toBe(null); // grants are already in net position (D1): never tagged
    expect(rows.cash.better).toBe('a'); // lower cash up front is better
    expect(rows.keys.better).toBe('b'); // earlier keys are better
  });

  it('formats money and key dates', () => {
    const rows = Object.fromEntries(keyRows(a, b, 2041).map((r) => [r.id, r]));
    expect(rows.position.a).toBe('S$185,000');
    expect(rows.position.label).toBe('Net position in 2041');
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

describe('difference text, reason line and bars', () => {
  const a = out(18_500_000, { totalGrantsCents: 3_000_000, cashRequiredAtPurchaseCents: 4_500_000, timeline: { keyCollectionDate: '2031-05-01' } });
  const b = out(17_200_000, { totalGrantsCents: 13_000_000, cashRequiredAtPurchaseCents: 4_500_000, timeline: { keyCollectionDate: '2027-01-15' } });
  const rows = keyRows(a, b, 2041);
  const row = (id) => rows.find((r) => r.id === id);

  it('says how far apart each row is, and who is ahead on it', () => {
    expect(row('position')).toMatchObject({ diffLead: 'S$13,000', diffRest: 'more with BTO' });
    expect(row('grants')).toMatchObject({ diffLead: 'S$100,000', diffRest: 'more with Resale' });
    expect(row('keys')).toMatchObject({ diffLead: '4 years 4 months', diffRest: 'sooner with Resale', months: 52 });
  });

  it('still says how far apart the grants are, as a fact, without calling either side better', () => {
    expect(row('grants').better).toBe(null);
    expect(row('grants')).toMatchObject({ diffLead: 'S$100,000', diffRest: 'more with Resale' });
  });

  it('treats keys in the same month as the same, with no Better tag and no "0 months sooner"', () => {
    const early = out(18_500_000, { timeline: { keyCollectionDate: '2027-01-01' } });
    const late = out(17_200_000, { timeline: { keyCollectionDate: '2027-01-15' } });
    const r = keyRows(early, late, 2041).find((x) => x.id === 'keys');
    expect(r).toMatchObject({ better: null, diffLead: '', diffRest: 'Same for both', months: 0 });
    expect(reasonLine(keyRows(early, late, 2041), verdict(early, late, 2041))).not.toMatch(/keys/);
  });

  it('says "Same for both" when a row is equal, with nothing to bold', () => {
    expect(row('cash')).toMatchObject({ diffLead: '', diffRest: 'Same for both' });
  });

  it('says "less" for cash, where lower is better', () => {
    const r = keyRows(out(1, { cashRequiredAtPurchaseCents: 3_000_000 }), out(1, { cashRequiredAtPurchaseCents: 4_500_000 }), 2041).find((x) => x.id === 'cash');
    expect(r).toMatchObject({ diffLead: 'S$15,000', diffRest: 'less with BTO' });
  });

  it('formats a duration in years and months', () => {
    expect(durationText(52)).toBe('4 years 4 months');
    expect(durationText(12)).toBe('1 year');
    expect(durationText(7)).toBe('7 months');
    expect(durationText(1)).toBe('1 month');
    expect(durationText(0)).toBe('0 months');
  });

  it('never gives grants as a reason, since they are already in net position (D1)', () => {
    const behind = out(10, { totalGrantsCents: 9_000_000 });
    const ahead = out(99_000_000, { totalGrantsCents: 1_000_000 });
    expect(reasonLine(keyRows(behind, ahead, 2041), verdict(behind, ahead, 2041))).toBe('');
  });

  it('gives the reason the path that is behind still has going for it', () => {
    const v = verdict(a, b, 2041);
    expect(reasonLine(rows, v)).toBe('Resale gets you the keys about 4 years sooner.');
  });

  it('lists three things with commas, and says months when the keys gap is under a year', () => {
    const behind = out(10, { totalGrantsCents: 9_000_000, cashRequiredAtPurchaseCents: 1_000_000, timeline: { keyCollectionDate: '2027-01-01' } });
    const ahead = out(99_000_000, { totalGrantsCents: 1_000_000, cashRequiredAtPurchaseCents: 5_000_000, timeline: { keyCollectionDate: '2027-08-01' } });
    const text = reasonLine(keyRows(behind, ahead, 2041), verdict(behind, ahead, 2041));
    expect(text).toBe('BTO gets you a smaller cash payment up front and the keys 7 months sooner.');
  });

  it('says nothing when the path that is behind is not better at anything else', () => {
    const behind = out(1_000_000);
    const ahead = out(9_000_000);
    expect(reasonLine(keyRows(behind, ahead, 2041), verdict(behind, ahead, 2041))).toBe('');
  });

  it('says the gap is small, not who is ahead, when too close to call; and "about the same" when level', () => {
    const close = verdict(out(30_000_000), out(29_600_000), 2041);
    expect(reasonLine(rows, close)).toBe('The gap is small enough that your assumptions could change who ends ahead.');
    expect(reasonLine(rows, verdict(out(5), out(5), 2041))).toBe('Both paths leave you in about the same place.');
    expect(reasonLine(rows, verdict(null, out(1), 2041))).toBe('');
  });

  it('writes the difference line, and calls a close gap too small to call', () => {
    expect(verdict(a, b, 2041).diffLine).toBe('Difference: S$13,000 in favour of BTO.');
    expect(verdict(out(30_000_000), out(29_600_000), 2041).diffLine).toBe('Difference: S$4,000 in favour of BTO, too small to call.');
  });

  it('scales the bars to the larger position, from zero', () => {
    expect(barShares(18_500_000, 17_200_000)).toEqual({ a: 100, b: 93 });
    expect(barShares(-5_000, 10_000)).toEqual({ a: 0, b: 100 });
    expect(barShares(1, 10_000_000)).toEqual({ a: 2, b: 100 });
    expect(barShares(0, 0)).toEqual({ a: 0, b: 0 });
    expect(barShares(null, 5)).toEqual({ a: 0, b: 0 });
  });
});
