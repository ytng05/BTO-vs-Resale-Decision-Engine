// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/evaluate.json, worked in
// evaluate-template-v2 under the contract v2 notes and D28–D32 as updated on #34), NOT from the code under test or from
// AI-generated output.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);

// Live ruleset plus the fixture's overrides, if any (none since #35 merged; kept so a case can pin a key).
const merge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
};
const ruleset = merge(loadRuleset().ruleset, fixture.rulesetOverrides);

const run = (c) => evaluate(c.inputs.profile, c.inputs.choice, c.inputs.assumptions, ruleset);

describe.each(fixture.cases.map((c) => [c.id, c]))('evaluate: %s', (_id, c) => {
  it('headline figures, timeline, affordability and warnings', () => {
    expect(run(c)).toMatchObject(c.expected);
  });

  it('grants by id', () => {
    const byId = Object.fromEntries(run(c).grants.map((g) => [g.id, g.amountCents]));
    expect(byId).toEqual(c.expectedGrants);
  });

  it('cost breakdown lines', () => {
    const lines = run(c).costBreakdown;
    for (const want of c.expectedCostLines) {
      expect(lines.find((l) => l.id === want.id)).toMatchObject(want);
    }
  });

  it('yearly cash flow, every row', () => {
    expect(run(c).yearlyCashFlow).toEqual(c.expectedYearlyCashFlow);
  });

  it('net position is the D1 sum of its parts (CPF savings refund only)', () => {
    const o = run(c);
    expect(o.netPositionCents).toBe(
      o.marketValueAtHorizonCents - o.outstandingLoanAtHorizonCents - o.cpfSavingsRefundPrincipalCents
        - o.cpfSavingsAccruedInterestCents - o.clawbackCents - o.housingCashSpentCents,
    );
  });

  it('savings + grant refund parts equal the deprecated combined fields, to the cent', () => {
    const o = run(c);
    expect(o.cpfSavingsRefundPrincipalCents + o.grantRefundPrincipalCents).toBe(o.cpfRefundPrincipalCents);
    expect(o.cpfSavingsAccruedInterestCents + o.grantRefundAccruedInterestCents).toBe(o.cpfAccruedInterestCents);
  });

  it('the horizon-year row carries the horizon refunds: savings-only and the deprecated combined one', () => {
    const o = run(c);
    const last = o.yearlyCashFlow.at(-1);
    expect(last.cpfSavingsObligationEndCents).toBe(o.cpfSavingsRefundPrincipalCents + o.cpfSavingsAccruedInterestCents);
    expect(last.cpfObligationEndCents).toBe(o.cpfRefundPrincipalCents + o.cpfAccruedInterestCents);
  });
});

describe('evaluate: out of scope and missing ruleset keys', () => {
  const e1 = fixture.cases[0].inputs;

  it("throws for a 'BANK' loan (not modelled yet, D32)", () => {
    const assumptions = { ...e1.assumptions, loanType: 'BANK' };
    expect(() => evaluate(e1.profile, e1.choice, assumptions, ruleset)).toThrow(/D32/);
  });

  it.each([
    'btoWaiting.monthsToAgreementForLease',
    'loans.hdbLoanOaRetentionPerBuyer',
    'loans.btoDownpaymentStages.hdbLoan.atSigningPercent',
  ])('throws, naming the key, when %s is missing', (path) => {
    const broken = structuredClone(ruleset);
    const keys = path.split('.');
    const last = keys.pop();
    delete keys.reduce((node, k) => node[k], broken)[last];
    expect(() => evaluate(e1.profile, e1.choice, e1.assumptions, broken)).toThrow(path);
  });
});

// Grants left over after the price go to SA/RA and MediSave, not the OA (HDB, seat 2 on #46). No hand-worked values:
// the expectations come from the outcome's own fields. E1's household with an empty OA and a flat cheaper than its
// $125,000 of grants, so the only money the OA could ever hold is a leftover grant.
describe('evaluate: grants above the price', () => {
  const e1 = fixture.cases[0].inputs;
  const profile = { ...e1.profile, applicants: e1.profile.applicants.map((a) => ({ ...a, cpfOaBalanceCents: 0 })) };
  const choice = { ...e1.choice, purchasePriceCents: 10_000_000, marketValueAtKeysCents: 10_000_000 };
  let o;
  beforeAll(() => {
    o = evaluate(profile, choice, e1.assumptions, ruleset);
  });

  it('the setup really has grants left over', () => {
    expect(o.totalGrantsCents).toBeGreaterThan(o.purchasePriceCents);
  });

  it('only the grant used against the price is refund principal, and no loan is needed', () => {
    expect(o.loanPrincipalCents).toBe(0);
    expect(o.cpfRefundPrincipalCents).toBe(o.purchasePriceCents);
  });

  it('the leftover never reaches the OA, so stamp duty and legal fees are paid in cash', () => {
    const paidFrom = Object.fromEntries(o.costBreakdown.map((l) => [l.id, l.paidFrom]));
    expect(paidFrom.BSD).toBe('CASH');
    expect(paidFrom.LEGAL).toBe('CASH');
  });
});

// Cash over valuation (Part B). Properties of the rule, not figures: a hand-worked case with exact amounts is
// still to come from seat 1. E1 bought S$70,000 above its valuation (the median) against the same flat at the median.
describe('evaluate: cash over valuation (resale)', () => {
  const e1 = fixture.cases[0].inputs;
  const e2 = fixture.cases[1].inputs;
  const overCents = 7_000_000;
  let atMedian;
  let over;
  beforeAll(() => {
    atMedian = evaluate(e1.profile, e1.choice, e1.assumptions, ruleset);
    over = evaluate(e1.profile, { ...e1.choice, purchasePriceCents: e1.choice.purchasePriceCents + overCents }, e1.assumptions, ruleset);
  });

  it('the loan limit and the loan are measured on the valuation, so paying more does not raise them', () => {
    expect(over.affordability.maxLoanCents).toBe(atMedian.affordability.maxLoanCents);
    expect(over.loanPrincipalCents).toBe(atMedian.loanPrincipalCents);
  });

  it('the amount above the valuation is paid in cash at purchase', () => {
    expect(over.cashRequiredAtPurchaseCents - atMedian.cashRequiredAtPurchaseCents).toBeGreaterThanOrEqual(overCents);
  });

  it('the flat is worth the same, so the net position falls by at least the overpayment', () => {
    expect(over.marketValueAtHorizonCents).toBe(atMedian.marketValueAtHorizonCents);
    expect(atMedian.netPositionCents - over.netPositionCents).toBeGreaterThanOrEqual(overCents);
  });

  it('a price below the valuation has no cash over valuation: the loan limit follows the lower price', () => {
    const under = evaluate(e1.profile, { ...e1.choice, purchasePriceCents: e1.choice.purchasePriceCents - overCents }, e1.assumptions, ruleset);
    expect(under.affordability.maxLoanCents).toBeLessThanOrEqual(atMedian.affordability.maxLoanCents);
    expect(under.cashRequiredAtPurchaseCents).toBeLessThanOrEqual(atMedian.cashRequiredAtPurchaseCents);
  });

  it('BTO has no valuation step: its fixture case is unchanged (E2 figures still hold above)', () => {
    const o = evaluate(e2.profile, e2.choice, e2.assumptions, ruleset);
    expect(o).toMatchObject(fixture.cases[1].expected);
  });
});
