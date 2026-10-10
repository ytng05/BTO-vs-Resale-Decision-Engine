import { describe, expect, it } from 'vitest';
import { evaluateGrants } from '../../src/engine/rules/grants.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

describe('evaluateGrants', () => {
  const scFirstTimerProfile = {
    applicants: [
      { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
    ],
    cashSavings: 0,
    monthlySavings: 0,
  };

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

  it('resale lease of 19 years fails the EHG minimum remaining lease check', () => {
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NONE',
      remainingLeaseYears: 19,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);

    expect(result.ehg).toBe(0);
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      grantGroup: 'EHG',
      id: 'EHG_MIN_LEASE',
      passed: false,
      reason: "Your flat's remaining lease (19 years) is below the 20-year minimum for the EHG.",
    }));
  });

  it('resale lease of exactly 20 years passes the EHG minimum remaining lease check', () => {
    const choice = {
      path: 'RESALE',
      purchaseYear: 2026,
      town: 'TODO',
      flatType: '4 ROOM',
      livingArrangement: 'NONE',
      remainingLeaseYears: 20,
    };
    const { ruleset } = loadRuleset();
    const result = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);

    expect(result.ehg).toBe(30000);
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      grantGroup: 'EHG',
      id: 'EHG_MIN_LEASE',
      passed: true,
      reason: "Your flat's remaining lease (20 years) meets the 20-year minimum for the EHG.",
    }));
  });

  it('resale with null or missing remaining lease skips lease checks without crashing', () => {
    const { ruleset } = loadRuleset();
    const base = { path: 'RESALE', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', livingArrangement: 'NONE' };

    for (const choice of [{ ...base, remainingLeaseYears: null }, base]) {
      const result = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);

      expect(result.ehg).toBe(30000);
      for (const id of ['EHG_MIN_LEASE', 'EHG_LEASE_TO_95']) {
        expect(result.eligibility).toContainEqual(expect.objectContaining({
          grantGroup: 'EHG',
          id,
          passed: true,
          reason: 'Remaining lease not provided yet; lease checks not applied.',
        }));
      }
    }
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

  it('EHG fails with EHG_PATH when the ruleset does not list the purchase path', () => {
    const { ruleset } = loadRuleset();
    const restricted = structuredClone(ruleset);
    restricted.grants.ehg.appliesTo = ['RESALE'];
    const choice = { path: 'BTO', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', classification: 'STANDARD', remainingLeaseYears: 99 };

    const result = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', restricted);
    expect(result.ehg).toBe(0);
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      grantGroup: 'EHG', id: 'EHG_PATH', passed: false, reason: 'The EHG does not apply to this purchase type.',
    }));

    const allowed = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);
    expect(allowed.ehg).toBe(30000);
    expect(allowed.eligibility).toContainEqual(expect.objectContaining({
      id: 'EHG_PATH', passed: true, reason: 'The EHG applies to your purchase type.',
    }));
  });

  it('treats income bands as continuous for fractional incomes', () => {
    const { ruleset } = loadRuleset();
    const choice = { path: 'BTO', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', classification: 'STANDARD', remainingLeaseYears: 99 };
    const couple = (first, second, secondFirstTimer = true) => ({
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: first, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: secondFirstTimer, monthlyIncome: second, cpfOaBalance: 0 },
      ],
    });

    // $1,500.01 falls in the $1,501-$2,000 band, not a gap below it.
    expect(evaluateGrants(couple(750, 750.01), choice, '2026-10-06', ruleset).ehg).toBe(110000);
    // $9,000.00 is eligible; $9,000.01 is above the ceiling.
    expect(evaluateGrants(couple(4500, 4500), choice, '2026-10-06', ruleset).ehg).toBe(5000);
    const aboveCeiling = evaluateGrants(couple(4500, 4500.01), choice, '2026-10-06', ruleset);
    expect(aboveCeiling.ehg).toBe(0);
    expect(aboveCeiling.eligibility).toContainEqual(expect.objectContaining({ id: 'EHG_INCOME_CEILING', passed: false }));
    // First-timer + second-timer half income $750.50 falls in the $751-$1,000 band.
    expect(evaluateGrants(couple(750.5, 750.5, false), choice, '2026-10-06', ruleset).ehg).toBe(55000);
  });

  it('Family Grant amount reason is conditional on meeting all requirements', () => {
    const { ruleset } = loadRuleset();
    const choice = { path: 'RESALE', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', livingArrangement: 'NONE', remainingLeaseYears: 80 };
    const result = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);
    expect(result.eligibility).toContainEqual(expect.objectContaining({
      id: 'FAMILY_AMOUNT',
      reason: 'The Family Grant for a 4-room flat is $80,000 for two Singapore Citizens, if all requirements are met.',
    }));
  });

  it('PR+PR BTO household gets no EHG because EHG needs at least one SC', () => {
    const { ruleset } = loadRuleset();
    const profile = {
      applicants: [
        { age: 35, citizenship: 'PR', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'PR', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
    };
    const choice = { path: 'BTO', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', classification: 'STANDARD', remainingLeaseYears: 99 };
    const result = evaluateGrants(profile, choice, '2026-10-06', ruleset);

    expect(result.ehg).toBe(0);
    expect(result.eligibility).toContainEqual(expect.objectContaining({ id: 'EHG_CITIZENSHIP', passed: false }));
  });

  it('every eligibility check carries an https sourceUrl from grants.checkSources', () => {
    const { ruleset } = loadRuleset();
    const choice = { path: 'RESALE', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', livingArrangement: 'NEAR', remainingLeaseYears: 80 };
    const { eligibility } = evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset);

    expect(eligibility.length).toBeGreaterThan(0);
    for (const check of eligibility) {
      expect(check.sourceUrl, check.id).toMatch(/^https:\/\/\S+$/);
      expect(check.sourceUrl).toBe(ruleset.grants.checkSources[check.id]);
    }
  });

  it('grants.checkSources has an entry for every eligibility test id', () => {
    const { ruleset } = loadRuleset();
    const bto = { path: 'BTO', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', classification: 'STANDARD', remainingLeaseYears: 99 };
    const resale = { path: 'RESALE', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', livingArrangement: 'NEAR', remainingLeaseYears: 80 };
    const ids = new Set([bto, resale].flatMap((choice) => evaluateGrants(scFirstTimerProfile, choice, '2026-10-06', ruleset).eligibility.map((check) => check.id)));
    const expectedIds = [
      'EHG_PATH', 'EHG_CITIZENSHIP', 'EHG_FIRST_TIMER', 'EHG_INCOME_CEILING', 'EHG_INCOME_BAND', 'EHG_EMPLOYMENT_ASSUMED',
      'EHG_FAMILY_GRANT_PREREQUISITE', 'EHG_MIN_LEASE', 'EHG_LEASE_TO_95', 'FAMILY_RESALE_ONLY', 'FAMILY_HOUSEHOLD_TYPE',
      'FAMILY_INCOME_LIMIT', 'FAMILY_AMOUNT', 'PHG_RESALE_ONLY', 'PHG_LIVING_ARRANGEMENT', 'PHG_AMOUNT', 'PHG_NEAR_DISTANCE',
    ];

    for (const id of [...ids, ...expectedIds]) {
      expect(ruleset.grants.checkSources[id], id).toMatch(/^https:\/\//);
    }
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