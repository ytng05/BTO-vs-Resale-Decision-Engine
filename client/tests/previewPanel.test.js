import { describe, expect, it } from 'vitest';
import { previewFit } from '../src/utils/previewFit.js';
import { previewPanel } from '../src/utils/previewPanel.js';

// What the results teaser's panel says (D43): one path fits better, a split, about the same, or no comparison.
const row = (key, verdict, reason = verdict ? 'clear-gap' : 'within-threshold') => ({ key, verdict, tie: verdict ? null : 'same', reason });
const noComparison = (key, reason) => ({ key, verdict: null, tie: 'neutral', reason });

describe('previewPanel', () => {
  it('names the path that wins every pick with a winner', () => {
    expect(previewPanel([row('monthly', 'resale'), row('cash', 'resale')])).toEqual({
      outcome: 'resale',
      title: 'Resale fits you better',
      sub: 'Ahead on both your priorities',
      summary: 'The full comparison adds up everything over time, so BTO can still end ahead.',
    });
    expect(previewPanel([row('cash', 'bto')])).toMatchObject({ outcome: 'bto', title: 'BTO fits you better', sub: 'Ahead on your priority' });
    expect(previewPanel([row('cash', 'bto'), row('monthly', 'bto'), row('moveby', 'bto', 'earlier-keys')]).sub).toBe('Ahead on all 3 of your priorities');
  });

  it("doesn't count a tie against the winner", () => {
    expect(previewPanel([row('moveby', 'resale', 'only-one-makes-date'), row('cash', null)])).toMatchObject({
      outcome: 'resale', sub: 'Ahead on 1 of your 2 priorities',
    });
  });

  it('on a split, says each wins on something, one sentence per path, BTO first', () => {
    expect(previewPanel([row('moveby', 'resale', 'earlier-keys'), row('cash', 'bto')])).toEqual({
      outcome: 'split',
      title: 'BTO and resale each win on something',
      sub: 'Based on what matters to you',
      summary: 'BTO keeps more cash in hand. Resale gets you the keys sooner.',
    });
  });

  it('joins two wins for one path, and names the move-in year when only one path makes it', () => {
    const panel = previewPanel([row('cash', 'bto'), row('monthly', 'bto'), row('moveby', 'resale', 'only-one-makes-date')], { moveInBy: 2029 });
    expect(panel.summary).toBe('BTO keeps more cash in hand and needs a smaller loan. Resale gets you the keys by your 2029.');
  });

  it('says a win is only about the picks, naming the path that can still end ahead', () => {
    expect(previewPanel([row('cash', 'bto')]).summary).toBe('The full comparison adds up everything over time, so resale can still end ahead.');
  });

  it('says they come out about the same on the picks, not overall, when every pick is a real tie', () => {
    expect(previewPanel([row('cash', null), row('monthly', null)])).toEqual({
      outcome: 'even',
      title: 'BTO and resale come out about the same on your priorities',
      sub: null,
      summary: 'The full comparison adds up everything over time, so one path can still end ahead.',
    });
    expect(previewPanel([row('moveby', null, 'both-make-date')]).title).toBe('BTO and resale come out about the same on your priority');
  });

  it("gives no verdict, and never says \"about the same\", when there's no fair comparison", () => {
    expect(previewPanel([noComparison('cash', 'bto-ineligible')])).toEqual({
      outcome: 'none',
      title: "We can't compare these here",
      sub: null,
      summary: "BTO isn't open to you on these answers: your household income, projected to the year you apply, would be above the ceiling for a new flat. The full comparison explains this.",
    });
    expect(previewPanel([noComparison('cash', 'resale-ineligible')]).summary).toContain("Resale isn't open to you");
    expect(previewPanel([noComparison('cash', 'both-ineligible')]).summary).toContain('Neither path is open to you');
    expect(previewPanel([noComparison('cash', 'missing-figure')]).summary).toContain('Some of the figures are missing');
    // One real tie doesn't turn a missing figure into "about the same".
    expect(previewPanel([row('monthly', null), noComparison('cash', 'missing-figure')]).outcome).toBe('none');
  });

  it('with the real rule: a BTO over the income ceiling gets no verdict on any pick', () => {
    const bto = { warnings: ['INCOME_CEILING_BREACHED_AT_PURCHASE'], timeline: { keyCollectionDate: '2028-12-01' }, cashRequiredAtPurchaseCents: 7248000, loanPrincipalCents: 41753600 };
    const resale = { warnings: [], timeline: { keyCollectionDate: '2027-01-01' }, cashRequiredAtPurchaseCents: 8291400, loanPrincipalCents: 64503700 };
    const rows = ['moveby', 'cash', 'monthly'].map((key) => ({ key, ...previewFit(key, bto, resale, { moveInBy: 2032, currentYear: 2026 }) }));
    expect(previewPanel(rows, { moveInBy: 2032 })).toMatchObject({ outcome: 'none', title: "We can't compare these here" });
  });
});
