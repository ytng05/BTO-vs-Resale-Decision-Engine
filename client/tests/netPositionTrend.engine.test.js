// "Net position over time" against the real engine on seat 1's hand-worked cases (E1 resale, E2 BTO), also at a later
// horizon and as a Plus flat with a clawback. The chart's last year must be the engine's netPositionCents to the cent,
// so the chart can never disagree with the verdict. The expected figure is the engine's own; this test invents none.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../server/src/engine/index.js';
import { loadRuleset } from '../../server/src/engine/rules/loadRuleset.js';
import { netPositionByYear, trendRows } from '../src/utils/netPositionTrend.js';

const fixture = JSON.parse(readFileSync(new URL('../../server/src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const ruleset = loadRuleset().ruleset;
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs;
const E2 = fixture.cases.find((c) => c.id.startsWith('E2')).inputs;
const at = (c, horizonYear) => ({ ...c, assumptions: { ...c.assumptions, horizonYear } });
const run = (c) => evaluate(c.profile, c.choice, c.assumptions, ruleset);

const cases = [
  ['E1, resale', E1],
  ['E2, BTO', E2],
  ['E1 to 2041', at(E1, 2041)],
  ['E2 to 2041', at(E2, 2041)],
  ['E2 as a Plus flat (clawback)', { ...E2, choice: { ...E2.choice, classification: 'PLUS', subsidyRecoveryRate: 0.06 } }],
];

describe.each(cases)('netPositionByYear on %s', (_name, c) => {
  const o = run(c);
  const years = netPositionByYear(o);

  it('has one figure per engine row, none missing', () => {
    expect(years.map((y) => y.year)).toEqual(o.yearlyCashFlow.map((r) => r.year));
    years.forEach((y) => expect(typeof y.netCents).toBe('number'));
  });

  it('the last year is the engine net position, to the cent', () => {
    expect(years.at(-1).year).toBe(o.horizonYear);
    expect(years.at(-1).netCents).toBe(o.netPositionCents);
  });
});

it('the Plus case does have a clawback to take off', () => {
  const c = cases.at(-1)[1];
  expect(run(c).clawbackCents).toBeGreaterThan(0);
});

it('the grant refund is not taken off (D1): E1 has grants, and the deprecated combined CPF field would give less', () => {
  const o = run(E1);
  const last = o.yearlyCashFlow.at(-1);
  expect(o.totalGrantsCents).toBeGreaterThan(0);
  expect(last.cpfObligationEndCents).toBeGreaterThan(last.cpfSavingsObligationEndCents);
  expect(netPositionByYear(o).at(-1).netCents).toBe(o.netPositionCents);
});

it('trendRows puts BTO (path A) and resale (path B) side by side by year, in dollars', () => {
  const a = run(at(E2, 2041));
  const b = run(at(E1, 2041));
  const rows = trendRows(a, b);
  const last = rows.at(-1);
  expect(last.year).toBe(2041);
  expect(last.bto).toBe(a.netPositionCents / 100);
  expect(last.resale).toBe(b.netPositionCents / 100);
  expect(rows.map((r) => r.year)).toEqual([...rows.map((r) => r.year)].sort((x, y) => x - y));
});

it('a row with a missing figure gives null, not a wrong number', () => {
  const o = { yearlyCashFlow: [{ year: 2030, marketValueEndCents: 100, loanBalanceEndCents: null, cpfSavingsObligationEndCents: 0 }] };
  expect(netPositionByYear(o)).toEqual([{ year: 2030, netCents: null }]);
});
