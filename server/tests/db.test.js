// Real-MongoDB tests: register -> log in -> save -> list -> load -> delete, and user isolation.
// Runs only when MONGODB_URI_TEST is set (CI starts a throwaway Mongo for it). It deletes everything
// in that database, so NEVER point it at the real app database (it refuses unless the name contains "test").
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';


const uri = process.env.MONGODB_URI_TEST;
const app = createApp();
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const scenario = {
  name: 'Tampines BTO vs Bedok resale',
    // Same shape as client/src/stores/scenario.js (v2): money in dollars, growth as fractions.
  profile: {
    applicants: [
      { id: 'applicant-1', age: 30, citizenship: 'SC', firstTimer: true, monthlyIncome: 5000, cpfOaBalance: 40000 },
      { id: 'applicant-2', age: 29, citizenship: 'PR', firstTimer: true, monthlyIncome: 4500, cpfOaBalance: 30000 },
    ],
    cashSavings: 20000,
    constraints: { moveInByYear: null },
  },
  choiceA: { path: 'BTO', applicationYear: 2027, town: 'TAMPINES', flatType: '4 ROOM', classification: 'STANDARD', renovation: 0 },
  choiceB: { path: 'RESALE', applicationYear: 2027, town: 'BEDOK', flatType: '4 ROOM', livingArrangement: 'NONE', leaseBand: '80-89', renovation: 0 },
  assumptions: { annualPriceGrowth: 0.03, annualIncomeGrowth: 0.02, horizonYear: 2040 },
  result: { rulesetVersion: 'test-ruleset', evaluationStartYear: 2026, breakEvenSentence: 'test' },

};

async function register(email) {
  const res = await request(app).post('/api/auth/register').send({ name: email.split('@')[0], email, password: 'correct-horse-1' });
  expect(res.status).toBe(201);
  return res.body.token;
}

// Empties every collection instead of dropping the database: an Atlas user with the
// "read and write" role may not drop databases, but may delete documents and drop collections.
async function clearDatabase({ dropCollections = false } = {}) {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => (dropCollections ? c.drop() : c.deleteMany({}))));
}

// Only set once the database name has been checked. afterAll runs even when beforeAll throws,
// so clean-up must check this flag, or a refused run would still wipe the database it refused.
let isTestDatabase = false;

describe.skipIf(!uri)('with a real MongoDB', () => {
  beforeAll(async () => {
    await mongoose.connect(uri);
    const name = mongoose.connection.db.databaseName;
    if (!name.includes('test')) {
      throw new Error(`Refusing to run: database "${name}" does not contain "test"`);
    }
    isTestDatabase = true;
    await clearDatabase();
    await User.init(); // build the unique email index before relying on it

  });

  afterAll(async () => {
    if (isTestDatabase) await clearDatabase({ dropCollections: true });
    await mongoose.disconnect();
  });

  it('registers, rejects a duplicate email, and logs in', async () => {
    await register('Alice@Example.com ');
    const dup = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'another-pass-1' });
    expect(dup.status).toBe(409);

    const wrong = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong-pass-1' });
    expect(wrong.status).toBe(401);

    const ok = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'correct-horse-1' });
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({name: 'Alice', email: 'alice@example.com'});

    const stored = await User.findOne({ email: 'alice@example.com' }).lean();
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash, never the password
  });

  it('saves, lists, loads and deletes a scenario', async () => {
    const token = await register('bob@example.com');

    const saved = await request(app).post('/api/scenarios').set(auth(token)).send(scenario);
    expect(saved.status).toBe(201);
    expect(saved.body.scenario.rulesetVersion).toBe('test-ruleset');
    expect(saved.body.scenario.evaluationStartYear).toBe(2026); // taken from the result
    const { id } = saved.body.scenario;

    const list = await request(app).get('/api/scenarios').set(auth(token));
    expect(list.body.scenarios).toHaveLength(1);
    expect(list.body.scenarios[0]).not.toHaveProperty('profile'); // the list is summary-only

    const loaded = await request(app).get(`/api/scenarios/${id}`).set(auth(token));
    expect(loaded.status).toBe(200);
    expect(loaded.body.scenario).toMatchObject({
      name: scenario.name, profile: scenario.profile, choiceA: scenario.choiceA,
      choiceB: scenario.choiceB, assumptions: scenario.assumptions,
    });

    expect((await request(app).delete(`/api/scenarios/${id}`).set(auth(token))).status).toBe(204);
    expect((await request(app).get(`/api/scenarios/${id}`).set(auth(token))).status).toBe(404);
  });

    it('stamps the current year when no result is saved', async () => {
    const token = await register('erin@example.com');
    const { result, ...withoutResult } = scenario;
    const saved = await request(app).post('/api/scenarios').set(auth(token)).send(withoutResult);
    expect(saved.status).toBe(201);
    expect(saved.body.scenario.evaluationStartYear).toBe(new Date().getFullYear());
  });

    it('lists a summary from the nested choice and result fields, only for the owner', async () => {
    const owner = await register('frank@example.com');
    const other = await register('grace@example.com');
    const result = {
      ...scenario.result,
      gapBreakdown: { marginCents: -250_000 },
      resolvedA: { purchasePriceCents: 54_050_000 },
      resolvedB: { purchasePriceCents: 68_000_000 },
    };
    await request(app).post('/api/scenarios').set(auth(owner)).send({ ...scenario, result });
    await request(app).post('/api/scenarios').set(auth(other)).send({ ...scenario, name: 'Not yours' });

    const list = (await request(app).get('/api/scenarios').set(auth(owner))).body.scenarios;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe(scenario.name);
    expect(list[0].summary).toEqual({
      btoTown: 'TAMPINES', btoFlatType: '4 ROOM', resaleTown: 'BEDOK', resaleFlatType: '4 ROOM',
      ahead: 'B', btoPriceCents: 54_050_000, resalePriceCents: 68_000_000,
    });
    // Only the summary fields come back, not the rest of the inputs or result.
    expect(list[0]).not.toHaveProperty('choiceA');
    expect(list[0]).not.toHaveProperty('result');
  });

  it('never shows one user’s scenario to another', async () => {
    const owner = await register('carol@example.com');
    const other = await register('dave@example.com');
    const { id } = (await request(app).post('/api/scenarios').set(auth(owner)).send(scenario)).body.scenario;

    expect((await request(app).get(`/api/scenarios/${id}`).set(auth(other))).status).toBe(404);
    expect((await request(app).delete(`/api/scenarios/${id}`).set(auth(other))).status).toBe(404);
    expect((await request(app).get('/api/scenarios').set(auth(other))).body.scenarios).toEqual([]);
    // Still there for the owner after the other user's delete attempt.
    expect((await request(app).get(`/api/scenarios/${id}`).set(auth(owner))).status).toBe(200);
  });

});
