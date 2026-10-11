import { describe, expect, it } from 'vitest';
import { formatMinCashDownpayment, formatRuleValue, isDerivedAssumption, statedAssumptionText } from '../src/views/sourcesFormatting.js';

describe('Sources view BTO waiting rules', () => {
  it('formats BTO waiting values as months', () => {
    expect(formatRuleValue('btoWaiting.shorterWaitingTimeThresholdMonths', 36)).toBe('36 months');
    expect(formatRuleValue('btoWaiting.defaultMonths', 48)).toBe('48 months');
    expect(formatRuleValue('btoWaiting.monthsToAgreementForLease', 9)).toBe('9 months');
  });

  it('extracts the text of a STATED ASSUMPTION note', () => {
    expect(statedAssumptionText('STATED ASSUMPTION: months from application.')).toBe('months from application.');
    expect(statedAssumptionText('Wait used = project wait')).toBeNull();
    expect(statedAssumptionText(undefined)).toBeNull();
  });
});

describe('Sources view derived assumptions', () => {
  it('recognises ruleset notes that flag a derived assumption', () => {
    expect(isDerivedAssumption('DERIVED ASSUMPTION: no published formula.')).toBe(true);
    expect(isDerivedAssumption('Assess with the higher of the floor and the actual rate')).toBe(false);
    expect(isDerivedAssumption(undefined)).toBe(false);
  });
});

describe('Sources view loan additions', () => {
  it('formats the IWAA age basis', () => {
    expect(formatRuleValue('loans.ltv.bankLoan.ageBasis', 'IWAA')).toBe('income-weighted average age');
  });

  it('formats minimum cash downpayment percents without scaling', () => {
    expect(formatMinCashDownpayment({ hdbLoan: 0, bankLoan: { atMaxLtv: 5, atReducedLtv: 10 } }))
      .toBe('HDB loan 0% (can be fully CPF), bank loan 5% (10% at reduced LTV)');
  });

  it('formats HDB loan tenure, lease rule and stress-test floors', () => {
    expect(formatRuleValue('loans.hdbLoanTenure.ageLimit', 65)).toBe('age 65');
    expect(formatRuleValue('loans.hdbLoanTenure.ageBasis', 'AVERAGE')).toBe('average applicant age');
    expect(formatRuleValue('loans.hdbLoanTenure.leaseBufferYears', 20)).toBe('20 years');
    expect(formatRuleValue('loans.ltv.hdbLoan.leaseMustCoverYoungestToAge', 95)).toBe('age 95');
    expect(formatRuleValue('loans.ltv.hdbLoan.leaseProRating.percentPerYearShort', 2)).toBe('2% per year');
    expect(formatRuleValue('loans.hdbLoanOaRetentionPerBuyer', 20000)).toBe('$20,000');
    expect(formatRuleValue('btoWaiting.monthsToAgreementForLease', 9)).toBe('9 months');
    expect(formatRuleValue('loans.stressTestRate.hdbLoanFloor', 0.03)).toBe('3%');
    expect(formatRuleValue('loans.stressTestRate.bankLoanFloor', 0.04)).toBe('4%');
  });
});

describe('Sources view rule value formatting', () => {
  it('formats percent-unit BSD rates without scaling', () => {
    expect(formatRuleValue('transactionCosts.buyerStampDutyTiers.ratePercent', 1)).toBe('1%');
  });

  it('formats fractional CPF interest rates as percentage points', () => {
    expect(formatRuleValue('cpf.oaInterestRate', 0.025)).toBe('2.5%');
  });

  it('formats annual compounding as computed monthly', () => {
    expect(formatRuleValue('cpf.accruedInterestCompounding', 'ANNUAL')).toBe('Annual (computed monthly)');
  });

  it('formats the reduced bank LTV tenure threshold in years', () => {
    expect(formatRuleValue('loans.ltv.bankLoan.reducedIfTenureYearsOver', 25)).toBe('25 years');
  });

  it('formats the reduced bank LTV loan-end threshold as an age', () => {
    expect(formatRuleValue('loans.ltv.bankLoan.reducedIfLoanEndsAfterAge', 65)).toBe('age 65');
  });

  it('formats HDB and bank maximum loan tenures in years', () => {
    expect(formatRuleValue('loans.maxTenureYears.hdbLoan', 25)).toBe('25 years');
    expect(formatRuleValue('loans.maxTenureYears.bankLoanHdbFlats', 30)).toBe('30 years');
  });

  it('formats the EHG minimum resale lease in years', () => {
    expect(formatRuleValue('grants.ehg.minRemainingLeaseYearsResale', 20)).toBe('20 years');
  });
});
