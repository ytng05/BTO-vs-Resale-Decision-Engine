// Unit tests for plan input validation (Vitest).
import { describe, it, expect } from 'vitest';
import { validateSituation, validateChoice, validateStep } from '../src/validation/planValidation.js';

const goodApplicant = () => ({ age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 });
const goodProfile = () => ({ applicants: [goodApplicant()], cashSavings: 20000 });
const goodAssumptions = () => ({ priceGrowth: 0.03, incomeGrowth: 0.02, horizonYears: 10 });

describe('validateSituation', () => {
  it('accepts a complete single buyer', () => {
    expect(validateSituation(goodProfile(), goodAssumptions())).toEqual({});
  });

  it('accepts a couple', () => {
    const profile = goodProfile();
    profile.applicants.push({ ...goodApplicant(), citizenship: 'PR', firstTimer: false });
    expect(validateSituation(profile, goodAssumptions())).toEqual({});
  });

  it('requires at least one buyer', () => {
    const profile = { ...goodProfile(), applicants: [] };
    expect(validateSituation(profile, goodAssumptions())).toHaveProperty('applicants');
  });

  it('flags blank and negative numbers per buyer', () => {
    const profile = goodProfile();
    profile.applicants[0].age = '';
    profile.applicants[0].cpfOaBalance = -1;
    const errors = validateSituation(profile, goodAssumptions());
    expect(errors).toHaveProperty(['applicants.0.age']);
    expect(errors).toHaveProperty(['applicants.0.cpfOaBalance']);
  });

  it('catches a yearly income typed as monthly', () => {
    const profile = goodProfile();
    profile.applicants[0].monthlyIncome = 120000;
    expect(validateSituation(profile, goodAssumptions())['applicants.0.monthlyIncome']).toMatch(/monthly/);
  });

  it('shows growth range errors in percent at both bounds', () => {
    const tooLow = validateSituation(goodProfile(), { ...goodAssumptions(), priceGrowth: -0.25, incomeGrowth: -0.25 });
    expect(tooLow.priceGrowth).toBe('Flat price growth must be between -20% and 20% a year.');
    expect(tooLow.incomeGrowth).toBe('Income growth must be between -20% and 30% a year.');
    const tooHigh = validateSituation(goodProfile(), { ...goodAssumptions(), priceGrowth: 0.25, incomeGrowth: 0.35 });
    expect(tooHigh.priceGrowth).toBe(tooLow.priceGrowth);
    expect(tooHigh.incomeGrowth).toBe(tooLow.incomeGrowth);
    for (const msg of [tooLow.priceGrowth, tooLow.incomeGrowth]) expect(msg).not.toMatch(/0\.\d/);
  });

  it('words required-field errors to match the labels', () => {
    const errors = validateSituation(goodProfile(), { priceGrowth: null, incomeGrowth: null, horizonYears: null });
    expect(errors.horizonYears).toBe('Enter how many years to compare after.');
    expect(errors.priceGrowth).toBe('Enter flat price growth (% a year).');
  });

  it('accepts zero and negative growth but rejects absurd rates', () => {
    expect(validateSituation(goodProfile(), { ...goodAssumptions(), priceGrowth: 0, incomeGrowth: -0.05 })).toEqual({});
    expect(validateSituation(goodProfile(), { ...goodAssumptions(), priceGrowth: 3 })).toHaveProperty('priceGrowth');
  });
});

describe('validateChoice', () => {
  const opts = { currentYear: 2026 };
  const bto = () => ({ path: 'BTO', purchaseYear: 2027, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD' });
  const resale = () => ({ path: 'RESALE', purchaseYear: 2028, town: 'BEDOK', flatType: 'EXECUTIVE', livingArrangement: 'NONE', leaseBand: '80-89' });

  it('accepts complete BTO and resale choices', () => {
    expect(validateChoice(bto(), opts)).toEqual({});
    expect(validateChoice(resale(), opts)).toEqual({});
  });

  it('requires every field', () => {
    const errors = validateChoice({ path: 'BTO', purchaseYear: null, town: null, flatType: null, classification: null }, opts);
    expect(Object.keys(errors).sort()).toEqual(['classification', 'flatType', 'purchaseYear', 'town']);
    expect(errors.flatType).toBe('Choose a flat type.');
    expect(errors.town).toBe('Choose a town.');
    expect(errors.classification).toBe('Choose a classification.');
  });

  it('rejects a purchase year in the past', () => {
    expect(validateChoice({ ...bto(), purchaseYear: 2020 }, opts)).toHaveProperty('purchaseYear');
  });

  it('rejects an Executive flat for BTO but not for resale', () => {
    expect(validateChoice({ ...bto(), flatType: 'EXECUTIVE' }, opts)).toHaveProperty('flatType');
    expect(validateChoice(resale(), opts)).not.toHaveProperty('flatType');
  });

  it('accepts living with or near parents without any postal code (D15: declared, not measured)', () => {
    const near = { ...resale(), livingArrangement: 'NEAR' };
    expect(validateChoice(near, opts)).toEqual({});
  });

  it('does not ask BTO buyers about living arrangement', () => {
    expect(validateChoice(bto(), opts)).not.toHaveProperty('livingArrangement');
  });

  it('rejects a town not in the list', () => {
    expect(validateChoice({ ...resale(), town: 'Bedok' }, opts)).toHaveProperty('town');
  });
});

describe('validateStep', () => {
  it('has nothing to validate on the results step', () => {
    expect(validateStep(3, {})).toEqual({});
  });
});