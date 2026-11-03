// Plan form validation (contract v2/v2.1 field names). Pure functions, no components mounted.
import { describe, it, expect } from 'vitest';
import { validateSituation, validateChoice, validateStep, isPlanComplete, validatePlan, validateAboutPart, cpfLooksHigh } from '../src/validation/planValidation.js';

const YEAR = 2026;
const buyer = (over = {}) => ({ age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000, ...over });
const profile = (over = {}) => ({ applicants: [buyer(), buyer({ age: 29 })], cashSavings: 20000, constraints: { moveInByYear: null }, ...over });
const assumptions = (over = {}) => ({
  annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02, horizonYear: null, monthlyHousingCostWhileWaiting: 0, ...over,
});
const bto = (over = {}) => ({
  path: 'BTO', applicationYear: YEAR + 1, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD',
  btoProjectId: null, btoPrice: null, btoWaitMonths: null, renovation: 0, ...over,
});
const resale = (over = {}) => ({
  path: 'RESALE', applicationYear: YEAR + 1, town: 'BEDOK', flatType: '4 ROOM', livingArrangement: 'NONE', leaseBand: '80-89', renovation: 0, ...over,
});
const opts = { currentYear: YEAR };

describe('validateSituation', () => {
  it('accepts a complete two-buyer household', () => {
    expect(validateSituation(profile(), assumptions(), opts)).toEqual({});
  });

  it('needs exactly two buyers, at least one a Singapore Citizen', () => {
    expect(validateSituation(profile({ applicants: [buyer()] }), assumptions(), opts).applicants).toMatch(/two buyers/);
    const prPr = profile({ applicants: [buyer({ citizenship: 'PR' }), buyer({ citizenship: 'PR' })] });
    expect(validateSituation(prPr, assumptions(), opts).applicants).toMatch(/Singapore Citizen/);
  });

  it('checks each buyer and gives a plain message per field', () => {
    const e = validateSituation(profile({ applicants: [buyer({ age: 20 }), buyer({ monthlyIncome: 150000 })] }), assumptions(), opts);
    expect(e['applicants.0.age']).toBe('Enter an age between 21 and 99.');
    expect(validateSituation(profile({ applicants: [buyer({ age: 100 }), buyer()] }), assumptions(), opts)['applicants.0.age']).toBe('Enter an age between 21 and 99.');
    expect(validateSituation(profile({ applicants: [buyer({ age: 21 }), buyer({ age: 99 })] }), assumptions(), opts)).toEqual({});
    expect(e['applicants.1.monthlyIncome']).toMatch(/yearly figure/);
  });

  it('uses the v2 growth names, stored as decimals', () => {
    const e = validateSituation(profile(), assumptions({ annualPriceGrowth: null, annualIncomeGrowth: 0.5 }), opts);
    expect(e.annualPriceGrowth).toMatch(/Enter flat price growth/);
    expect(e.annualIncomeGrowth).toMatch(/between -20% and 30%/);
  });

  it('treats the compare year, move-in year and rent as optional, but checks them when given', () => {
    expect(validateSituation(profile(), assumptions({ horizonYear: null, monthlyHousingCostWhileWaiting: null }), opts)).toEqual({});
    const e = validateSituation(
      profile({ constraints: { moveInByYear: YEAR - 1 } }),
      assumptions({ horizonYear: YEAR, monthlyHousingCostWhileWaiting: -1 }),
      opts,
    );
    expect(e.horizonYear).toMatch(/leave it blank/);
    expect(e.moveInByYear).toMatch(/leave it blank/);
    expect(e.monthlyHousingCostWhileWaiting).toMatch(/at least 0/);
  });
});

describe('validateChoice', () => {
  it('accepts a complete BTO and a complete resale choice', () => {
    expect(validateChoice(bto(), opts)).toEqual({});
    expect(validateChoice(resale(), opts)).toEqual({});
  });

  it('uses applicationYear and only allows 3-, 4- and 5-room flats (D27)', () => {
    const e = validateChoice(bto({ applicationYear: null, flatType: '2 ROOM' }), opts);
    expect(e.applicationYear).toBe('Enter a year.');
    expect(e.flatType).toMatch(/valid flat type/);
    expect(validateChoice(resale({ flatType: 'EXECUTIVE' }), opts).flatType).toMatch(/valid flat type/);
  });

  it('keeps the BTO price inside the chosen project\'s HDB range (D26)', () => {
    const range = { btoPriceRange: { min: 481000, max: 600000 }, currentYear: YEAR };
    expect(validateChoice(bto({ btoPrice: 540000 }), range)).toEqual({});
    expect(validateChoice(bto({ btoPrice: 700000 }), range).btoPrice).toMatch(/price range/);
  });

  it('takes an optional resale asking price within a sensible range (D39)', () => {
    expect(validateChoice(resale({ resalePrice: null }), opts)).toEqual({});
    expect(validateChoice(resale({ resalePrice: 650000 }), opts)).toEqual({});
    expect(validateChoice(resale({ resalePrice: 500 }), opts).resalePrice).toMatch(/asking price/);
    expect(validateChoice(resale({ resalePrice: 9000000 }), opts).resalePrice).toMatch(/asking price/);
  });

  it('needs lease band and living arrangement for resale only', () => {
    const e = validateChoice(resale({ leaseBand: null, livingArrangement: null }), opts);
    expect(e.leaseBand).toMatch(/remaining lease band/);
    expect(e.livingArrangement).toMatch(/living arrangement/);
    expect(validateChoice(bto({ leaseBand: undefined }), opts)).toEqual({});
  });

  it('accepts no renovation, but not a negative one', () => {
    expect(validateChoice(bto({ renovation: null }), opts)).toEqual({});
    expect(validateChoice(resale({ renovation: -5 }), opts).renovation).toMatch(/at least 0/);
  });
});

