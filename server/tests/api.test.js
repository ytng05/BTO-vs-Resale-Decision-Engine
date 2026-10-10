import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API scaffold', () => {
  const scFirstTimerCouple = {
    profile: {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncomeCents: 350000, cpfOaBalanceCents: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncomeCents: 350000, cpfOaBalanceCents: 0 },
      ],
    },
    choice: { path: 'RESALE', purchaseYear: 2026, town: 'TODO', flatType: '4 ROOM', livingArrangement: 'NEAR', remainingLeaseYears: 80 },
  };

  it('GET /api/health returns ok and the feature flags', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.features.backtest).toBe(false); // risk-based verdict ships OFF
  });

  it('GET /api/ruleset returns the ruleset version and status', async () => {
    const res = await request(app).get('/api/ruleset');
    expect(res.status).toBe(200);
    expect(res.body.version).toBeTruthy();
    expect(res.body.status).toBe('VERIFIED');
    expect(res.body.version).toBe('2026-08-24');
    expect(res.body.rules.grants.ehg).toBeTruthy();
    expect(res.body).toHaveProperty('verifiedBy');
  });

  it('POST /api/grants evaluates resale grants and defaults the assessment date', async () => {
    const res = await request(app).post('/api/grants').send(scFirstTimerCouple);
    expect(res.status).toBe(200);
    expect(res.body.totalGrantsCents).toBe(13000000);
    expect(res.body.grants).toMatchObject([
      { id: 'EHG', amountCents: 3000000 },
      { id: 'FAMILY', amountCents: 8000000 },
      { id: 'PHG', amountCents: 2000000 },
    ]);
    expect(res.body).not.toHaveProperty('ehg');
    expect(res.body).not.toHaveProperty('familyGrant');
    expect(res.body).not.toHaveProperty('phg');
    expect(res.body).not.toHaveProperty('total');
    expect(res.body).not.toHaveProperty('eligibility');
    expect(res.body.rulesetVersion).toBeTruthy();
    expect(res.body.rulesetVersion).toBe('2026-08-24');
    expect(res.body.rulesetStatus).toBe('VERIFIED');
    expect(res.body.assessmentDate).toBe('2026-01-01');
    const tests = res.body.grants.flatMap((grant) => grant.tests);
    const testIds = tests.map((test) => test.id);
    expect(new Set(testIds).size).toBe(testIds.length);
    expect(testIds).toEqual(expect.arrayContaining([
      'FAMILY_RESALE_ONLY', 'FAMILY_HOUSEHOLD_TYPE', 'FAMILY_INCOME_LIMIT', 'FAMILY_AMOUNT',
      'EHG_CITIZENSHIP', 'EHG_FIRST_TIMER', 'EHG_PATH', 'EHG_INCOME_CEILING', 'EHG_INCOME_BAND', 'EHG_MIN_LEASE',
      'EHG_EMPLOYMENT_ASSUMED', 'EHG_FAMILY_GRANT_PREREQUISITE', 'EHG_LEASE_TO_95',
      'PHG_RESALE_ONLY', 'PHG_LIVING_ARRANGEMENT', 'PHG_AMOUNT', 'PHG_NEAR_DISTANCE',
    ]));
  });

  it('POST /api/grants evaluates BTO grants', async () => {
    const res = await request(app).post('/api/grants').send({
      ...scFirstTimerCouple,
      choice: { ...scFirstTimerCouple.choice, path: 'BTO', classification: 'STANDARD' },
    });
    expect(res.status).toBe(200);
    expect(res.body.totalGrantsCents).toBe(3000000);
    expect(res.body.assessmentDate).toBe('2026-01-01');
  });

  it('POST /api/grants defaults a missing BTO remaining lease to 99 years', async () => {
    const { remainingLeaseYears, ...choiceWithoutLease } = scFirstTimerCouple.choice;
    const res = await request(app).post('/api/grants').send({
      ...scFirstTimerCouple,
      choice: { ...choiceWithoutLease, path: 'BTO', classification: 'STANDARD' },
    });
    expect(res.status).toBe(200);
    expect(res.body.grants.find((grant) => grant.id === 'EHG').amountCents).toBe(3000000);
  });

  it('POST /api/grants rejects a non-boolean firstTimer', async () => {
    const [first, second] = scFirstTimerCouple.profile.applicants;
    const res = await request(app).post('/api/grants').send({
      ...scFirstTimerCouple,
      profile: { applicants: [{ ...first, firstTimer: 'false' }, second] },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('profile.applicants[0].firstTimer must be a boolean.');
  });

  it('POST /api/grants rejects negative or fractional cents', async () => {
    const [first, second] = scFirstTimerCouple.profile.applicants;
    for (const [field, value] of [['monthlyIncomeCents', -1], ['cpfOaBalanceCents', 10.5]]) {
      const res = await request(app).post('/api/grants').send({
        ...scFirstTimerCouple,
        profile: { applicants: [first, { ...second, [field]: value }] },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(new RegExp(`applicants\\[1\\]\\.${field}`));
    }
  });

  it('POST /api/grants rejects missing applicants', async () => {
    const res = await request(app).post('/api/grants').send({
      profile: {},
      choice: scFirstTimerCouple.choice,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/profile\.applicants/);
  });

  it('POST /api/grants rejects unsupported paths', async () => {
    const res = await request(app).post('/api/grants').send({
      ...scFirstTimerCouple,
      choice: { ...scFirstTimerCouple.choice, path: 'CONDO' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/choice\.path/);
  });

  it('unimplemented routes return the documented 501 shape', async () => {
    const res = await request(app).post('/api/compare').send({});
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  it('unknown API routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
