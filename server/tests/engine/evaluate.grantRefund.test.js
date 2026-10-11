// D1 and grants (seat 2 on #49): on sale the CPF refund, grants included, goes back into the buyers' own OA
// (CPF: refund on sale), so a grant is not a debt. The measure subtracts only the refund of the household's own CPF;
// the grant part comes back as cpfGrantRefundCents. No hand-worked values: each fixture case runs with its grants
// and with none (evaluateGrants scaled to 0), and the expectations come from the outcomes' own fields.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate } from '../../src/engine/index.js';
import { loadRuleset } from '../../src/engine/rules/loadRuleset.js';

const grantScale = vi.hoisted(() => ({ value: 1 }));
vi.mock('../../src/engine/rules/grants.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    evaluateGrants: (...args) => {
      const out = actual.evaluateGrants(...args);
      const s = grantScale.value;
      return { ...out, ehg: out.ehg * s, familyGrant: out.familyGrant * s, phg: out.phg * s, total: out.total * s };
    },
  };
});

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/evaluate.json', import.meta.url), 'utf8'),
);
const { ruleset } = loadRuleset();

const runWithGrants = (c, scale) => {
  grantScale.value = scale;
  try {
    return evaluate(c.inputs.profile, c.inputs.choice, c.inputs.assumptions, ruleset);
  } finally {
    grantScale.value = 1;
  }
};

describe.each(fixture.cases.map((c) => [c.id, c]))('evaluate, grants and the D1 measure: %s', (_id, c) => {
  let withGrants;
  let noGrants;
  beforeAll(() => {
    withGrants = runWithGrants(c, 1);
    noGrants = runWithGrants(c, 0);
  });

  it('the setup has grants, all used against the price', () => {
    expect(withGrants.totalGrantsCents).toBeGreaterThan(0);
    expect(withGrants.totalGrantsCents).toBeLessThan(withGrants.purchasePriceCents);
    expect(noGrants.totalGrantsCents).toBe(0);
  });

  // Both cases' horizons are years after the grants are used, so the grants have earned interest
  it('the grant refund is the grants plus their interest, and 0 with no grants', () => {
    expect(withGrants.cpfGrantRefundCents).toBeGreaterThan(withGrants.totalGrantsCents);
    expect(noGrants.cpfGrantRefundCents).toBe(0);
  });

  // Without the grant the gap is paid from the OA, the loan or cash, each costing at least its face value by the
  // horizon, so the grant must raise net position by at least its own amount.
  it('grants raise net position by at least their amount', () => {
    expect(withGrants.netPositionCents - noGrants.netPositionCents).toBeGreaterThanOrEqual(withGrants.totalGrantsCents);
  });

  it('the full refund is still reported: the grant part is inside it', () => {
    expect(withGrants.cpfRefundPrincipalCents + withGrants.cpfAccruedInterestCents)
      .toBeGreaterThanOrEqual(withGrants.cpfGrantRefundCents);
  });
});
