// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/loan-schedule.json, worked in
// loan-schedule-template.xlsx under D23), NOT from the code under test or from AI-generated output.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildLoanSchedule } from '../../src/engine/loan/amortisation.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/loan-schedule.json', import.meta.url), 'utf8'),
);
const byId = (id) => fixture.cases.find((c) => c.id === id);
const totalInterest = (rows) => rows.reduce((sum, r) => sum + r.interestCents, 0);

describe('buildLoanSchedule: 1-year loan, every row', () => {
  const c = byId('loan-1-year');

  it('matches every hand-worked row', () => {
    expect(buildLoanSchedule(c.inputs)).toEqual(c.expected.rows);
  });
});

describe('buildLoanSchedule: 25-year HDB loan, checkpoints', () => {
  const c = byId('loan-25-years-hdb');
  const e = c.expected;

  it('has one row per instalment, from the month after keys', () => {
    const rows = buildLoanSchedule(c.inputs);
    expect(rows).toHaveLength(e.instalments);
    expect(rows[0].paymentDate).toBe(e.firstPaymentDate);
    expect(rows.at(-1).paymentDate).toBe(e.lastPaymentDate);
  });

  it('regular and final instalments, total interest, and a zero final balance', () => {
    const rows = buildLoanSchedule(c.inputs);
    expect(rows[0].instalmentCents).toBe(e.regularInstalmentCents);
    expect(rows.at(-1).instalmentCents).toBe(e.finalInstalmentCents);
    expect(totalInterest(rows)).toBe(e.totalInterestCents);
    expect(rows.at(-1).closingBalanceCents).toBe(0);
  });

  it.each(Object.entries(e.closingBalanceAfterMonthCents))('closing balance after month %s', (month, cents) => {
    expect(buildLoanSchedule(c.inputs)[Number(month) - 1].closingBalanceCents).toBe(cents);
  });
});

describe('buildLoanSchedule: every row is internally consistent', () => {
  it.each(fixture.cases.map((c) => [c.id, c]))('%s', (_id, c) => {
    const rows = buildLoanSchedule(c.inputs);
    rows.forEach((r, i) => {
      expect(r.principalRepaidCents).toBe(r.instalmentCents - r.interestCents);
      expect(r.closingBalanceCents).toBe(r.openingBalanceCents - r.principalRepaidCents);
      if (i > 0) expect(r.openingBalanceCents).toBe(rows[i - 1].closingBalanceCents);
    });
  });
});
