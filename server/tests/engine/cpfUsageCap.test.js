// SEAT 1 (D37, #42). The CPF usage cap for a lease that doesn't cover the youngest buyer to 95:
// factor x Valuation Limit (valuation = price), grants included, across purchase and instalments.
// Rule tests use no money figures; the hand-worked case is seat 1's (engine/fixtures/cpf-usage-cap.json).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../../src/engine/fixtures/${name}`, import.meta.url), 'utf8'));
const fixture = read('evaluate.json');
const worked = read('cpf-usage-cap.json');
const merge = (base, extra) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(base?.[k] ?? {}, v) : v;
  }
  return out;
};
const ruleset = merge(loadRuleset().ruleset, fixture.rulesetOverrides);
const E1 = fixture.cases.find((c) => c.id === worked.case.baseCaseId).inputs;
const { leaseMustCoverYoungestToAge: COVER_TO, leaseProRating: { percentPerYearShort: PER_YEAR } } =
  ruleset.cpf.housingUsageLeaseRule;

// E1 (resale, buys in 2027) with the given ages today, OA per buyer, price and lease.
function run({ ages, oaEach, priceCents, lease, rules = ruleset }) {
  const profile = {
    ...E1.profile,
    applicants: E1.profile.applicants.map((a, i) => ({ ...a, age: ages[i], cpfOaBalanceCents: oaEach })),
  };
  const choice = { ...E1.choice, purchasePriceCents: priceCents, marketValueAtKeysCents: priceCents, remainingLeaseYears: lease };
  return evaluate(profile, choice, { ...E1.assumptions, horizonYear: 2045 }, rules);
}
const yearsToPurchase = E1.choice.applicationYear - E1.assumptions.evaluationStartYear;
const paidFrom = (o, id) => o.costBreakdown.find((c) => c.id === id).paidFrom;

describe('CPF usage cap (D37): seat 1\'s hand-worked case', () => {
  const { case: c, expected: x } = worked;
  const o = run({ ages: c.agesToday, oaEach: c.cpfOaBalanceCentsEach, priceCents: c.purchasePriceCents, lease: c.remainingLeaseYears });

  it('the cap stops OA at the price, and the loan takes up what it stopped', () => {
    expect(o.loanPrincipalCents).toBe(x.loanPrincipalCents);
    expect(o.affordability.shortfallCents).toBe(x.loanShortfallCents);
    expect(o.cpfUsedAtPurchaseCents).toBe(x.cpfUsedAtPurchaseCents);
  });

  it('with the cap used up, stamp duty and legal fees are paid in cash', () => {
    expect(paidFrom(o, 'BSD')).toBe(x.bsdPaidFrom);
    expect(paidFrom(o, 'LEGAL')).toBe(x.legalPaidFrom);
    expect(o.cashRequiredAtPurchaseCents).toBe(x.cashRequiredAtPurchaseCents);
  });

  it('every instalment is paid in cash, so no more CPF is used after purchase', () => {
    expect(paidFrom(o, 'LOAN_INTEREST')).toBe(x.firstInstalmentPaidFrom);
    expect(o.cpfSavingsRefundPrincipalCents).toBe(x.cpfUsedAtPurchaseCents); // own OA, to the horizon
    expect(o.cpfRefundPrincipalCents).toBe(x.cpfUsageCapCents); // own OA + grants = the whole cap
  });
});

describe('CPF usage cap (D37): rules', () => {
  const capFor = (o, ages, lease) => {
    const short = Math.max(0, COVER_TO - (Math.min(...ages) + yearsToPurchase + lease));
    return { short, cap: Math.floor((o.purchasePriceCents * Math.max(0, 100 - PER_YEAR * short)) / 100) };
  };
  const cases = [];
  for (const ages of [[30, 31], [38, 40], [45, 47]]) {
    for (const oaEach of [6000000, 15000000, 25000000]) {
      for (const lease of [50, 55, 60, 69]) {
        for (const priceCents of [30000000, 42000000]) cases.push({ ages, oaEach, lease, priceCents });
      }
    }
  }

  it('never uses more CPF (own OA + grants, to the horizon) than the cap when the lease falls short', () => {
    let capped = 0;
    for (const k of cases) {
      const o = run(k);
      const { short, cap } = capFor(o, k.ages, k.lease);
      if (short === 0) continue;
      expect(o.cpfRefundPrincipalCents, JSON.stringify(k)).toBeLessThanOrEqual(cap);
      if (o.cpfRefundPrincipalCents === cap) capped += 1;
    }
    expect(capped).toBeGreaterThan(0); // the cap actually bites in some of these cases
  });

  it('changes nothing when the lease covers the youngest buyer to 95', () => {
    // Same household with the cover-to age lowered so no lease falls short: outcomes must be identical.
    const noShortfall = merge(ruleset, { cpf: { housingUsageLeaseRule: { leaseMustCoverYoungestToAge: 0 } } });
    for (const k of cases) {
      const o = run(k);
      if (capFor(o, k.ages, k.lease).short > 0) continue;
      expect(o, JSON.stringify(k)).toEqual(run({ ...k, rules: noShortfall }));
    }
  });
});
