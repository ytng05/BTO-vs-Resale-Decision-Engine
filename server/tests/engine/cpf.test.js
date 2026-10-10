// SEAT 1. Expected values come from the hand-worked fixture (engine/fixtures/accrued-interest.json,
// worked month by month in accrued-interest-worked.xlsx under D2 and D12), NOT from the code under
// test or from AI-generated output. This file only turns each fixture case into a ledger.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeAccruedInterest } from '../../src/engine/cpf/accruedInterest.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../src/engine/fixtures/accrued-interest.json', import.meta.url), 'utf8'),
);

// Month n of a case (1 = purchase month) as an ISO date on the 1st of that month.
function monthDate({ startYear, startMonth }, n) {
  const index = startYear * 12 + (startMonth - 1) + (n - 1);
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

// Fixture inputs → ledger. Lump sum in month 1, an instalment every month from 1 to the sale month
// inclusive, and the grant in its grant month, matching the worked spreadsheet.
function ledgerFor(inputs) {
  const ledger = [{ date: monthDate(inputs, 1), amountCents: inputs.lumpSumCents, kind: 'LUMP_SUM' }];
  if (inputs.monthlyInstalmentCents > 0) {
    for (let n = 1; n <= inputs.saleMonth; n += 1) {
      ledger.push({ date: monthDate(inputs, n), amountCents: inputs.monthlyInstalmentCents, kind: 'INSTALMENT' });
    }
  }
  if (inputs.grantCents > 0) {
    ledger.push({ date: monthDate(inputs, inputs.grantMonth), amountCents: inputs.grantCents, kind: 'GRANT' });
  }
  return ledger;
}

// A fixed ruleset slice per case, so a policy update to the live ruleset can't change these results.
function rulesetFor(inputs) {
  return {
    cpf: {
      oaInterestRate: inputs.oaRate,
      accruedInterestCompounding: inputs.compounding,
      partialMonthTreatment: 'EXCLUDE_BOTH',
    },
  };
}

describe('computeAccruedInterest: hand-worked fixture cases', () => {
  it.each(fixture.cases.map((c) => [c.id, c]))('%s', (_id, c) => {
    const result = computeAccruedInterest(
      ledgerFor(c.inputs),
      monthDate(c.inputs, c.inputs.saleMonth),
      rulesetFor(c.inputs),
    );
    expect(result.principalCents).toBe(c.expected.principalCents);
    expect(result.accruedInterestCents).toBe(c.expected.accruedInterestCents);
    expect(result.totalCents).toBe(c.expected.totalRefundCents);
  });
});

describe('computeAccruedInterest: compounding convention', () => {
  // D2: CPF compounds annually. MONTHLY is not modelled, so it must fail loudly, not silently.
  it('rejects any compounding mode other than ANNUAL', () => {
    const ruleset = { cpf: { oaInterestRate: 0.025, accruedInterestCompounding: 'MONTHLY' } };
    const ledger = [{ date: '2027-01-01', amountCents: 8000000, kind: 'LUMP_SUM' }];
    expect(() => computeAccruedInterest(ledger, '2028-01-01', ruleset)).toThrow(/MONTHLY/);
  });
});
