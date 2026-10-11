const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

const fractionRateFields = new Set([
  'cpf.oaInterestRate',
  'loans.hdbRatePremium',
  'loans.stressTestRate.hdbLoanFloor',
  'loans.stressTestRate.bankLoanFloor',
]);

const unitByField = {
  incomeAveragingMonths: 'months',
  employmentMonthsRequired: 'months',
  leaseMustCoverToAge: 'age',
  minRemainingLeaseYearsResale: 'years',
  nearDistanceKm: 'km',
  maxTenureYears: 'years',
  mopYears: 'years',
  reducedIfTenureYearsOver: 'years',
  reducedIfLoanEndsAfterAge: 'age',
  ageLimit: 'age',
  leaseBufferYears: 'years',
  leaseMustCoverYoungestToAge: 'age',
};

const sourceTitles = new Map([
  ['https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-housing-grant', 'CPF Board: EHG & PHG guide'],
  ['https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2027', 'CPF Board: interest rates Oct–Dec 2026'],
  ['https://ask.gov.sg/cpf/questions/cm0f52kzh01d1pz7aq4i1wz4y', 'CPF Board: accrued interest answer'],
  ['https://www.cpf.gov.sg/service/article/how-is-my-cpf-interest-computed-and-credited-into-my-accounts', 'CPF Board: how interest is computed'],
  ['https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/', 'MoneySense: how much can you afford'],
  ['https://www.mof.gov.sg/news-resources/newsroom/buyer-s-stamp-duty-bsd-rates-to-be-raised-for-higher-value-properties/', 'MOF: BSD rates'],
  ['https://www.mas.gov.sg/regulation/explainers/new-housing-loans/loan-tenure-and-loan-to-value-limits', 'MAS: loan tenure and LTV limits'],
  ['https://www.mas.gov.sg/regulation/explainers/tdsr-for-property-loans/calculating-tdsr', 'MAS: Calculating TDSR'],
  ['https://www.mom.gov.sg/newsroom/press-releases/2019/0509-more-flexibility-to-buy-a-home-for-life', 'MOM: 2019 more flexibility to buy a home for life'],
  ['https://www.mas.gov.sg/news/parliamentary-replies/2022/reply-to-parliamentary-question-on-setting-total-debt-servicing-ratio-medium-term-interest-rate-floor-at-4-per-cent-per-annum', 'MAS: 2022 reply on the 4% interest rate floor'],
  ['https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/understanding-your-eligibility-and-housing-loan-options/housing-loan-options/housing-loan-from-hdb', 'HDB: Housing Loan from HDB'],
  ['https://discover.nyc.gov.sg/finlit/Life-Hacks/Housing/How-to-save-for-your-first-home-and-use-housing-grants', 'NYC: saving for your first home and housing grants'],
  ['https://www.hdb.gov.sg/residential/buying-a-flat/conditions-after-buying', 'HDB: conditions after buying'],
  ['https://www.hdb.gov.sg/about-us/news-and-publications/press-releases/hdb-launches-9012-flats-in-february-2026-bto-and-sbf-exercises', 'HDB: Feb 2026 BTO press release'],
  ['https://www.hdb.gov.sg/business/estate-agents-and-salespersons/letters-to-keos/Measures-to-Cool-the-HDB-Resale-Market-and-Provide-Greater-Support-for-First-time-Home-Buyers', 'HDB: Aug 2024 loan measures'],
  ['https://www.hdb.gov.sg/business/estate-agents-and-salespersons/letters-to-keos/Increased-CPF-Housing-Grant-for-resale-flat-buyers', 'HDB: resale CPF Housing Grant'],
  ['https://www.hdb.gov.sg/-/media/buying-a-flat/flat-grant-and-loan-eligibility/couples-and-families/enhanced-cpf-housing-grant/EHG-amount-Families.pdf', 'HDB: EHG amount for families'],
  ['https://www.togetherforbetter.gov.sg/lifestage/youngadults/', 'Together for Better: housing grants'],
  ['https://www.mynicehome.gov.sg/get-started/hdb-grants-guide/', 'MyNiceHome: HDB grants guide'],
  ['https://www.madeforfamilies.gov.sg/support-measures/housing/housing-schemes-and-grants', 'Made For Families: housing schemes and grants'],
]);

function formatPercent(value) {
  return `${new Intl.NumberFormat('en-SG', { maximumFractionDigits: 2 }).format(value)}%`;
}

export function formatMinCashDownpayment({ hdbLoan, bankLoan }) {
  const parts = [];
  if (typeof hdbLoan === 'number') parts.push(`HDB loan ${formatPercent(hdbLoan)} (can be fully CPF)`);
  if (typeof bankLoan?.atMaxLtv === 'number') {
    const reduced = typeof bankLoan.atReducedLtv === 'number' ? ` (${formatPercent(bankLoan.atReducedLtv)} at reduced LTV)` : '';
    parts.push(`bank loan ${formatPercent(bankLoan.atMaxLtv)}${reduced}`);
  }
  return parts.length ? parts.join(', ') : 'Not yet verified';
}

export function formatRuleValue(path, value) {
  if (value === null || value === undefined) return 'Not yet verified';
  if (path === 'loans.ltv.bankLoan.ageBasis' && value === 'IWAA') return 'income-weighted average age';
  if (path === 'loans.hdbLoanTenure.ageBasis' && value === 'AVERAGE') return 'average applicant age';
  if (path.endsWith('.percentPerYearShort') && typeof value === 'number') return `${formatPercent(value)} per year`;
  if (path === 'cpf.accruedInterestCompounding' && value === 'ANNUAL') return 'Annual (computed monthly)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (typeof value === 'number') {
    if (fractionRateFields.has(path) || path.endsWith('.subsidyRecoveryRate')) {
      return formatPercent(value * 100);
    }
    if (path.endsWith('Percent') || path.endsWith('ratePercent')) {
      return formatPercent(value);
    }
    if (/(incomeCeiling|grantAmount|amounts\.|buyerStampDutyTiers.*\.portion|legalFees|agentFees)/i.test(path)) {
      return currencyFormatter.format(value);
    }

    const field = path.split('.').at(-1);
    const unit = unitByField[field] ?? (path.includes('.maxTenureYears.') ? unitByField.maxTenureYears : undefined);
    if (unit === 'age') return `age ${value}`;
    if (unit) return `${value} ${unit}`;
  }

  return String(value);
}

export function sourceTitle(url) {
  if (sourceTitles.has(url)) return sourceTitles.get(url);

  try {
    const parsed = new URL(url);
    const lastPath = parsed.pathname.split('/').filter(Boolean).at(-1);
    const pageName = lastPath
      ? decodeURIComponent(lastPath).replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '')
      : parsed.hostname.replace(/^www\./, '');
    return `${parsed.hostname.replace(/^www\./, '')}: ${pageName}`;
  } catch {
    return url;
  }
}
