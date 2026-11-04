import { describe, expect, it } from 'vitest';
import { fitVerdict, previewFit } from '../src/utils/previewFit.js';

// Seat 1's "fits better" rule for the results teaser (D43).
const ok = (fields) => ({ eligible: true, ...fields });
const NOW = { currentYear: 2026 };

describe('fitVerdict: moving in by a date', () => {
  const keys = (bto, resale, moveInYear) => fitVerdict('moveIn', ok({ keysYear: bto }), ok({ keysYear: resale }), { ...NOW, moveInYear });

  it('is the same when both paths have keys in the same year', () => {
    expect(keys(2030, 2030, 2029)).toEqual({ verdict: null, tie: 'same', reason: 'same-keys-year' });
  });
  it('goes to the earlier keys when there is no move-in year, or it is in the past', () => {
    expect(keys(2031, 2027)).toMatchObject({ verdict: 'resale', reason: 'earlier-keys' });
    expect(keys(2027, 2031, 2025)).toMatchObject({ verdict: 'bto', reason: 'earlier-keys' });
  });
  it('is the same when both make the move-in year', () => {
    expect(keys(2028, 2027, 2029)).toMatchObject({ verdict: null, tie: 'same', reason: 'both-make-date' });
  });
  it('goes to the only path that makes the move-in year (the year itself counts)', () => {
    expect(keys(2031, 2029, 2029)).toMatchObject({ verdict: 'resale', reason: 'only-one-makes-date' });
  });
  it('goes to the closer path when neither makes it', () => {
    expect(keys(2031, 2030, 2028)).toMatchObject({ verdict: 'resale', reason: 'neither-makes-date' });
  });
  it('is neutral when a keys year is missing', () => {
    expect(keys(undefined, 2027, 2029)).toMatchObject({ verdict: null, tie: 'neutral', reason: 'missing-figure' });
  });
});

describe('fitVerdict: cash and loan', () => {
  const cash = (bto, resale) => fitVerdict('cash', ok({ cashAtPurchase: bto }), ok({ cashAtPurchase: resale }), NOW);
  const loan = (bto, resale) => fitVerdict('loan', ok({ loanAmount: bto }), ok({ loanAmount: resale }), NOW);

  it('goes to the lower cash figure only when the gap is at least S$5,000 and 10% of the larger', () => {
    expect(cash(40000, 50000)).toMatchObject({ verdict: 'bto', reason: 'clear-gap' }); // S$10k, 20%
    expect(cash(45000, 49000)).toMatchObject({ verdict: null, tie: 'same' }); // S$4k
    expect(cash(100000, 106000)).toMatchObject({ verdict: null, tie: 'same' }); // S$6k but 5.7%
  });
  it('goes to the smaller loan only when the gap is at least S$20,000 and 5% of the larger', () => {
    expect(loan(500000, 400000)).toMatchObject({ verdict: 'resale', reason: 'clear-gap' });
    expect(loan(500000, 485000)).toMatchObject({ verdict: null, tie: 'same', reason: 'within-threshold' });
    expect(loan(1000000, 970000)).toMatchObject({ verdict: null, tie: 'same' }); // S$30k but 3%
  });
  it('is neutral when a figure is missing', () => {
    expect(cash(null, 50000)).toMatchObject({ tie: 'neutral', reason: 'missing-figure' });
  });
});

describe('fitVerdict: eligibility', () => {
  it('names no path when either cannot be bought', () => {
    const no = { eligible: false, cashAtPurchase: 1 };
    const yes = ok({ cashAtPurchase: 90000 });
    expect(fitVerdict('cash', no, yes, NOW)).toMatchObject({ tie: 'neutral', reason: 'bto-ineligible' });
    expect(fitVerdict('cash', yes, no, NOW)).toMatchObject({ tie: 'neutral', reason: 'resale-ineligible' });
    expect(fitVerdict('cash', no, no, NOW)).toMatchObject({ tie: 'neutral', reason: 'both-ineligible' });
  });
});

describe('previewFit: from engine outcomes', () => {
  const outcome = (fields = {}) => ({
    timeline: { keyCollectionDate: '2031-05-01' }, cashRequiredAtPurchaseCents: 4_000_000, loanPrincipalCents: 40_000_000, warnings: [], ...fields,
  });

  it('maps the teaser picks and turns cents into dollars', () => {
    const resale = outcome({ timeline: { keyCollectionDate: '2027-01-01' }, cashRequiredAtPurchaseCents: 6_000_000, loanPrincipalCents: 50_000_000 });
    expect(previewFit('moveby', outcome(), resale, { moveInBy: 2029, currentYear: 2026 })).toMatchObject({ verdict: 'resale', reason: 'only-one-makes-date' });
    expect(previewFit('cash', outcome(), resale, { currentYear: 2026 })).toMatchObject({ verdict: 'bto' }); // S$40k vs S$60k
    expect(previewFit('monthly', outcome(), resale, { currentYear: 2026 })).toMatchObject({ verdict: 'bto' }); // S$400k vs S$500k
  });
  it('treats a BTO over the income ceiling as ineligible, but not a cash shortfall', () => {
    const resale = outcome({ cashRequiredAtPurchaseCents: 9_000_000 });
    expect(previewFit('cash', outcome({ warnings: ['INCOME_CEILING_BREACHED_AT_PURCHASE'] }), resale)).toMatchObject({ reason: 'bto-ineligible' });
    expect(previewFit('cash', outcome({ warnings: ['CASH_SHORTFALL_AT_PURCHASE'] }), resale)).toMatchObject({ verdict: 'bto' });
  });
});
