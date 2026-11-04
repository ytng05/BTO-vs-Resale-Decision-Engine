import { describe, expect, it } from 'vitest';
import { grantLine, gridSummary, whySummary } from '../src/utils/resultsSummary.js';

const cell = (winner) => ({ winner, marginCents: 1 });

describe('gridSummary', () => {
  it('turns the grid top-down (highest income growth first) and says BTO wins every combination', () => {
    const grid = [[cell('A'), cell('A')], [cell('A'), cell('B')]]; // row 0 = lowest income growth
    const g = gridSummary(grid);
    expect(g.rows).toEqual([['A', 'B'], ['A', 'A']]);
    expect(g).toMatchObject({ cols: 2, total: 4, a: 3, b: 1 });
    expect(g.line).toBe('BTO is ahead in 3 of the 4 growth combinations we tested, resale in 1.');
    expect(gridSummary([[cell('A'), cell('A')]]).line).toBe('BTO stays ahead in every growth combination we tested.');
    expect(gridSummary([[cell('B')]]).line).toBe('Resale stays ahead in every growth combination we tested.');
  });
  it('says nothing without a grid', () => {
    expect(gridSummary(null)).toMatchObject({ total: 0, line: '' });
  });
});

describe('whySummary', () => {
  const gap = {
    marginCents: 19_102_700,
    lines: [
      { id: 'cash', label: 'Downpayment and instalments paid in cash', amountCents: 26_665_100 },
      { id: 'value', label: 'Flat value', amountCents: -24_965_100 },
      { id: 'loan', label: 'Loan still owed', amountCents: 15_593_500 },
      { id: 'zero', label: 'Clawback', amountCents: 0 },
    ],
  };
  it('names the main reason and what it outweighs, with the amounts rounded', () => {
    const w = whySummary(gap);
    expect(w.title).toBe('Why BTO comes out ahead');
    expect(w.sentence).toBe(
      'BTO comes out ahead mostly on the downpayment and instalments paid in cash: about S$267,000 in its favour. '
      + 'That outweighs the flat value, where resale is ahead by about S$250,000.',
    );
  });
  it('gives each non-zero line a bar on the side it favours, scaled to the biggest', () => {
    const w = whySummary(gap);
    expect(w.rows.map((r) => [r.id, r.side, r.pct])).toEqual([['cash', 'bto', 100], ['value', 'resale', 94], ['loan', 'bto', 58]]);
  });
  it('has no winner or sentence when the paths are level', () => {
    expect(whySummary({ marginCents: 0, lines: [] })).toMatchObject({ winner: null, title: 'Why the gap', sentence: '' });
  });
});

describe('grantLine', () => {
  const g = (id, amountCents, reason) => ({ id, amountCents, tests: reason ? [{ passed: false, reason }] : [{ passed: true }] });
  it('lists what a path gets, by name and amount', () => {
    const line = grantLine({ grants: [g('EHG', 0, 'Income too high.'), g('FAMILY', 8_000_000), g('PHG', 0, 'Not near parents.')] }, 'resale');
    expect(line).toEqual({ paying: [{ id: 'FAMILY', name: 'CPF Housing Grant (Family)', amount: 'S$80,000' }], reason: '', resaleOnly: false });
  });
  it('on a BTO, leaves out the resale-only grants and gives the engine reason when nothing is paid', () => {
    const line = grantLine({ grants: [g('EHG', 0, 'Your household income is above the $9,000 EHG limit.'), g('FAMILY', 0, 'Resale only.'), g('PHG', 0, 'Resale only.')] }, 'bto');
    expect(line).toEqual({ paying: [], reason: 'Your household income is above the $9,000 EHG limit.', resaleOnly: true });
  });
});
