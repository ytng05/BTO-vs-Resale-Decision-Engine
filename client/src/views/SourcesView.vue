<script setup>
import { computed, onMounted, ref } from 'vue';
import { getRuleset } from '../api/client.js';
import { formatMinCashDownpayment, formatRuleValue, isDerivedAssumption, sourceTitle, statedAssumptionText } from './sourcesFormatting.js';

const response = ref(null);
const loading = ref(true);
const errorMessage = ref('');

const ruleLabels = {
  'grants.ehg.incomeCeiling.family': 'EHG income ceiling (families)',
  'grants.ehg.incomeCeiling.single': 'EHG income ceiling (singles)',
  'grants.ehg.incomeAveragingMonths': 'EHG income averaging period',
  'grants.ehg.employmentMonthsRequired': 'EHG employment condition',
  'grants.ehg.leaseMustCoverToAge': 'EHG lease coverage age',
  'grants.ehg.minRemainingLeaseYearsResale': 'EHG minimum remaining resale lease',
  'grants.ehg.tiers': 'EHG grant by monthly household income',
  'grants.eligibilityCombinations.firstTimerWithSecondTimer.ehgIncomeCeiling': 'EHG ceiling: first-timer + second-timer couple',
  'grants.eligibilityCombinations.firstTimerWithSecondTimer.ehgTiers': 'EHG for first-timer + second-timer couples (by half of household income)',
  'grants.familyGrant.incomeCeiling': 'Family Grant income ceiling',
  'grants.familyGrant.amounts.SC_SC.2-4 room': 'Family Grant: SC+SC, 2–4 room',
  'grants.familyGrant.amounts.SC_SC.5-room+': 'Family Grant: SC+SC, 5-room+',
  'grants.familyGrant.amounts.SC_PR.2-4 room': 'Family Grant: SC+PR, 2–4 room',
  'grants.proximityHousingGrant.amounts.livingWithParentsOrChild.families': 'PHG: living with parents/child (families)',
  'grants.proximityHousingGrant.amounts.livingWithParentsOrChild.singles': 'PHG: living with parents/child (singles)',
  'grants.proximityHousingGrant.amounts.livingNear.families': 'PHG: living near parents (families)',
  'grants.proximityHousingGrant.amounts.livingNear.singles': 'PHG: living near parents (singles)',
  'grants.proximityHousingGrant.nearDistanceKm': 'PHG near-distance threshold',
  'cpf.oaInterestRate': 'CPF OA interest rate',
  'cpf.accruedInterestCompounding': 'Accrued interest method',
  'cpf.housingUsageLeaseRule.leaseMustCoverYoungestToAge': 'CPF usage: lease must cover youngest buyer to age',
  'cpf.housingUsageLeaseRule.leaseProRating.percentPerYearShort': 'CPF usage pro-rating: reduction per year short of 95',
  'loans.msrPercent': 'Mortgage Servicing Ratio (MSR)',
  'loans.tdsrPercent': 'Total Debt Servicing Ratio (TDSR)',
  'loans.ltv.hdbLoan.maxPercent': 'LTV: HDB loan maximum',
  'loans.ltv.bankLoan.maxPercent': 'LTV: bank loan maximum',
  'loans.ltv.bankLoan.reducedMaxPercent': 'LTV: reduced bank loan maximum',
  'loans.ltv.bankLoan.reducedIfTenureYearsOver': 'Reduced bank LTV: tenure threshold',
  'loans.ltv.bankLoan.reducedIfLoanEndsAfterAge': 'Reduced bank LTV: loan-end age threshold',
  'loans.ltv.bankLoan.ageBasis': 'Age basis for joint borrowers',
  'loans.minCashDownpaymentPercent': 'Minimum cash downpayment',
  'loans.hdbRatePremium': 'HDB concessionary loan rate',
  'loans.maxTenureYears.hdbLoan': 'Maximum tenure: HDB loan',
  'loans.maxTenureYears.bankLoanHdbFlats': 'Maximum tenure: bank loan for HDB flats',
  'loans.hdbLoanTenure.ageLimit': 'HDB loan tenure: borrower age limit at loan end',
  'loans.hdbLoanTenure.ageBasis': 'HDB loan tenure: age basis for joint borrowers',
  'loans.hdbLoanTenure.leaseBufferYears': 'HDB loan tenure: remaining lease buffer',
  'loans.ltv.hdbLoan.leaseMustCoverYoungestToAge': 'HDB loan LTV: lease must cover youngest buyer to age',
  'loans.ltv.hdbLoan.leaseProRating.percentPerYearShort': 'HDB loan LTV pro-rating: reduction per year of lease short of 95',
  'loans.stressTestRate.hdbLoanFloor': 'Stress-test rate floor: HDB loan',
  'loans.stressTestRate.bankLoanFloor': 'Stress-test rate floor: bank loan',
  'loans.hdbLoanOaRetentionPerBuyer': 'HDB loan: OA savings each buyer may keep',
  'eligibility.newFlatIncomeCeiling.family': 'Income ceiling: new HDB flat (families)',
  'loans.hdbLoanIncomeCeiling.family': 'Income ceiling: HDB housing loan (families)',
  'loans.btoDownpaymentStages.hdbLoan.atSigningPercent': 'BTO HDB loan: paid at signing',
  'loans.btoDownpaymentStages.hdbLoan.atKeysPercent': 'BTO HDB loan: paid at keys',
  'loans.btoDownpaymentStages.bankLoan.atReducedLtv.atSigningPercent': 'BTO bank loan (55% LTV): paid at signing',
  'loans.btoDownpaymentStages.bankLoan.atReducedLtv.minCashAtSigningPercent': 'BTO bank loan (55% LTV): minimum cash at signing',
  'loans.btoDownpaymentStages.bankLoan.atReducedLtv.atKeysPercent': 'BTO bank loan (55% LTV): paid at keys',
  'loans.btoDownpaymentStages.bankLoan.atMaxLtv': 'BTO bank loan (75% LTV): staged payments',
  'btoWaiting.shorterWaitingTimeThresholdMonths': 'BTO: shorter waiting time threshold',
  'btoWaiting.defaultMonths': 'BTO: default waiting time (assumption)',
  'btoWaiting.monthsToAgreementForLease': 'BTO: months from application to signing (assumption)',
  'classifications.STANDARD.mopYears': 'MOP: Standard BTO',
  'classifications.PLUS.mopYears': 'MOP: Plus BTO',
  'classifications.PRIME.mopYears': 'MOP: Prime BTO',
  'classifications.STANDARD.subsidyRecoveryRate': 'Subsidy recovery rate: Standard BTO',
  'classifications.PLUS.subsidyRecoveryRate': 'Subsidy recovery rate: Plus BTO (per project)',
  'classifications.PRIME.subsidyRecoveryRate': 'Subsidy recovery rate: Prime BTO (per project)',
  'classifications.STANDARD.resaleBuyerIncomeCeiling': 'Resale buyer income ceiling: Standard BTO',
  'classifications.PLUS.resaleBuyerIncomeCeiling': 'Resale buyer income ceiling: Plus BTO',
  'classifications.PRIME.resaleBuyerIncomeCeiling': 'Resale buyer income ceiling: Prime BTO',
  'transactionCosts.buyerStampDutyTiers': 'Buyer’s Stamp Duty: marginal rates',
};

