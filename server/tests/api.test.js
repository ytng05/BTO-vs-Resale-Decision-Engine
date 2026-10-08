import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API scaffold', () => {
  const scFirstTimerCouple = {
    profile: {
      applicants: [
        { age: 35, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
        { age: 34, citizenship: 'SC', firstTimer: true, monthlyIncome: 3500, cpfOaBalance: 0 },
      ],
      cashSavings: 0,
      monthlySavings: 0,
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
    expect(['TEMPLATE', 'VERIFIED']).toContain(res.body.status);
    expect(res.body.rules.grants.ehg).toBeTruthy();
    expect(res.body).toHaveProperty('verifiedBy');
  });

  it('POST /api/grants evaluates resale grants and defaults the assessment date', async () => {
    const res = await request(app).post('/api/grants').send(scFirstTimerCouple);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(130000);
    expect(res.body).toMatchObject({ ehg: 30000, familyGrant: 80000, phg: 20000 });
    expect(res.body.rulesetVersion).toBeTruthy();
    expect(['TEMPLATE', 'VERIFIED']).toContain(res.body.rulesetStatus);
    expect(res.body.assessmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(res.body.eligibility)).toBe(true);
  });

  it('POST /api/grants evaluates BTO grants', async () => {
    const res = await request(app).post('/api/grants').send({
      ...scFirstTimerCouple,
      choice: { ...scFirstTimerCouple.choice, path: 'BTO', classification: 'STANDARD' },
    });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(30000);
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
