import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API scaffold', () => {
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

  it('GET /api/data/bto-projects rejects an unknown classification', async () => {
    const res = await request(app).get('/api/data/bto-projects?classification=LUXURY');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('GET /api/data/bto-projects returns 503 when no database is connected', async () => {
    const res = await request(app).get('/api/data/bto-projects');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });
});
