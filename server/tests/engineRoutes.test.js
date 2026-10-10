// SEAT 1. Route tests for the CPF and stamp-duty endpoints. Expected values come from the hand-worked
// fixtures; the ruleset is mocked from those fixtures so a ruleset update can't change these results.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';

const readFixture = (name) =>
  JSON.parse(readFileSync(new URL(`../src/engine/fixtures/${name}`, import.meta.url), 'utf8'));
const cpfFixture = readFixture('accrued-interest.json');
const bsdFixture = readFixture('buyer-stamp-duty.json');

const testRuleset = {
  cpf: { oaInterestRate: 0.025, accruedInterestCompounding: 'ANNUAL', partialMonthTreatment: 'EXCLUDE_BOTH' },
  transactionCosts: { buyerStampDutyTiers: bsdFixture.tiers },
};
const mockLoad = vi.fn();
vi.mock('../src/engine/rules/loadRuleset.js', () => ({ loadRuleset: (...args) => mockLoad(...args) }));

const { createApp } = await import('../src/app.js');
const app = createApp();

beforeEach(() => {
  mockLoad.mockReturnValue({ ruleset: testRuleset, version: 'test-ruleset', status: 'VERIFIED' });
});

// Month n of a fixture case (1 = purchase month) as 'YYYY-MM-01'.
function monthDate({ startYear, startMonth }, n) {
  const index = startYear * 12 + (startMonth - 1) + (n - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`;
}
function withdrawalsFor(i) {
  const list = [{ date: monthDate(i, 1), amountCents: i.lumpSumCents, kind: 'LUMP_SUM' }];
  if (i.monthlyInstalmentCents > 0) {
    for (let n = 1; n <= i.saleMonth; n += 1) {
      list.push({ date: monthDate(i, n), amountCents: i.monthlyInstalmentCents, kind: 'INSTALMENT' });
    }
  }
  if (i.grantCents > 0) list.push({ date: monthDate(i, i.grantMonth), amountCents: i.grantCents, kind: 'GRANT' });
  return list;
}

describe('POST /api/cpf/accrued-interest', () => {
  it.each(cpfFixture.cases.map((c) => [c.id, c]))('returns the hand-worked result: %s', async (_id, c) => {
    const res = await request(app)
      .post('/api/cpf/accrued-interest')
      .send({ withdrawals: withdrawalsFor(c.inputs), asOfDate: monthDate(c.inputs, c.inputs.saleMonth) });
    expect(res.status).toBe(200);
    expect(res.body.principalCents).toBe(c.expected.principalCents);
    expect(res.body.accruedInterestCents).toBe(c.expected.accruedInterestCents);
    expect(res.body.totalCents).toBe(c.expected.totalRefundCents);
    expect(res.body.rulesetVersion).toBe('test-ruleset');
  });

  it('rejects a malformed date with 400', async () => {
    const res = await request(app)
      .post('/api/cpf/accrued-interest')
      .send({ withdrawals: [{ date: '2027/01/01', amountCents: 100 }], asOfDate: '2028-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a withdrawal dated after the sale with 400', async () => {
    const res = await request(app)
      .post('/api/cpf/accrued-interest')
      .send({ withdrawals: [{ date: '2029-01-01', amountCents: 100 }], asOfDate: '2028-01-01' });
    expect(res.status).toBe(400);
  });

  it('returns 503 when the ruleset has no verified CPF rate', async () => {
    mockLoad.mockReturnValue({ ruleset: { cpf: { oaInterestRate: null } }, version: 'template', status: 'TEMPLATE' });
    const res = await request(app)
      .post('/api/cpf/accrued-interest')
      .send({ withdrawals: [], asOfDate: '2028-01-01' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('RULESET_UNAVAILABLE');
  });
});

describe('POST /api/stamp-duty', () => {
  it.each(bsdFixture.cases.map((c) => [c.id, c]))('returns the hand-worked BSD: %s', async (_id, c) => {
    const res = await request(app).post('/api/stamp-duty').send({ priceCents: c.priceCents });
    expect(res.status).toBe(200);
    expect(res.body.bsdCents).toBe(c.expectedBsdCents);
  });

  it('rejects a zero or non-integer price with 400', async () => {
    for (const priceCents of [0, -1, 12.5, '55000000']) {
      const res = await request(app).post('/api/stamp-duty').send({ priceCents });
      expect(res.status).toBe(400);
    }
  });
});