describe('validateStep (D38 steps)', () => {
  it('validates the step the stepper is on: 0 what matters (optional), 1 about you, 2 BTO, 3 resale, 4 results', () => {
    const store = { profile: profile(), assumptions: assumptions(), choiceA: bto({ town: null }), choiceB: resale() };
    expect(validateStep(0, store, opts)).toEqual({});
    expect(validateStep(1, store, opts)).toEqual({});
    expect(validateStep(2, store, opts).town).toMatch(/Choose a town/);
    expect(validateStep(3, store, opts)).toEqual({});
    expect(validateStep(4, store, opts)).toEqual({});
  });

  it('about you checks the buyers, cash and move-in year, not the assumptions (they have defaults)', () => {
    const store = { profile: profile({ cashSavings: null }), assumptions: assumptions({ annualPriceGrowth: null }) };
    const errors = validateStep(1, store, opts);
    expect(errors.cashSavings).toBe('Enter an amount, or 0 if none.'); // shown under the cash box
    expect(errors).not.toHaveProperty('annualPriceGrowth');
  });
});

describe('validateAboutPart (About you, one question per screen)', () => {
  // A household with something wrong on every screen.
  const broken = profile({
    applicants: [buyer({ age: null, citizenship: 'PR', monthlyIncome: 120000 }), buyer({ citizenship: 'PR', cpfOaBalance: null })],
    cashSavings: null,
  });

  it('accepts each screen of a complete household', () => {
    [0, 1, 2, 3].forEach((part) => expect(validateAboutPart(part, profile(), opts)).toEqual({}));
  });

  it('checks only the fields its own screen asks', () => {
    expect(Object.keys(validateAboutPart(0, broken, opts))).toEqual(['applicants.0.age']);
    expect(Object.keys(validateAboutPart(1, broken, opts))).toEqual(['applicants']);
    expect(Object.keys(validateAboutPart(2, broken, opts))).toEqual(['applicants.0.monthlyIncome']);
    expect(Object.keys(validateAboutPart(3, broken, opts)).sort()).toEqual(['applicants.1.cpfOaBalance', 'cashSavings']);
  });

  it('puts the optional move-in year on the last screen', () => {
    const late = profile({ constraints: { moveInByYear: YEAR - 1 } });
    expect(validateAboutPart(3, late, opts)).toHaveProperty('moveInByYear');
    expect(validateAboutPart(0, late, opts)).toEqual({});
  });

  it('between them, the screens report every error the whole step does', () => {
    const parts = Object.assign({}, ...[0, 1, 2, 3].map((part) => validateAboutPart(part, broken, opts)));
    expect(parts).toEqual(validateStep(1, { profile: broken }, opts));
  });

  it('has nothing to check past the last screen', () => {
    expect(validateAboutPart(4, broken, opts)).toEqual({});
  });
});

describe('cpfLooksHigh (a soft "double-check?" note, never an error)', () => {
  it('flags a balance above S$25,000 for each year since age 20', () => {
    expect(cpfLooksHigh(25, 400000)).toBe(true); // the limit at 25 is S$125,000
    expect(cpfLooksHigh(25, 125000)).toBe(false);
    expect(cpfLooksHigh(25, 125001)).toBe(true);
    expect(cpfLooksHigh(35, 300000)).toBe(false); // S$375,000 at 35
  });

  it('allows at least S$25,000 at any age, and says nothing until both numbers are in', () => {
    expect(cpfLooksHigh(20, 25000)).toBe(false);
    expect(cpfLooksHigh(null, 999999)).toBe(false);
    expect(cpfLooksHigh(30, null)).toBe(false);
  });

  it('is not a validation error', () => {
    const rich = profile({ applicants: [buyer({ age: 25, cpfOaBalance: 400000 }), buyer()] });
    expect(validateAboutPart(3, rich, opts)).toEqual({});
  });
});

describe('isPlanComplete', () => {
  const complete = () => ({ profile: profile(), assumptions: assumptions(), choiceA: bto(), choiceB: resale() });

  it('is true when every input the comparison needs is valid', () => {
    expect(isPlanComplete(complete(), opts)).toBe(true);
  });

  it('is false when any step, or an assumption that onboarding no longer asks, is invalid', () => {
    expect(isPlanComplete({ ...complete(), choiceB: resale({ leaseBand: null }) }, opts)).toBe(false);
    expect(isPlanComplete({ ...complete(), assumptions: assumptions({ annualIncomeGrowth: null }) }, opts)).toBe(false);
    expect(validatePlan({ ...complete(), choiceA: bto({ town: null }) }, opts)).toHaveProperty(['choiceA.town']);
  });
});