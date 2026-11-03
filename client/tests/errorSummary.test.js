import { describe, expect, it } from 'vitest';
import { summariseErrors } from '../src/utils/errorSummary.js';

describe('summariseErrors', () => {
  it('names the buyer and field, and points at its input', () => {
    expect(summariseErrors(1, { 'applicants.1.monthlyIncome': 'Enter a monthly income.' })).toEqual([
      { key: 'applicants.1.monthlyIncome', label: "Your partner's monthly income", message: 'Enter a monthly income.', cy: 'situation-buyer-2-income-input' },
    ]);
  });

  it('keeps the order of the errors', () => {
    const keys = summariseErrors(1, { 'applicants.0.age': 'a', cashSavings: 'b', applicants: 'c' }).map((e) => e.key);
    expect(keys).toEqual(['applicants.0.age', 'cashSavings', 'applicants']);
  });

  it('uses the BTO or resale prefix for the path steps', () => {
    expect(summariseErrors(2, { flatType: 'Pick a flat type.' })[0].cy).toBe('patha-flat-type');
    expect(summariseErrors(3, { leaseBand: 'Pick a lease.' })[0].cy).toBe('pathb-lease-band');
  });

  it('still lists an error with no field on the step, without a link', () => {
    expect(summariseErrors(2, { applicationYear: 'Enter a year.' })[0]).toEqual({ key: 'applicationYear', label: null, message: 'Enter a year.', cy: null });
  });
});
