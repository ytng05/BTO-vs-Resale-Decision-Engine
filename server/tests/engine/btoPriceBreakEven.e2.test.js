// SEAT 1. D40 exact figures: the BTO price at which E2 (BTO Standard, Sembawang 4-room) stops coming out ahead of
// E1's resale flat bought by E2's household under E2's assumptions (horizon 2033). Expected values come from seat 1's
// hand-worked case (d40-template.xlsx at S$511,578 and d40-template-511577.xlsx at S$511,577, "E2 BTO" B130,
// 2026-10-31), NOT from the code under test or from AI-generated output. The resale net position (B136) is an input
// taken from evaluate(), as in gap-template.xlsx: the E1 sheet uses other inputs and stops at 2031.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';
import { solveBtoPriceBreakEven } from '../../src/engine/solvers/btoPriceBreakEven.js';

const fixture = JSON.parse(readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'));
const E1 = fixture.cases.find((c) => c.id.startsWith('E1')).inputs;
const E2 = fixture.cases.find((c) => c.id.startsWith('E2')).inputs;
const ruleset = loadRuleset().ruleset;
const { profile, assumptions } = E2;
const bto = (cents) => evaluate(profile, { ...E2.choice, purchasePriceCents: cents }, assumptions, ruleset);

const RESALE_NET_CENTS = 11_375_014; // B136, input from evaluate()

describe('D40: E2 against E1 flips between S$511,577 and S$511,578', () => {
  it('the resale side is the input the sheet used', () => {
    expect(evaluate(profile, E1.choice, assumptions, ruleset).netPositionCents).toBe(RESALE_NET_CENTS);
  });

  it('at S$511,577 BTO\'s net position is S$113,750.35, at least resale\'s', () => {
    expect(bto(51_157_700).netPositionCents).toBe(11_375_035);
    expect(11_375_035).toBeGreaterThanOrEqual(RESALE_NET_CENTS);
  });

  it('at S$511,578 BTO\'s net position is S$113,749.22, below resale\'s', () => {
    expect(bto(51_157_800).netPositionCents).toBe(11_374_922);
    expect(11_374_922).toBeLessThan(RESALE_NET_CENTS);
  });

  it('at S$511,578 the loan is capped and the retained OA covers the shortfall (D28 v3)', () => {
    const o = bto(51_157_800);
    expect(o.loanPrincipalCents).toBe(38_368_300); // B81
    expect(o.outstandingLoanAtHorizonCents).toBe(32_132_957); // B92
    expect(o.housingCashSpentCents).toBe(19_774_360); // B103
  });

  it('the solver returns S$511,577 for HDB\'s S$450,000 to S$560,000 range', () => {
    const r = solveBtoPriceBreakEven({
      profile, choiceA: E2.choice, choiceB: E1.choice, assumptions, ruleset,
      hdbRangeCents: { min: 45_000_000, max: 56_000_000 },
    });
    expect(r).toMatchObject({ priceCents: 51_157_700, atHdbMin: 'A', atHdbMax: 'B' });
  });
});
