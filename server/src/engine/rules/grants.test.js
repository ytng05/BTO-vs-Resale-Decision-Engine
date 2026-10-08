import { describe, expect, it } from 'vitest';
import { evaluateGrants } from './grants.js';
import { loadRuleset } from './loadRuleset.js';

describe('evaluateGrants', () => {
  it('SC+SC first-timers: $7,000 resale 4-room, living near parents', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NEAR',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // Family Grant: SC+SC 2-4 room amount is 80,000 and 7,000 is within the 16,000 ceiling; EHG 6,501-7,000 tier is 30,000; PHG near-family amount is 20,000.
    expect(result).toMatchObject({ ehg: 30000, familyGrant: 80000, phg: 20000, total: 130000 });
    expect(result.eligibility.every((item) => ['EHG', 'Family Grant', 'PHG'].includes(item.grantGroup))).toBe(true);
  });

  it('SC+SC first-timers: $7,000 resale 5-room, no parents arrangement', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '5 ROOM',
      livingArrangement: 'NONE',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // Family Grant: SC+SC 5-room+ amount is 50,000; EHG 6,501-7,000 tier is 30,000; NONE gives PHG 0.
    expect(result).toMatchObject({ familyGrant: 50000, ehg: 30000, phg: 0, total: 80000 });
  });

  it('SC+PR first-timers: $7,000 resale 4-room, no parents arrangement', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'PR', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NONE',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // Family Grant: checked SC+PR 2-4 room amount is 70,000; EHG 6,501-7,000 tier is 30,000; NONE gives PHG 0.
    expect(result).toMatchObject({ familyGrant: 70000, ehg: 30000, phg: 0, total: 100000 });
  });

  it('SC+SC first-timers: $7,000 resale 4-room, living with parents', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'WITH',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // Family Grant: SC+SC 2-4 room amount is 80,000; EHG 6,501-7,000 tier is 30,000; PHG with-family amount is 30,000.
    expect(result).toMatchObject({ familyGrant: 80000, ehg: 30000, phg: 30000, total: 140000 });
  });

  it('same couple at $9,001 household monthly income', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 4500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 4501, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NEAR',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // Family Grant: SC+SC 2-4 room amount is 80,000 and 9,001 is within its 16,000 ceiling; EHG exceeds its 9,000 ceiling; PHG near-family amount is 20,000.
    expect(result).toMatchObject({ ehg: 0, familyGrant: 80000, phg: 20000, total: 100000 });
  });

  it('PR+PR resale household is not eligible for Family Grant', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'PR', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'PR', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NONE',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // PR+PR has a configured Family Grant ineligibility; the failed resale prerequisite blocks EHG and NONE claims no PHG.
    expect(result).toMatchObject({ ehg: 0, familyGrant: 0, phg: 0, total: 0 });
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      grantGroup: 'Family Grant',
      grant: 'Family Grant: household type',
      passed: false,
      reason: 'This household is not eligible for the Family Grant. An applicant must be a Singapore Citizen with at least one other Singapore Citizen or Permanent Resident.',
    }));
  });

  it('same couple buying BTO', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // EHG: 7,000 falls in the configured 6,501-7,000 family tier (30,000); HDB's Feb 2026 BTO press release, para 7, gives the same worked example. Family Grant and PHG do not apply to BTO.
    expect(result).toMatchObject({ ehg: 30000, familyGrant: 0, phg: 0, total: 30000 });
  });

  it('short lease keeps full EHG tier and reports pro-rating warning', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 60,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // EHG: 7,000 matches the 6,501-7,000 family tier (30,000); short lease reports possible pro-rating but retains that full tier pending the verified formula.
    expect(result).toMatchObject({ ehg: 30000, familyGrant: 0, phg: 0, total: 30000 });
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      grantGroup: 'EHG',
      grant: 'EHG: lease covers age 95',
      passed: false,
      reason: 'Your remaining lease does not cover the youngest applicant to age 95. HDB pro-rating is not yet applied, so your actual EHG may be lower.',
    }));
  });

  it('first-timer + second-timer couple', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: false, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // EHG: half of the 7,000 household income is 3,500; the FT+ST 3,251-3,500 tier is 15,000.
    expect(result).toMatchObject({ ehg: 15000, familyGrant: 0, phg: 0, total: 15000 });
  });

  it('income exactly $9,000', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 4500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 4500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    // EHG: 9,000 is inclusive and matches the 8,501-9,000 family tier (5,000); HDB's Feb 2026 BTO press release, para 7, gives this worked example.
    expect(result).toMatchObject({ ehg: 5000, familyGrant: 0, phg: 0, total: 5000 });
  });

  it('SC+SC first-timers with $4,000 household income buying BTO', () => {
    const profile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 2000, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 2000, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(profile, choice, '2026-10-07', ruleset);

    // EHG: $4,000 matches the configured 3,501-4,000 family tier (80,000); HDB's Feb 2026 BTO press release, para 7, provides the 7,000 and 9,000 worked examples and cites the same schedule.
    expect(result).toMatchObject({ ehg: 80000, familyGrant: 0, phg: 0, total: 80000 });
  });

  it('income $1,500 vs $1,501 boundary', () => {
    const atBoundaryProfile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 750, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 750, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const aboveBoundaryProfile = {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 750, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 751, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
      parentsAddress: { postal: 'TODO' },
    };
    const choice = {
      path: 'BTO',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      classification: 'STANDARD',
      remainingLeaseYears: 80,
    };
    const { ruleset } = loadRuleset();
    const atBoundaryResult = evaluateGrants(atBoundaryProfile, choice, '2026-10-06', ruleset);
    const aboveBoundaryResult = evaluateGrants(aboveBoundaryProfile, choice, '2026-10-06', ruleset);

    // EHG: 1,500 matches the <=1,500 tier (120,000); 1,501 matches 1,501-2,000 (110,000).
    expect(atBoundaryResult).toMatchObject({ ehg: 120000, familyGrant: 0, phg: 0, total: 120000 });
    expect(aboveBoundaryResult).toMatchObject({ ehg: 110000, familyGrant: 0, phg: 0, total: 110000 });
  });
});