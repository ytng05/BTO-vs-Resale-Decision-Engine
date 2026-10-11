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
 * @throws {RangeError} if an HDB loan has no numeric loanRate, or the tenure works out to 0 years or less
 *   (average age at or above the age limit, or lease at or below the buffer).
 * @throws {Error} for an HDB loan, if loans.ltv.hdbLoan.leaseProRating.percentPerYearShort isn't a number.
 */
export function computeMaxLoan(inputs, ruleset) {
  const loans = ruleset.loans;
  const isHdb = inputs.loanType === 'HDB';

  // Input and ruleset names in one place – rename here to match the contract
  const { applicants, loanRate, tenureAskedYears, purchasePriceCents: priceCents, remainingLeaseYears } = inputs;
  const ltvRules = isHdb ? loans.ltv.hdbLoan : loans.ltv.bankLoan;

  // An HDB loan needs its rate: Math.max(floor, null) would quietly assess at the floor
  if (isHdb && typeof loanRate !== 'number') {
    throw new RangeError(`loanRate must be a number for an HDB loan, got ${loanRate}`);
  }

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

  // 7. LTV in basis points (hundredths of a percent: 75% = 7500), so the maths stays in whole numbers.
  //    A decimal factor would not: 0.75 × (1 − 0.02 × 16) is 0.5099…, and the floor below would lose $1 (A6).
  let ltvBasisPoints;
  let ltvProrated = false;
  if (isHdb) {
    // Seat 2's DERIVED pro-rating (#35): factor % = 100 − percentPerYearShort × years short, never below 0,
    // where years short = years the lease falls short of covering the youngest buyer to 95.
    const percentPerYearShort = ltvRules.leaseProRating?.percentPerYearShort;
    if (typeof percentPerYearShort !== 'number') {
      throw new Error('Ruleset key loans.ltv.hdbLoan.leaseProRating.percentPerYearShort is missing or not a number');
    }
    const youngestAge = Math.min(...applicants.map((a) => a.age));
    const yearsShort = Math.max(0, ltvRules.leaseMustCoverYoungestToAge - (youngestAge + remainingLeaseYears));
    ltvProrated = yearsShort > 0;
    const factorPercent = Math.max(0, 100 - percentPerYearShort * yearsShort);
    // Whole basis points only while percentPerYearShort is a whole number (2 today); a fractional rate would
    // leave a fraction here, which the floor in step 8 still handles but no longer exactly.
    ltvBasisPoints = ltvRules.maxPercent * factorPercent;
  } else {
    const reduced =
      tenureYears > ltvRules.reducedIfTenureYearsOver ||
      ageUsed + tenureYears > ltvRules.reducedIfLoanEndsAfterAge;
    ltvBasisPoints = (reduced ? ltvRules.reducedMaxPercent : ltvRules.maxPercent) * 100;
  }
  const ltvApplied = ltvBasisPoints / 10000; // reported only, so a float is fine

  // 8. LTV loan – one multiply, one divide, one floor to a whole cent (the loan may not exceed LTV)
  const ltvLoanCents = Math.floor((priceCents * ltvBasisPoints) / 10000);

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
