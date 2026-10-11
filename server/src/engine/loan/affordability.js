// server/src/engine/loan/affordability.js

/**
 * Maximum loan for an HDB or bank loan (method v3, 11 Oct).
 *
 * Ties: if two limits are equal, the first in the order MSR, TDSR, LTV is
 * reported as the limitingRule.
 *
 * @param {object} inputs
 * @param {'HDB'|'BANK'} inputs.loanType
 * @param {number|null} inputs.loanRate - annual decimal (0.026); null for a bank loan
 * @param {number} inputs.tenureAskedYears
 * @param {number} inputs.purchasePriceCents
 * @param {number} inputs.remainingLeaseYears
 * @param {Array<{age: number, monthlyIncomeCents: number}>} inputs.applicants
 * @param {object} ruleset - uses ruleset.loans
 * @returns {{
 *   assessmentRate: number,
 *   ageUsed: number,
 *   tenureYears: number,
 *   msrLoanCents: number,
 *   tdsrLoanCents: number|null,
 *   ltvApplied: number,
 *   ltvProrated: boolean,
 *   ltvLoanCents: number,
 *   maxLoanCents: number,
 *   limitingRule: 'MSR'|'TDSR'|'LTV'
 * }} assessmentRate and ltvApplied are decimals (0.03, 0.75); tdsrLoanCents is null for an HDB loan
 * @throws {RangeError} if the tenure works out to 0 years or less
 *   (average age at or above the age limit, or lease at or below the buffer).
 */
export function computeMaxLoan(inputs, ruleset) {
  const loans = ruleset.loans;
  const isHdb = inputs.loanType === 'HDB';

  // Input and ruleset names in one place – rename here to match the contract
  const { applicants, loanRate, tenureAskedYears, purchasePriceCents: priceCents, remainingLeaseYears } = inputs;
  const ltvRules = isHdb ? loans.ltv.hdbLoan : loans.ltv.bankLoan;

  // 1. Household income (cents)
  const incomeCents = applicants.reduce((sum, a) => sum + a.monthlyIncomeCents, 0);

  // 2. Assessment rate: higher of floor and loan rate (HDB); floor only (bank)
  const assessmentRate = isHdb
    ? Math.max(loans.stressTestRate.hdbLoanFloor, loanRate)
    : loans.stressTestRate.bankLoanFloor;

  // 3. Age used, rounded up. Sums of whole numbers are divided once, so no float noise.
  const ageSum = applicants.reduce((sum, a) => sum + a.age, 0);
  const ageIncomeSum = applicants.reduce((sum, a) => sum + a.age * a.monthlyIncomeCents, 0);
  const ageUsed = isHdb
    ? Math.ceil(ageSum / applicants.length) // plain average
    : Math.ceil(ageIncomeSum / incomeCents); // IWAA

  // 4. Tenure in whole years
  const tenureYears = isHdb
    ? Math.min(
        tenureAskedYears,
        loans.maxTenureYears.hdbLoan,
        loans.hdbLoanTenure.ageLimit - ageUsed,
        remainingLeaseYears - loans.hdbLoanTenure.leaseBufferYears
      )
    : Math.min(tenureAskedYears, loans.maxTenureYears.bankLoanHdbFlats);

  if (tenureYears <= 0) {
    throw new RangeError(`Tenure works out to ${tenureYears} years; no loan is possible`);
  }

  // Loan supported by a monthly instalment cap (annuity), rounded to the cent once
  const r = assessmentRate / 12;
  const n = tenureYears * 12;
  const loanFromCap = (capCents) => Math.round((capCents * (1 - (1 + r) ** -n)) / r);

  // 5. MSR – integer maths on the whole-number percent
  const msrLoanCents = loanFromCap((incomeCents * loans.msrPercent) / 100);

  // 6. TDSR – bank only; null (not 0) for HDB
  const tdsrLoanCents = isHdb ? null : loanFromCap((incomeCents * loans.tdsrPercent) / 100);

  // 7. LTV
  let ltvPercent;
  let ltvProrated = false;
  if (isHdb) {
    ltvPercent = ltvRules.maxPercent;
    const youngestAge = Math.min(...applicants.map((a) => a.age));
    ltvProrated = youngestAge + remainingLeaseYears < ltvRules.leaseMustCoverYoungestToAge;
    // TODO: pro-rate (seat 2 formula). Until then ltvApplied stays at the unprorated maximum.
  } else {
    const reduced =
      tenureYears > ltvRules.reducedIfTenureYearsOver ||
      ageUsed + tenureYears > ltvRules.reducedIfLoanEndsAfterAge;
    ltvPercent = reduced ? ltvRules.reducedMaxPercent : ltvRules.maxPercent;
  }
  const ltvApplied = ltvPercent / 100;

  // 8. LTV loan – integer maths, floored to a whole cent (the loan may not exceed LTV)
  const ltvLoanCents = Math.floor((priceCents * ltvPercent) / 100);

  // 9. Smallest applicable limit, in tie order MSR, TDSR, LTV; rounded down to the dollar
  const limits = [['MSR', msrLoanCents]];
  if (!isHdb) limits.push(['TDSR', tdsrLoanCents]);
  limits.push(['LTV', ltvLoanCents]);

  let [limitingRule, smallestCents] = limits[0];
  for (const [name, cents] of limits.slice(1)) {
    if (cents < smallestCents) {
      limitingRule = name;
      smallestCents = cents;
    }
  }
  const maxLoanCents = Math.floor(smallestCents / 100) * 100;

  // 10. All ten fields
  return {
    assessmentRate,
    ageUsed,
    tenureYears,
    msrLoanCents,
    tdsrLoanCents,
    ltvApplied,
    ltvProrated,
    ltvLoanCents,
    maxLoanCents,
    limitingRule
  };
}
