// D40 property tests: the BTO price at which the verdict flips. No expected amounts here: they compare runs of
// evaluate() with each other. The exact flip price comes from seat 1's hand-worked case in its own test.
import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';
import {
  BRACKET_HIGH, BRACKET_LOW, PRICE_STEP_CENTS, solveBtoPriceBreakEven,
} from '../../src/engine/solvers/btoPriceBreakEven.js';

const fixture = JSON.parse(readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs; // resale, Tampines 4-room
const E2 = fixture.cases.find((c) => c.id.startsWith('E2')).inputs; // BTO, Sembawang 4-room Standard

const ruleset = loadRuleset().ruleset;
const { profile, assumptions } = E2;
const bto = E2.choice;
const resale = E1.choice;

const net = (choice, p = profile) => evaluate(p, choice, assumptions, ruleset).netPositionCents;
const atPrice = (choice, cents) => ({ ...choice, purchasePriceCents: cents });
const winner = (margin) => (margin > 0 ? 'A' : margin < 0 ? 'B' : 'TIE');

// A range the E1 resale flat's net position falls inside, so the flip price is inside HDB's range ("split").
const HDB = { min: 45_000_000, max: 56_000_000 };
const solve = (over = {}) =>
  solveBtoPriceBreakEven({ profile, choiceA: bto, choiceB: resale, assumptions, hdbRangeCents: HDB, ruleset, ...over });

describe('evaluate(): net position never rises as the BTO price rises (D40 relies on it)', () => {
  // Classifications, OA balances, incomes and rent while waiting: the inputs that change how a price is paid for.
  const cases = [];
  for (const [classification, subsidyRecoveryRate] of [['STANDARD', 0], ['PLUS', 0.06], ['PRIME', 0.12]]) {
    for (const oaCents of [0, 5_000_000, 20_000_000]) {
      for (const incomeCents of [300_000, 700_000]) {
        for (const rentCents of [0, 200_000]) cases.push({ classification, subsidyRecoveryRate, oaCents, incomeCents, rentCents });
      }
    }
  }
  test.each(cases)('$classification, OA $oaCents, income $incomeCents, rent $rentCents', (c) => {
    const p = { ...profile, applicants: profile.applicants.map((a) => ({ ...a, cpfOaBalanceCents: c.oaCents, monthlyIncomeCents: c.incomeCents })) };
    const as = { ...assumptions, monthlyHousingCostWhileWaitingCents: c.rentCents };
    const choice = { ...bto, classification: c.classification, subsidyRecoveryRate: c.subsidyRecoveryRate };
    let previous = Infinity;
    for (let cents = 20_000_000; cents <= 90_000_000; cents += 500_000) {
      const now = evaluate(p, atPrice(choice, cents), as, ruleset).netPositionCents;
      assert.ok(now <= previous, `net position rose from ${previous} to ${now} at a price of ${cents}`);
      previous = now;
    }
  });
});

describe('solveBtoPriceBreakEven (D40)', () => {
  const resaleNet = net(resale);
  const margin = (cents) => net(atPrice(bto, cents)) - resaleNet;

  test('the bracket is half HDB\'s minimum to 1.5 × its maximum, in whole dollars', () => {
    const r = solve();
    assert.deepEqual(r.hdbRangeCents, HDB);
    assert.equal(r.bracketCents.min, Math.round((HDB.min * BRACKET_LOW) / PRICE_STEP_CENTS) * PRICE_STEP_CENTS);
    assert.equal(r.bracketCents.max, Math.round((HDB.max * BRACKET_HIGH) / PRICE_STEP_CENTS) * PRICE_STEP_CENTS);
  });

  test('the flip price is the last whole dollar at which BTO is ahead or level', () => {
    const { priceCents, bracketCents } = solve();
    assert.ok(Number.isInteger(priceCents) && priceCents % PRICE_STEP_CENTS === 0, `not whole dollars: ${priceCents}`);
    assert.ok(priceCents >= bracketCents.min && priceCents < bracketCents.max);
    assert.ok(margin(priceCents) >= 0, 'BTO should be ahead or level at the flip price');
    assert.ok(margin(priceCents + PRICE_STEP_CENTS) < 0, 'BTO should be behind one dollar above it');
  });

  test('the winners at HDB\'s minimum and maximum match evaluate()', () => {
    const r = solve();
    assert.equal(r.atHdbMin, winner(margin(HDB.min)));
    assert.equal(r.atHdbMax, winner(margin(HDB.max)));
    // This fixture's flip price lies inside HDB's range.
    assert.equal(r.atHdbMin, 'A');
    assert.equal(r.atHdbMax, 'B');
    assert.ok(r.priceCents >= HDB.min && r.priceCents < HDB.max);
  });

  test('no flip price when the other path is ahead across the whole bracket', () => {
    // The other path is the same BTO, cheaper than anything in the bracket.
    const cheaper = atPrice(bto, Math.round(HDB.min * BRACKET_LOW) - 5_000_000);
    const r = solve({ choiceB: cheaper });
    assert.equal(r.priceCents, null);
    assert.equal(r.atHdbMin, 'B');
    assert.equal(r.atHdbMax, 'B');
  });

  test('no flip price when BTO is ahead across the whole bracket', () => {
    // The other path is the same BTO, dearer than anything in the bracket.
    const dearer = atPrice(bto, Math.round(HDB.max * BRACKET_HIGH) + 5_000_000);
    const r = solve({ choiceB: dearer });
    assert.equal(r.priceCents, null);
    assert.equal(r.atHdbMin, 'A');
    assert.equal(r.atHdbMax, 'A');
  });

  test('a level result at HDB\'s maximum counts as a tie, and BTO is not behind there', () => {
    const same = atPrice(bto, HDB.max);
    const r = solve({ choiceB: same });
    assert.equal(r.atHdbMax, 'TIE');
    assert.ok(r.priceCents >= HDB.max);
  });

  test('changes none of its inputs', () => {
    const args = { profile, choiceA: bto, choiceB: resale, assumptions, hdbRangeCents: HDB, ruleset };
    const before = JSON.stringify({ ...args, ruleset: undefined });
    solveBtoPriceBreakEven(args);
    assert.equal(JSON.stringify({ ...args, ruleset: undefined }), before);
  });

  test('refuses a non-BTO path A and a range whose minimum is above its maximum', () => {
    assert.throws(() => solve({ choiceA: resale }), RangeError);
    assert.throws(() => solve({ hdbRangeCents: { min: HDB.max, max: HDB.min } }), RangeError);
  });
});
