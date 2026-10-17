// SEAT 1 (D34). These tests check explainGap()'s rules: the lines sum to the margin, follow the documented order
// and signs, and flip when the paths swap. They use evaluate() outputs only as inputs and contain no expected
// money figures; those come from a hand-worked pair at one horizon (the todo at the end).
// Skipped until engine/explainGap.js is written.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { explainGap } from '../../src/engine/explainGap.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);
const merge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
};
const ruleset = merge(loadRuleset().ruleset, fixture.rulesetOverrides);

// The fixture's resale (E1) and BTO (E2) cases, measured at one common horizon so they can be compared.
const HORIZON = 2033;
const caseById = (id) => fixture.cases.find((c) => c.id === id);
const at = (c, horizonYear) =>
  evaluate(c.inputs.profile, c.inputs.choice, { ...c.inputs.assumptions, horizonYear }, ruleset);
const bto = at(caseById('E2-bto-standard-hdb-loan'), HORIZON);
const resale = at(caseById('E1-resale-hdb-loan'), HORIZON);

const IDS = [
  'MARKET_VALUE', 'LOAN_OWED', 'CPF_PRINCIPAL', 'CPF_INTEREST', 'CLAWBACK',
  'RENT_WHILE_WAITING', 'RENOVATION', 'BSD', 'LEGAL', 'AGENT', 'CASH_PURCHASE',
];
const line = (gap, id) => gap.lines.find((l) => l.id === id).amountCents;
const sum = (gap) => gap.lines.reduce((s, l) => s + l.amountCents, 0);
const cashPart = (o, id) => {
  const l = o.costBreakdown.find((c) => c.id === id);
  return l.paidFrom === 'CASH' ? l.amountCents : 0;
};

describe.skip('explainGap (D34)', () => {
  it('lists every line once, in the documented order', () => {
    expect(explainGap(bto, resale).lines.map((l) => l.id)).toEqual(IDS);
  });

  it('margin is A minus B, and the lines sum to it exactly', () => {
    const gap = explainGap(bto, resale);
    expect(gap.horizonYear).toBe(HORIZON);
    expect(gap.marginCents).toBe(bto.netPositionCents - resale.netPositionCents);
    expect(sum(gap)).toBe(gap.marginCents);
  });

  it('swapping the paths negates the margin and every line', () => {
    const ab = explainGap(bto, resale);
    const ba = explainGap(resale, bto);
    expect(ba.marginCents).toBe(-ab.marginCents);
    for (const id of IDS) expect(line(ba, id)).toBe(-line(ab, id));
  });

  it('a path against itself: every line is 0', () => {
    const gap = explainGap(bto, bto);
    expect(gap.marginCents).toBe(0);
    for (const id of IDS) expect(line(gap, id)).toBe(0);
  });

  it('balance-sheet lines are the differences of those Outcome fields, signed to favour A', () => {
    const gap = explainGap(bto, resale);
    expect(line(gap, 'MARKET_VALUE')).toBe(bto.marketValueAtHorizonCents - resale.marketValueAtHorizonCents);
    expect(line(gap, 'LOAN_OWED')).toBe(resale.outstandingLoanAtHorizonCents - bto.outstandingLoanAtHorizonCents);
    expect(line(gap, 'CPF_PRINCIPAL')).toBe(resale.cpfRefundPrincipalCents - bto.cpfRefundPrincipalCents);
    expect(line(gap, 'CPF_INTEREST')).toBe(resale.cpfAccruedInterestCents - bto.cpfAccruedInterestCents);
    expect(line(gap, 'CLAWBACK')).toBe(resale.clawbackCents - bto.clawbackCents);
  });

  it('stamp duty and legal fees count only their cash-paid part', () => {
    const gap = explainGap(bto, resale);
    for (const id of ['BSD', 'LEGAL']) {
      expect(line(gap, id)).toBe(cashPart(resale, id) - cashPart(bto, id));
    }
  });

  it('reports each path\'s total grants beside the lines', () => {
    expect(explainGap(bto, resale).totalGrants).toEqual({ aCents: bto.totalGrantsCents, bCents: resale.totalGrantsCents });
  });

  it('refuses outcomes measured at different horizons', () => {
    expect(() => explainGap(bto, at(caseById('E1-resale-hdb-loan'), HORIZON + 1))).toThrow(RangeError);
  });

  it.todo('hand-worked pair at one horizon: every line matches the worked figure (seat 1)');
});
