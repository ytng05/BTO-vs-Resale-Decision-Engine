// Auth and scenarios without a database: token checks, input validation, and the 503 when Mongo is absent.
// The full register -> save -> load flow needs a real database
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { requireAuth, signToken } from '../src/middleware/auth.js';
import { env } from '../src/config/env.js';

const app = createApp();
const user = { _id: '64b000000000000000000001', name: 'Test User', email: 'test@example.com' };
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

function runRequireAuth(header) {
  const req = { get: () => header };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  requireAuth(req, res, next);
  return { req, res, next };
}

describe('requireAuth', () => {
  it('accepts a valid token and sets req.user', () => {
    const { req, next } = runRequireAuth(`Bearer ${signToken(user)}`);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: user._id, name: user.name, email: user.email });
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', `Basic ${signToken(user)}`],
    ['garbage token', 'Bearer not-a-jwt'],
    ['wrong secret', `Bearer ${jwt.sign({ sub: user._id }, 'some-other-secret')}`],
    ['expired token', `Bearer ${jwt.sign({ sub: user._id }, env.jwtSecret, { expiresIn: -10 })}`],
  ])('rejects %s with 401', (_label, header) => {
    const { res, next } = runRequireAuth(header);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('POST /api/auth/register and /login', () => {
  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.co', password: 'short' });
    expect(res.status).toBe(400);
  });

    it('requires a name on register', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '   ', email: 'a@b.co', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/name/);
  });

  it('rejects a password longer than bcrypt can use', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(73) });
    expect(res.status).toBe(400);
  });

  it('returns 503 for valid input when there is no database', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'longenough' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the token owner', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer(signToken(user)));
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: user._id, name: user.name, email: user.email });
  });

  it('needs a token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});

describe('/api/scenarios', () => {
  it('needs a token on every route', async () => {
    for (const [method, path] of [['get', '/'], ['post', '/'], ['get', '/abc'], ['put', '/abc'], ['delete', '/abc']]) {
      const res = await request(app)[method](`/api/scenarios${path}`);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it('validates the body before touching the database', async () => {
    const res = await request(app).post('/api/scenarios').set(bearer(signToken(user)))
      .send({ name: '  ', profile: {}, choiceA: {}, choiceB: {}, assumptions: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects inputs that are not objects', async () => {
    const res = await request(app).post('/api/scenarios').set(bearer(signToken(user)))
      .send({ name: 'Plan', profile: 'x', choiceA: {}, choiceB: {}, assumptions: {} });
    expect(res.status).toBe(400);
  });

  it('validates an update before touching the database, and answers 503 without one', async () => {
    const auth = bearer(signToken(user));
    const bad = await request(app).put('/api/scenarios/64b000000000000000000002').set(auth)
      .send({ name: '', profile: {}, choiceA: {}, choiceB: {}, assumptions: {} });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const ok = await request(app).put('/api/scenarios/64b000000000000000000002').set(auth)
      .send({ name: 'Plan', profile: {}, choiceA: {}, choiceB: {}, assumptions: {} });
    expect(ok.status).toBe(503);
  });

  it('returns 503 for a valid request when there is no database', async () => {
    const res = await request(app).get('/api/scenarios').set(bearer(signToken(user)));
    expect(res.status).toBe(503);
  });
});