const tierArrayKeys = new Set(['tiers', 'ehgTiers', 'buyerStampDutyTiers']);
const omittedRuleKeys = new Set(['appliesTo', 'sources', 'partialMonthTreatment', 'legalFees', 'agentFees']);
const expandedSectionIds = ref(new Set(['ehg']));
const expandedTierKeys = ref(new Set());

const navigationItems = [
  { id: 'ehg', label: 'EHG' },
  { id: 'family-grant', label: 'Family Grant' },
  { id: 'phg', label: 'PHG' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'cpf', label: 'CPF' },
  { id: 'loans', label: 'Loans' },
  { id: 'income-eligibility', label: 'Eligibility (new flat)' },
  { id: 'costs', label: 'Costs' },
  { id: 'flat-types', label: 'Flat types' },
  { id: 'bto-waiting', label: 'BTO waiting' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'data', label: 'Data' },
];

function fallbackLabel(path) {
  return path
    .split('.')
    .map((part) => part.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2'))
    .join(' / ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatIncomeBand(value) {
  const band = String(value);
  const upperOnly = band.match(/^<=([\d,]+)$/);
  if (upperOnly) return `≤ $${upperOnly[1]}`;

  const lowerOnly = band.match(/^>([\d,]+)$/);
  if (lowerOnly) return `> $${lowerOnly[1]}`;

  const range = band.match(/^([\d,]+)-([\d,]+)$/);
  if (range) return `$${range[1]} – $${range[2]}`;

  return band;
}

function makeTierTable(path, tiers) {
  const isStampDuty = path.endsWith('buyerStampDutyTiers');
  const bandKey = isStampDuty ? 'portion' : 'monthlyHouseholdIncomeBand' in (tiers[0] ?? {})
    ? 'monthlyHouseholdIncomeBand'
    : 'halfHouseholdIncomeBand';

  return {
    key: path,
    title: ruleLabels[path] ?? fallbackLabel(path),
    headers: isStampDuty ? ['Portion', 'Rate'] : ['Monthly household income', 'Grant'],
    rows: tiers.map((tier) => isStampDuty
      ? [formatRuleValue(`${path}.portion`, tier.portion), formatRuleValue(`${path}.ratePercent`, tier.ratePercent)]
      : [formatIncomeBand(tier[bandKey] ?? 'Not yet verified'), formatRuleValue(`${path}.grantAmount`, tier.grantAmount)]),
  };
}

function amountsIn(value) {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(amountsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(amountsIn);
  return [];
}

function maximumAmount(value) {
  const amounts = amountsIn(value);
  return amounts.length ? Math.max(...amounts) : null;
}

function sectionKeyFact(id, rules, activeRules) {
  const money = (value) => formatRuleValue('grants.ehg.tiers.grantAmount', value);
  const appliesTo = rules?.appliesTo?.map((path) => path === 'BTO' ? 'BTO' : 'resale').join(' and ');

  if (id === 'ehg') {
    const ceilingAmount = maximumAmount(rules?.tiers?.map((tier) => tier.grantAmount));
    return ceilingAmount === null ? 'Grant tiers not yet verified' : `Up to ${money(ceilingAmount)} · ${appliesTo ?? 'availability per ruleset'}`;
  }
  if (id === 'family-grant') {
    const ceilingAmount = maximumAmount(rules?.amounts);
    return ceilingAmount === null ? 'Grant amounts not yet verified' : `Up to ${money(ceilingAmount)} · ${appliesTo ?? 'availability per ruleset'}`;
  }
  if (id === 'phg') {
    const withFamily = rules?.amounts?.livingWithParentsOrChild?.families;
    const nearFamily = rules?.amounts?.livingNear?.families;
    return typeof withFamily === 'number' && typeof nearFamily === 'number'
      ? `${money(withFamily)} living with · ${money(nearFamily)} near`
      : 'Proximity grant amounts not yet verified';
  }
  if (id === 'eligibility') {
    const prPrEligible = rules?.citizenship?.PR_PR?.familyGrantEligible;
    const firstTimerRule = rules?.firstTimerWithSecondTimer;
    const ceiling = firstTimerRule?.ehgIncomeCeiling;
    const maximumEHG = maximumAmount(firstTimerRule?.ehgTiers?.map((tier) => tier.grantAmount));
    const householdFact = typeof prPrEligible === 'boolean'
      ? `PR+PR ${prPrEligible ? 'eligible' : 'not eligible'} for Family Grant`
      : 'Citizenship eligibility per ruleset';
    const secondTimerFact = typeof ceiling === 'number' && maximumEHG !== null
      ? `First + second-timer EHG ceiling ${formatRuleValue('grants.ehg.incomeCeiling.single', ceiling)}; up to ${money(maximumEHG)}`
      : '';
    return [householdFact, secondTimerFact].filter(Boolean).join(' · ');
  }
  if (id === 'cpf') {
    const rate = rules?.oaInterestRate;
    const compounding = rules?.accruedInterestCompounding;
    return typeof rate === 'number'
      ? `OA rate ${formatRuleValue('cpf.oaInterestRate', rate)} · ${compounding === 'ANNUAL' ? 'compounded annually' : 'compounding per ruleset'}`
      : 'CPF rules not yet verified';
  }
  if (id === 'loans') {
    const ltv = rules?.ltv?.hdbLoan?.maxPercent;
    return typeof ltv === 'number' ? `LTV up to ${formatRuleValue('loans.ltv.hdbLoan.maxPercent', ltv)}` : 'Loan rules not yet verified';
  }
  if (id === 'costs') {
    const rates = rules?.buyerStampDutyTiers?.map((tier) => tier.ratePercent).filter(Number.isFinite) ?? [];
    return rates.length ? `BSD marginal rates ${Math.min(...rates)}%–${Math.max(...rates)}%` : 'Cost rules not yet verified';
  }
  if (id === 'flat-types') {
    const standard = activeRules?.classifications?.STANDARD?.mopYears;
    const plus = activeRules?.classifications?.PLUS?.mopYears;
    const prime = activeRules?.classifications?.PRIME?.mopYears;
    return [standard, plus, prime].every((value) => typeof value === 'number')
      ? `MOP ${standard} / ${plus} / ${prime} years (Standard / Plus / Prime)`
      : 'Classification rules not yet verified';
  }
  if (id === 'bto-waiting') {
    const threshold = rules?.shorterWaitingTimeThresholdMonths;
    return typeof threshold === 'number'
      ? `Shorter waiting time flats: under ${formatRuleValue('btoWaiting.shorterWaitingTimeThresholdMonths', threshold)}`
      : 'BTO waiting rules not yet verified';
  }
  return '';
}

function collectRules(value, path, rows, tierTables, activeRules) {
  if (omittedRuleKeys.has(path.split('.').at(-1)) || path.split('.').some((part) => part.startsWith('_'))) return;
  if (value === null && /^grants\.eligibilityCombinations\.citizenship\.(SC_SC|SC_PR)$/.test(path)) return;

  if (path === 'grants.eligibilityCombinations.citizenship.PR_PR' && value && typeof value === 'object') {
    rows.push({
      rule: 'Family Grant: PR+PR household',
      value: value.familyGrantEligible === false ? 'Not eligible' : formatRuleValue(path, value.familyGrantEligible),
      note: value.familyGrantReason ?? '',
    });
    return;
  }

  if (path === 'loans.minCashDownpaymentPercent' && value && typeof value === 'object') {
    rows.push({ rule: ruleLabels[path], value: formatMinCashDownpayment(value) });
    return;
  }

  if (Array.isArray(value)) {
    if (tierArrayKeys.has(path.split('.').at(-1))) {
      if (value.length) tierTables.push(makeTierTable(path, value));
      else rows.push({ rule: ruleLabels[path] ?? fallbackLabel(path), value: 'Not yet verified' });
      return;
    }
    value.forEach((item, index) => collectRules(item, `${path}.${index + 1}`, rows, tierTables, activeRules));
    return;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([key]) => !omittedRuleKeys.has(key) && !key.startsWith('_'));
    if (!entries.length) {
      rows.push({ rule: ruleLabels[path] ?? fallbackLabel(path), value: 'Not yet verified' });
      return;
    }
    const firstRow = rows.length;
    entries.forEach(([key, nestedValue]) => {
      const rowsBefore = rows.length;
      collectRules(nestedValue, `${path}.${key}`, rows, tierTables, activeRules);
      const statedNote = statedAssumptionText(value[`_${key}Note`]);
      if (statedNote) rows.slice(rowsBefore).forEach((row) => { row.note = `Stated assumption: ${statedNote}`; });
    });
    if (isDerivedAssumption(value._note)) {
      rows.slice(firstRow).forEach((row) => { row.note = 'Derived assumption: not a published formula.'; });
    }
    return;
  }

  if (path === 'loans.hdbRatePremium') {
    const oaRate = activeRules?.cpf?.oaInterestRate;
    const combinedRate = typeof oaRate === 'number' && typeof value === 'number'
      ? formatRuleValue('cpf.oaInterestRate', oaRate + value)
      : 'Not yet verified';
    rows.push({ rule: ruleLabels[path] ?? fallbackLabel(path), value: combinedRate });
    return;
  }

  rows.push({
    rule: ruleLabels[path] ?? fallbackLabel(path),
    value: formatRuleValue(path, value),
  });
}

function sectionTitle(title, appliesTo) {
  if (!appliesTo?.length) return title;
  const paths = appliesTo.map((path) => path === 'BTO'
    ? 'BTO'
    : path.charAt(0) + path.slice(1).toLowerCase()).join(' and ');
  return `${title} (${paths}${appliesTo.length === 1 ? ' only' : ''})`;
}

function makeSection(id, title, path, rules, activeRules) {
  if (!rules) return null;

  const rows = [];
  const tierTables = [];
  Object.entries(rules).forEach(([key, value]) => collectRules(value, `${path}.${key}`, rows, tierTables, activeRules));
  return {
    id,
    title: sectionTitle(title, rules.appliesTo),
    keyFact: sectionKeyFact(id, rules, activeRules),
    sources: [...new Set(rules.sources ?? [])],
    rows,
    tierTables,
  };
}

const ruleGroups = computed(() => {
  const rules = response.value?.rules;
  if (!rules) return [];

  const grants = rules.grants ?? {};
  return [
    makeSection('ehg', 'EHG', 'grants.ehg', grants.ehg, rules),
    makeSection('family-grant', 'Family Grant', 'grants.familyGrant', grants.familyGrant, rules),
    makeSection('phg', 'PHG', 'grants.proximityHousingGrant', grants.proximityHousingGrant, rules),
    makeSection('eligibility', 'Grant eligibility', 'grants.eligibilityCombinations', grants.eligibilityCombinations, rules),
    makeSection('cpf', 'CPF', 'cpf', rules.cpf, rules),
    makeSection('loans', 'Loans', 'loans', rules.loans, rules),
    makeSection('income-eligibility', 'Eligibility', 'eligibility', rules.eligibility, rules),
    makeSection('costs', 'Transaction costs', 'transactionCosts', rules.transactionCosts, rules),
    makeSection('flat-types', 'Flat types', 'classifications', rules.classifications, rules),
    makeSection('bto-waiting', 'BTO waiting', 'btoWaiting', rules.btoWaiting, rules),
  ].filter(Boolean);
});

const allSectionsExpanded = computed(() => ruleGroups.value.length > 0
  && ruleGroups.value.every((section) => expandedSectionIds.value.has(section.id)));

function toggleAllSections() {
  expandedSectionIds.value = allSectionsExpanded.value
    ? new Set()
    : new Set(ruleGroups.value.map((section) => section.id));
}

function syncSectionOpen(id, event) {
  const isOpen = event.currentTarget.open;
  if (expandedSectionIds.value.has(id) === isOpen) return;
  const next = new Set(expandedSectionIds.value);
  if (isOpen) next.add(id);
  else next.delete(id);
  expandedSectionIds.value = next;
}

function visibleTierRows(table) {
  return expandedTierKeys.value.has(table.key) ? table.rows : table.rows.slice(0, 5);
}

function isTierExpanded(table) {
  return expandedTierKeys.value.has(table.key);
}

function toggleTierRows(table) {
  const next = new Set(expandedTierKeys.value);
  if (next.has(table.key)) next.delete(table.key);
  else next.add(table.key);
  expandedTierKeys.value = next;
}

const assumptions = computed(() => [
  { title: 'CPF partial months', description: 'Months when CPF is withdrawn and when the flat is sold are excluded (pending CPF Board confirmation).' },
  { title: 'Employment', description: '12-month employment condition is assumed for applicants.' },
  { title: 'Income averaging', description: 'Monthly income is treated as the 12-month average at assessment.' },
  { title: 'EHG lease pro-rating', description: 'Pro-rating is not applied; actual EHG may be lower when the lease does not cover the youngest buyer to age 95.' },
  { title: 'HDB loan LTV lease pro-rating', description: 'HDB does not publish a formula. We assume LTV falls 2% for each year the lease is short of 95, using the 2019 MOM/CPF examples for CPF usage limits (two data points).' },
  { title: 'PHG near distance', description: 'Whether your home is near your parents or child is declared by you; no distance is measured.' },
  { title: 'BTO value from nearby towns', description: 'A new BTO flat is valued from near-new resale sales (90+ years left) in its town. When the town has fewer than 5 in the last 12 months, sales from a fixed, hand-picked list of nearby towns are pooled in (e.g. Bishan uses Toa Payoh and Ang Mo Kio; Tengah uses Bukit Batok, Jurong West and Choa Chu Kang). Decision D41.' },
  { title: 'Rules held constant', description: `Current rules (ruleset ${response.value?.version ?? 'not yet verified'}) are held constant in projections.` },
  { title: 'Legal & agent fees', description: 'Estimates; these are not verified policy values.' },
]);

const datasets = [
  { name: 'HDB resale transactions', provider: 'data.gov.sg', identifier: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc', licence: 'Singapore Open Data Licence' },
  { name: 'Price Range of HDB Flats Offered', provider: 'data.gov.sg', identifier: 'd_2d493bdcc1d9a44828b6e71cb095b88d', licence: 'Singapore Open Data Licence' },
  { name: 'HDB Resale Price Index', provider: 'data.gov.sg', identifier: 'HDB Resale Price Index', licence: 'Singapore Open Data Licence' },
];

function metadataValue(value) {
  return value ?? 'Not yet verified';
}

onMounted(async () => {
  try {
    response.value = await getRuleset();
    if (!response.value?.rules) throw new Error('The ruleset endpoint did not return rule details.');
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load ruleset information.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="sources-page" aria-labelledby="sources-title">
    <header class="sources-heading">
      <h1 class="h2 mb-2" id="sources-title" data-cy="sources-title">Data sources and rules</h1>
      <p class="text-secondary mb-0">Policy values are loaded from the active, versioned ruleset.</p>
    </header>

    <p v-if="loading" class="sources-state" role="status">Loading ruleset information…</p>
    <div v-else-if="errorMessage" class="alert alert-warning" role="alert">
      {{ errorMessage }}
    </div>

    <template v-else>
      <section class="sources-section sources-ruleset-card" aria-labelledby="ruleset-info-title">
        <div class="sources-section__heading">
          <h2 class="h4 mb-0" id="ruleset-info-title">Ruleset information</h2>
          <span v-if="response.status === 'TEMPLATE'" class="badge text-bg-warning" data-cy="sources-template-badge">
            Template / not fully verified
          </span>
          <span v-else class="badge sources-verified-badge">
            <span aria-hidden="true">✓</span> Verified
          </span>
        </div>
        <dl class="sources-metadata" data-cy="sources-ruleset-version">
          <div><dt>Version</dt><dd>{{ metadataValue(response.version) }}</dd></div>
          <div><dt>Effective date</dt><dd>{{ metadataValue(response.effectiveDate) }}</dd></div>
          <div><dt>Verified on</dt><dd>{{ metadataValue(response.verifiedOn) }}</dd></div>
          <div><dt>Verified by</dt><dd>{{ metadataValue(response.verifiedBy) }}</dd></div>
        </dl>
      </section>

      <nav class="sources-quick-nav" aria-label="Jump to Sources sections">
        <a v-for="item in navigationItems" :key="item.id" :href="`#sources-section-${item.id}`">{{ item.label }}</a>
      </nav>

      <section class="sources-section" aria-labelledby="rules-title">
        <div class="sources-section__heading">
          <h2 class="h4 mb-0" id="rules-title">Rules and sources</h2>
          <button
            class="btn btn-outline-primary btn-sm"
            type="button"
            data-cy="sources-expand-all"
            :aria-expanded="allSectionsExpanded"
            @click="toggleAllSections"
          >
            {{ allSectionsExpanded ? 'Collapse all' : 'Expand all' }}
          </button>
        </div>
        <div data-cy="sources-rules-table" class="sources-rule-cards">
          <details
            v-for="section in ruleGroups"
            :id="`sources-section-${section.id}`"
            :key="section.id"
            class="sources-rule-card"
            :open="expandedSectionIds.has(section.id)"
            @toggle="syncSectionOpen(section.id, $event)"
          >
            <summary class="sources-rule-card__summary">
              <span class="sources-rule-card__heading">
                <span class="sources-rule-card__title">{{ section.title }}</span>
                <span class="sources-rule-card__fact">{{ section.keyFact }}</span>
              </span>
              <svg class="sources-rule-card__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
              </svg>
            </summary>
            <div class="sources-rule-card__body">
              <div class="table-responsive sources-table-wrap">
                <table v-if="section.rows.length" class="table table-hover align-middle sources-table w-100">
                  <colgroup><col class="sources-table__rule-column"><col class="sources-table__value-column"></colgroup>
                  <thead><tr><th scope="col">Rule</th><th scope="col">Value</th></tr></thead>
                  <tbody>
                    <tr v-for="row in section.rows" :key="row.rule">
                      <th scope="row" class="sources-table__rule">{{ row.rule }}</th>
                      <td class="sources-table__value">
                        {{ row.value }}
                        <small v-if="row.note" class="d-block text-secondary">{{ row.note }}</small>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <template v-for="tierTable in section.tierTables" :key="tierTable.key">
                  <table class="table table-hover align-middle sources-table sources-table--tiers w-100">
                    <caption class="sources-table__caption">{{ tierTable.title }}</caption>
                    <colgroup><col class="sources-table__rule-column"><col class="sources-table__value-column"></colgroup>
                    <thead><tr><th v-for="header in tierTable.headers" :key="header" scope="col">{{ header }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(tierRow, index) in visibleTierRows(tierTable)" :key="`${tierTable.key}-${index}`">
                        <td v-for="(cell, cellIndex) in tierRow" :key="cellIndex" :class="{ 'sources-table__numeric': cellIndex === 1 }">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <button
                    v-if="tierTable.rows.length > 5"
                    class="btn btn-link btn-sm sources-tier-toggle"
                    type="button"
                    :aria-expanded="isTierExpanded(tierTable)"
                    @click="toggleTierRows(tierTable)"
                  >
                    {{ isTierExpanded(tierTable) ? 'Show first 5 bands' : `Show all ${tierTable.rows.length} bands` }}
                  </button>
                </template>
              </div>
              <div v-if="section.sources.length" class="sources-rule-card__sources">
                <h4 class="sources-rule-card__sources-title">Sources</h4>
                <a
                  v-for="source in section.sources"
                  :key="source"
                  class="sources-source-chip"
                  :href="source"
                  :aria-label="`Open source: ${sourceTitle(source)} (new tab)`"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cy="sources-source-link"
                >
                  <span>{{ sourceTitle(source) }}</span>
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M9 2h5v5M14 2 7 9M12 9v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
                  </svg>
                </a>
              </div>
            </div>
          </details>
        </div>
      </section>

      <section id="sources-section-assumptions" class="sources-section" aria-labelledby="assumptions-title">
        <h2 class="h4 mb-3" id="assumptions-title">Assumptions</h2>
        <div class="sources-assumptions" data-cy="sources-assumptions">
          <article v-for="assumption in assumptions" :key="assumption.title" class="sources-assumption-card">
            <span class="sources-assumption-card__badge">Assumption</span>
            <h3 class="sources-assumption-card__title">{{ assumption.title }}</h3>
            <p class="sources-assumption-card__description">{{ assumption.description }}</p>
          </article>
        </div>
      </section>

      <section id="sources-section-data" class="sources-section" aria-labelledby="datasets-title" data-cy="sources-datasets">
        <h2 class="h4 mb-3" id="datasets-title">Datasets and services</h2>
        <div class="table-responsive sources-table-wrap">
          <table class="table align-middle sources-table">
            <thead><tr><th scope="col">Dataset / service</th><th scope="col">Provider / identifier</th><th scope="col">Licence</th></tr></thead>
            <tbody>
              <tr v-for="dataset in datasets" :key="dataset.name">
                <th scope="row">{{ dataset.name }}</th>
                <td>{{ dataset.provider }}<span class="d-block text-secondary small">{{ dataset.identifier }}</span></td>
                <td>{{ dataset.licence }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.sources-page {
  color: var(--text-primary);
}

.sources-heading {
  margin-bottom: var(--space-6);
  max-width: 75ch;
}

.sources-section {
  padding-block: var(--space-5);
  border-top: 1px solid var(--border);
  scroll-margin-top: var(--space-6);
}

.sources-ruleset-card {
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.sources-verified-badge {
  background: var(--success-fill);
  color: var(--success);
}

.sources-quick-nav {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: var(--space-2);
  margin-inline: calc(-1 * var(--space-3));
  padding: var(--space-2) var(--space-3);
  overflow-x: auto;
  border-block: 1px solid var(--border-subtle);
  background: var(--bg-surface-raised);
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}

.sources-quick-nav a {
  flex: 0 0 auto;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.sources-quick-nav a:hover {
  background: var(--accent-fill-3);
}

.sources-quick-nav a:focus-visible,
.sources-source-chip:focus-visible,
.sources-rule-card__summary:focus-visible,
.sources-tier-toggle:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}

.sources-rule-cards {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.sources-rule-card {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface-raised);
  box-shadow: var(--shadow-sm);
  scroll-margin-top: 5rem;
}

.sources-rule-card__summary {
  display: flex;
  min-height: 4.25rem;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  list-style: none;
}

.sources-rule-card__summary::-webkit-details-marker {
  display: none;
}

.sources-rule-card__heading {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.sources-rule-card__title {
  font-weight: 700;
}

.sources-rule-card__fact {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sources-rule-card__chevron {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  transition: transform var(--duration-base) var(--ease-out);
}

.sources-rule-card[open] .sources-rule-card__chevron {
  transform: rotate(180deg);
}

.sources-rule-card__body {
  padding: 0 var(--space-4) var(--space-4);
}

.sources-rule-card__sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.sources-rule-card__sources-title {
  flex: 0 0 100%;
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.sources-source-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
  text-decoration: none;
  transition: background-color var(--duration-base) var(--ease-out);
}

.sources-source-chip:hover {
  background: var(--accent-fill-3);
}

.sources-source-chip svg {
  width: 0.875rem;
  height: 0.875rem;
  flex: 0 0 auto;
}

.sources-tier-toggle {
  min-height: 2.75rem;
  padding-inline: var(--space-2);
}

.sources-metadata {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--space-4) var(--space-5);
  margin: 0;
}

.sources-metadata dt {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
}

.sources-metadata dd {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
}

.sources-assumptions {
  display: grid;
  max-width: 900px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  grid-auto-rows: 1fr;
  gap: var(--space-4);
}

.sources-assumption-card {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid var(--accent-fill-2);
  border-radius: var(--radius-md);
  background: var(--bg-surface-raised);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out);
}

.sources-assumption-card:hover,
.sources-assumption-card:focus-within {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.sources-assumption-card__badge {
  display: inline-flex;
  align-items: center;
  margin-bottom: var(--space-3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--accent-fill-2);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.sources-assumption-card__title {
  margin: 0 0 var(--space-2);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.sources-assumption-card__description {
  margin: 0;
  color: var(--text-secondary);
}

@media (max-width: 359.98px) {
  .sources-ruleset-card {
    padding: var(--space-3);
  }

  .sources-rule-card__summary {
    padding-inline: var(--space-3);
  }

  .sources-rule-card__body {
    padding-inline: var(--space-3);
  }
}

:global(html) {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  :global(html) {
    scroll-behavior: auto;
  }

  .sources-assumption-card,
  .sources-assumption-card:hover,
  .sources-assumption-card:focus-within,
  .sources-rule-card__chevron,
  .sources-source-chip {
    transform: none;
    transition: none;
  }
}

.sources-table-wrap {
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  background: var(--bg-surface);
}

.sources-table {
  width: 100%;
  min-width: 32rem;
  margin-bottom: 0;
  --bs-table-bg: var(--bg-surface);
}

.sources-table--tiers {
  min-width: 32rem;
}

.sources-table__rule-column {
  width: 60%;
}

.sources-table__value-column {
  width: 40%;
}

.sources-table__numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sources-table__caption {
  padding: var(--space-2) var(--space-4);
  color: var(--text-secondary);
  font-weight: 600;
  caption-side: top;
}

.sources-table th,
.sources-table td {
  padding: var(--space-3) var(--space-4);
}

.sources-table__group th {
  background: var(--accent-fill-3);
  color: var(--text-primary);
  font-weight: 700;
}

.sources-table__rule {
  min-width: 16rem;
  font-weight: 500;
}

.sources-table__value {
  min-width: 14rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sources-state {
  padding-block: var(--space-5);
  color: var(--text-secondary);
}
</style>
