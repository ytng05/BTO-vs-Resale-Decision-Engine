const currencyFormatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
});

const fractionRateFields = new Set([
  'cpf.oaInterestRate',
  'loans.hdbRatePremium',
]);

const unitByField = {
  incomeAveragingMonths: 'months',
  employmentMonthsRequired: 'months',
  leaseMustCoverToAge: 'age',
  nearDistanceKm: 'km',
  maxTenureYears: 'years',
  mopYears: 'years',
  reducedIfTenureYearsOver: 'years',
  reducedIfLoanEndsAfterAge: 'age',
};

const sourceTitles = new Map([
  ['https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-housing-grant', 'CPF Board: EHG & PHG guide'],
  ['https://www.cpf.gov.sg/member/infohub/news/news-releases/government-extends-4-per-cent-interest-rate-floor-on-special-medisave-and-retirement-account-monies-until-31-december-2027', 'CPF Board: interest rates Oct–Dec 2026'],
  ['https://ask.gov.sg/cpf/questions/cm0f52kzh01d1pz7aq4i1wz4y', 'CPF Board: accrued interest answer'],
  ['https://www.cpf.gov.sg/service/article/how-is-my-cpf-interest-computed-and-credited-into-my-accounts', 'CPF Board: how interest is computed'],
  ['https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/', 'MoneySense: how much can you afford'],
  ['https://www.mof.gov.sg/news-resources/newsroom/buyer-s-stamp-duty-bsd-rates-to-be-raised-for-higher-value-properties/', 'MOF: BSD rates'],
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

export function formatRuleValue(path, value) {
  if (value === null || value === undefined) return 'Not yet verified';
  if (path === 'cpf.accruedInterestCompounding' && value === 'ANNUAL') return 'Annual (computed monthly)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (typeof value === 'number') {
    if (fractionRateFields.has(path) || path.endsWith('.subsidyRecoveryRate')) {
      return formatPercent(value * 100);
    }
    if (path.endsWith('Percent') || path.endsWith('ratePercent') || path.includes('.ltv.')) {
      return formatPercent(value);
    }
    if (/(incomeCeiling|grantAmount|amounts\.|buyerStampDutyTiers.*\.portion|legalFees|agentFees)/i.test(path)) {
      return currencyFormatter.format(value);
    }

    const field = path.split('.').at(-1);
    const unit = unitByField[field];
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
