<script setup>
import { computed, onMounted, ref } from 'vue';
import { getRuleset } from '../api/client.js';
import { formatRuleValue, sourceTitle } from './sourcesFormatting.js';

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
  'loans.msrPercent': 'Mortgage Servicing Ratio (MSR)',
  'loans.tdsrPercent': 'Total Debt Servicing Ratio (TDSR)',
  'loans.ltv.hdbLoan.maxPercent': 'LTV: HDB loan maximum',
  'loans.ltv.bankLoan.maxPercent': 'LTV: bank loan maximum',
  'loans.ltv.bankLoan.reducedMaxPercent': 'LTV: reduced bank loan maximum',
  'loans.ltv.bankLoan.reducedIfTenureYearsOver': 'Reduced bank LTV: tenure threshold',
  'loans.ltv.bankLoan.reducedIfLoanEndsAfterAge': 'Reduced bank LTV: loan-end age threshold',
  'loans.hdbRatePremium': 'HDB concessionary loan rate',
  'loans.maxTenureYears.hdbLoan': 'Maximum tenure: HDB loan',
  'loans.maxTenureYears.bankLoanHdbFlats': 'Maximum tenure: bank loan for HDB flats',
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
    entries.forEach(([key, nestedValue]) => collectRules(nestedValue, `${path}.${key}`, rows, tierTables, activeRules));
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

function makeSection(title, path, rules, activeRules) {
  if (!rules) return null;

  const rows = [];
  const tierTables = [];
  Object.entries(rules).forEach(([key, value]) => collectRules(value, `${path}.${key}`, rows, tierTables, activeRules));
  return {
    title: sectionTitle(title, rules.appliesTo),
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
    makeSection('EHG', 'grants.ehg', grants.ehg, rules),
    makeSection('Family Grant', 'grants.familyGrant', grants.familyGrant, rules),
    makeSection('PHG', 'grants.proximityHousingGrant', grants.proximityHousingGrant, rules),
    makeSection('Grant eligibility combinations', 'grants.eligibilityCombinations', grants.eligibilityCombinations, rules),
    makeSection('CPF', 'cpf', rules.cpf, rules),
    makeSection('Loans', 'loans', rules.loans, rules),
    makeSection('Transaction costs', 'transactionCosts', rules.transactionCosts, rules),
    makeSection('Classifications', 'classifications', rules.classifications, rules),
  ].filter(Boolean);
});

const assumptions = computed(() => [
  { title: 'CPF partial months', description: 'Months when CPF is withdrawn and when the flat is sold are excluded (pending CPF Board confirmation).' },
  { title: 'Employment', description: '12-month employment condition is assumed for applicants.' },
  { title: 'Income averaging', description: 'Monthly income is treated as the 12-month average at assessment.' },
  { title: 'EHG lease pro-rating', description: 'Pro-rating is not applied; actual EHG may be lower when the lease does not cover the youngest buyer to age 95.' },
  { title: 'Legal & agent fees', description: 'Estimates; these are not verified policy values.' },
]);

const datasets = [
  { name: 'HDB resale transactions', provider: 'data.gov.sg', identifier: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc', licence: 'Singapore Open Data Licence' },
  { name: 'Price Range of HDB Flats Offered', provider: 'data.gov.sg', identifier: 'd_2d493bdcc1d9a44828b6e71cb095b88d', licence: 'Singapore Open Data Licence' },
  { name: 'HDB Resale Price Index', provider: 'data.gov.sg', identifier: 'HDB Resale Price Index', licence: 'Singapore Open Data Licence' },
  { name: 'Distance for the PHG assessment', provider: 'OneMap', identifier: 'OneMap distance service', licence: 'OneMap (SLA)' },
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
      <section class="sources-section" aria-labelledby="ruleset-info-title">
        <div class="sources-section__heading">
          <h2 class="h4 mb-0" id="ruleset-info-title">Ruleset information</h2>
          <span v-if="response.status === 'TEMPLATE'" class="badge text-bg-warning" data-cy="sources-template-badge">
            Template / not fully verified
          </span>
        </div>
        <dl class="sources-metadata" data-cy="sources-ruleset-version">
          <div><dt>Version</dt><dd>{{ metadataValue(response.version) }}</dd></div>
          <div><dt>Effective date</dt><dd>{{ metadataValue(response.effectiveDate) }}</dd></div>
          <div><dt>Verified on</dt><dd>{{ metadataValue(response.verifiedOn) }}</dd></div>
          <div><dt>Verified by</dt><dd>{{ metadataValue(response.verifiedBy) }}</dd></div>
        </dl>
      </section>

      <section class="sources-section" aria-labelledby="rules-title">
        <div class="sources-section__heading">
          <h2 class="h4 mb-0" id="rules-title">Rules and sources</h2>
        </div>
        <div data-cy="sources-rules-table">
          <section v-for="section in ruleGroups" :key="section.title" class="sources-rule-section" :aria-label="section.title">
            <h3 class="h5 sources-rule-section__title">{{ section.title }}</h3>
            <nav v-if="section.sources.length" class="sources-section-sources" :aria-label="`${section.title} sources`">
              <a v-for="source in section.sources" :key="source" :href="source" target="_blank" rel="noopener noreferrer">
                {{ sourceTitle(source) }}
              </a>
            </nav>
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
              <table v-for="tierTable in section.tierTables" :key="tierTable.key" class="table table-hover align-middle sources-table sources-table--tiers w-100">
                <caption class="sources-table__caption">{{ tierTable.title }}</caption>
                <colgroup><col class="sources-table__rule-column"><col class="sources-table__value-column"></colgroup>
                <thead><tr><th v-for="header in tierTable.headers" :key="header" scope="col">{{ header }}</th></tr></thead>
                <tbody>
                  <tr v-for="(tierRow, index) in tierTable.rows" :key="`${tierTable.key}-${index}`">
                    <td v-for="(cell, cellIndex) in tierRow" :key="cellIndex" :class="{ 'sources-table__numeric': cellIndex === 1 }">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      <section class="sources-section" aria-labelledby="assumptions-title">
        <h2 class="h4 mb-3" id="assumptions-title">Assumptions</h2>
        <div class="sources-assumptions" data-cy="sources-assumptions">
          <article v-for="assumption in assumptions" :key="assumption.title" class="sources-assumption-card">
            <span class="sources-assumption-card__badge">Assumption</span>
            <h3 class="sources-assumption-card__title">{{ assumption.title }}</h3>
            <p class="sources-assumption-card__description">{{ assumption.description }}</p>
          </article>
        </div>
      </section>

      <section class="sources-section" aria-labelledby="datasets-title" data-cy="sources-datasets">
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
}

.sources-rule-section + .sources-rule-section {
  margin-top: var(--space-5);
}

.sources-rule-section__title {
  margin-bottom: var(--space-2);
}

.sources-section-sources {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
  overflow-wrap: anywhere;
}

.sources-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
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

@media (prefers-reduced-motion: reduce) {
  .sources-assumption-card,
  .sources-assumption-card:hover,
  .sources-assumption-card:focus-within {
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
