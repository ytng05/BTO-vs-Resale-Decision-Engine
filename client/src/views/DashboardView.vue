<script setup>
// Feature 2: the financial dashboard. Both paths side by side, measured in the same year (contract v2, D1):
// net position, affordability, grants with every test's reason, what makes up the net position,
// the cost breakdown, and notes before deciding.
// What-if sliders re-run the comparison with changed assumptions. They are local only: the saved plan
// in the store never changes, and "Reset" goes back to it.
// Store and sliders hold dollars and fractions; client.js turns them into the contract's cents (D14).
// All money from the API is integer cents (API_CONTRACT.md); it is divided by 100 only for display.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import { validateStep } from '../validation/planValidation.js';
import { CLASSIFICATIONS, FLAT_TYPES, TOWNS } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';
import WhatIfPanel from '../components/dashboard/WhatIfPanel.vue';
import GrantsTable from '../components/dashboard/GrantsTable.vue';
import CashFlowChart from '../components/dashboard/CashFlowChart.vue';
import CostBreakdownTable from '../components/dashboard/CostBreakdownTable.vue';
import HistoricalRpiChart from '../components/HistoricalRpiChart.vue';

const store = useScenarioStore();
const thisYear = new Date().getFullYear();

// Same rule the stepper uses before it lets anyone reach the results.
const hasInputs = computed(() => [0, 1, 2].every((step) => Object.keys(validateStep(step, store)).length === 0));

// The two paths may start in different years; the year slider moves both and keeps the gap.
const yearGap = computed(() => (store.choiceB.applicationYear ?? 0) - (store.choiceA.applicationYear ?? 0));

function fromPlan() {
  return {
    applicationYear: store.choiceA.applicationYear ?? thisYear,
    annualPriceGrowth: store.assumptions.annualPriceGrowth ?? 0.03,
    annualIncomeGrowth: store.assumptions.annualIncomeGrowth ?? 0.02,
    // null = let the server pick its default (later key year + 10).
    horizonYear: store.assumptions.horizonYear ?? null,
    // Contract v2 defaults are 0: no rent (living with parents) and no renovation (D22).
    monthlyHousingCostWhileWaiting: store.assumptions.monthlyHousingCostWhileWaiting ?? 0,
    renovationA: store.choiceA.renovation ?? 0,
    renovationB: store.choiceB.renovation ?? 0,
  };
}
const whatIf = reactive(fromPlan());

function setWhatIf(next) {
  // Moving the start year moves a chosen comparison year with it, so the keys never land after it.
  const shift = next.applicationYear - whatIf.applicationYear;
  if (shift !== 0 && whatIf.horizonYear !== null) next = { ...next, horizonYear: next.horizonYear + shift };
  Object.assign(whatIf, next);
}
const reset = () => Object.assign(whatIf, fromPlan());

// A copy of the plan with the what-if values swapped in. compare() turns it into the contract's request.
const whatIfPlan = computed(() => ({
  profile: store.profile,
  choiceA: { ...store.choiceA, applicationYear: whatIf.applicationYear, renovation: whatIf.renovationA },
  choiceB: { ...store.choiceB, applicationYear: whatIf.applicationYear + yearGap.value, renovation: whatIf.renovationB },
  assumptions: {
    ...store.assumptions,
    annualPriceGrowth: whatIf.annualPriceGrowth,
    annualIncomeGrowth: whatIf.annualIncomeGrowth,
    horizonYear: whatIf.horizonYear,
    monthlyHousingCostWhileWaiting: whatIf.monthlyHousingCostWhileWaiting,
  },
}));

const result = ref(null);
const error = ref(null);
const updating = ref(false);
let timer = null;
let requestId = 0;

async function run() {
  const id = ++requestId;
  updating.value = true;
  error.value = null;
  try {
    const res = await compare(whatIfPlan.value);
    if (id === requestId) result.value = res; // ignore answers to older slider positions
  } catch (e) {
    if (id === requestId) {
      error.value = e?.response?.data?.error?.message || 'The comparison could not be loaded. Check your connection and try again.';
    }
  } finally {
    if (id === requestId) updating.value = false;
  }
}

onMounted(() => { if (hasInputs.value) run(); });
// Re-run 250 ms after the last slider move, not on every pixel of a drag.
watch(whatIf, () => {
  if (!hasInputs.value) return;
  clearTimeout(timer);
  timer = setTimeout(run, 250);
});
onBeforeUnmount(() => clearTimeout(timer));

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);
const A = computed(() => result.value?.outcomeA);
const B = computed(() => result.value?.outcomeB);
// v2: both paths are measured at one calendar year (D1).
const horizon = computed(() => result.value?.horizonYear ?? A.value?.horizonYear ?? whatIf.horizonYear);

// The comparison year cannot be before either path's keys. Keys come from the last result's timeline.
const yearOf = (date) => (typeof date === 'string' ? Number(date.slice(0, 4)) : null);
const latestKeyYear = computed(() => {
  const years = [A.value, B.value].map((o) => yearOf(o?.timeline?.keyCollectionDate)).filter(Boolean);
  return years.length ? Math.max(...years) : whatIf.applicationYear + 5;
});
const horizonLimits = computed(() => ({ min: latestKeyYear.value, max: latestKeyYear.value + 30 }));

// Positive when BTO (Path A) ends ahead, same sign as ResultsView.
const gapCents = computed(() => {
  const a = A.value?.netPositionCents;
  const b = B.value?.netPositionCents;
  return typeof a === 'number' && typeof b === 'number' ? a - b : null;
});

const headline = computed(() => {
  if (gapCents.value === null) return 'Your financial dashboard';
  if (gapCents.value === 0) return `Both paths end level by ${horizon.value}`;
  return `${gapCents.value > 0 ? 'BTO' : 'Resale'} ends ${formatMoney(Math.abs(gapCents.value) / 100)} ahead by ${horizon.value}`;
});

// planOptions entries may be plain strings or { value, label }; handle both.
const labelOf = (options, value) => {
  const hit = options.find((o) => (typeof o === 'string' ? o === value : o.value === value));
  return (typeof hit === 'object' ? hit.label : hit) ?? value ?? '';
};
const subtitle = computed(() => {
  const a = store.choiceA;
  const b = store.choiceB;
  const cls = a.classification ? ` ${labelOf(CLASSIFICATIONS, a.classification)}` : '';
  return `${labelOf(TOWNS, a.town)} ${labelOf(FLAT_TYPES, a.flatType)}${cls} BTO vs ${labelOf(TOWNS, b.town)} ${labelOf(FLAT_TYPES, b.flatType)} resale · starting ${whatIf.applicationYear}`;
});

const paths = computed(() => [
  { key: 'bto', title: 'Path A · BTO', o: A.value },
  { key: 'resale', title: 'Path B · Resale', o: B.value },
]);

// "2035-05-01" -> "May 2035"
const monthYear = (date) => {
  if (typeof date !== 'string') return '—';
  const [y, m] = date.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
};

const warnings = computed(() => [
  ...(A.value?.warnings ?? []).map((w) => ({ path: 'BTO', w })),
  ...(B.value?.warnings ?? []).map((w) => ({ path: 'Resale', w })),
]);
const warningText = (w) => (typeof w === 'string' ? w : w?.message ?? w?.code ?? '');
</script>

<template>
  <section aria-labelledby="dashboard-heading">
    <!-- Empty: no complete plan yet -->
    <div v-if="!hasInputs" class="card" data-cy="dashboard-empty">
      <div class="card-body">
        <h1 id="dashboard-heading" class="h4">No plan to show yet</h1>
        <p class="text-secondary">Fill in your situation and both paths first, then your dashboard appears here.</p>
        <RouterLink to="/plan" class="btn btn-primary" data-cy="dashboard-start-plan-button">Start planning</RouterLink>
      </div>
    </div>

    <!-- First load -->
    <div v-else-if="!result && !error" data-cy="dashboard-loading" aria-busy="true">
      <span class="visually-hidden" role="status">Loading your dashboard...</span>
      <div class="skeleton mb-3 results-skeleton results-skeleton--heading" aria-hidden="true"></div>
      <div class="row g-3" aria-hidden="true">
        <div v-for="n in 2" :key="n" class="col-12 col-md-6"><div class="skeleton results-skeleton results-skeleton--card"></div></div>
      </div>
    </div>

    <!-- Error with nothing to show -->
    <div v-else-if="!result" class="alert alert-danger" role="alert" data-cy="dashboard-error">
      <p class="mb-2">{{ error }}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="dashboard-retry-button" @click="run">Try again</button>
    </div>

    <template v-else>
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <p class="text-secondary small mb-1" data-cy="dashboard-subtitle">{{ subtitle }}</p>
          <h1 id="dashboard-heading" class="hero-statement mb-2" data-cy="dashboard-headline">{{ headline }}</h1>
          <p class="d-flex flex-wrap align-items-center gap-2 mb-0">
            <span class="badge-version" data-cy="dashboard-ruleset-version">Ruleset {{ result.rulesetVersion }}</span>
            <span v-if="result.mock" class="text-caption" data-cy="dashboard-mock-notice">Showing mock data.</span>
            <span v-if="updating" class="text-caption" role="status" data-cy="dashboard-updating">Updating…</span>
          </p>
        </div>
        <div class="d-flex gap-2">
          <RouterLink to="/plan" class="btn btn-outline-secondary" data-cy="dashboard-edit-button">Edit inputs</RouterLink>
          <RouterLink to="/results" class="btn btn-primary" data-cy="dashboard-results-button">See break-even map</RouterLink>
        </div>
      </div>

      <div v-if="error" class="alert alert-warning" role="alert" data-cy="dashboard-update-error">
        {{ error }} Showing your last results.
      </div>

      <div class="row g-4" :aria-busy="updating ? 'true' : 'false'">
        <!-- What-if: after the headline on phones, on the right on large screens -->
        <div class="col-12 col-lg-4 order-lg-last">
          <WhatIfPanel
            :model-value="whatIf"
            :horizon-shown="horizon"
            :horizon-min="horizonLimits.min"
            :horizon-max="horizonLimits.max"
            @update:model-value="setWhatIf"
            @reset="reset"
          />
        </div>

        <div class="col-12 col-lg-8 d-flex flex-column gap-4">
          <div v-if="A && B" class="row g-3">
            <div v-for="p in paths" :key="p.key" class="col-12 col-md-6">
              <div class="card h-100" :class="`dash-card--${p.key}`" :data-cy="`dashboard-summary-${p.key}`">
                <div class="card-body">
                  <h2 class="h5">{{ p.title }}</h2>
                  <p class="text-secondary small mb-0">Net financial position in {{ horizon }}</p>
                  <p class="fs-2 fw-semibold text-numeric mb-2" :data-cy="`dashboard-summary-${p.key}-net`">{{ formatMoney(dollars(p.o.netPositionCents)) }}</p>

                  <p v-if="p.o.affordability" class="mb-3" :data-cy="`dashboard-summary-${p.key}-affordability`">
                    <span v-if="p.o.affordability.withinLimit" class="badge text-bg-success">✓ Within your loan limit</span>
                    <span v-else class="badge text-bg-danger">✗ Loan short by {{ formatMoney(dollars(p.o.affordability.shortfallCents)) }}</span>
                    <span class="d-block small text-secondary mt-1">
                      Max loan {{ formatMoney(dollars(p.o.affordability.maxLoanCents)) }}<template v-if="p.o.affordability.limitingRule">, set by {{ p.o.affordability.limitingRule }}</template>
                    </span>
                  </p>

                  <dl class="row small mb-0">
                    <dt class="col-7 fw-normal text-secondary">Price (before grants)</dt>
                    <dd class="col-5 text-end text-numeric mb-1" :data-cy="`dashboard-summary-${p.key}-price`">{{ formatMoney(dollars(p.o.purchasePriceCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Cash at purchase</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.cashRequiredAtPurchaseCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">CPF at purchase</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.cpfUsedAtPurchaseCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Housing loan</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.loanPrincipalCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Grants</dt>
                    <dd class="col-5 text-end text-numeric mb-1" :data-cy="`dashboard-summary-${p.key}-grants`">{{ formatMoney(dollars(p.o.totalGrantsCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Keys</dt>
                    <dd class="col-5 text-end mb-0">{{ monthYear(p.o.timeline?.keyCollectionDate) }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div v-if="warnings.length" class="alert alert-warning small mb-0" role="status" data-cy="dashboard-warnings">
            <ul class="mb-0 ps-3">
              <li v-for="(x, i) in warnings" :key="i"><strong>{{ x.path }}:</strong> {{ warningText(x.w) }}</li>
            </ul>
          </div>

          <!-- Beside the sliders (D35): the historical range informs the price growth slider. In this column, not
               under the sticky what-if panel, which would slide over it on scroll. Fetches on its own. -->
          <HistoricalRpiChart />

          <section class="card" aria-labelledby="grants-heading">
            <div class="card-body">
              <h2 id="grants-heading" class="h5">Grants you qualify for</h2>
              <p class="text-secondary small">
                Every check says why it passed or failed.
                <RouterLink to="/sources" data-cy="dashboard-sources-link">See the official sources for each rule</RouterLink>.
              </p>
              <GrantsTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
            </div>
          </section>

          <section class="card" aria-labelledby="cashflow-heading">
            <div class="card-body">
              <h2 id="cashflow-heading" class="h5">How the net position adds up</h2>
              <p class="text-secondary small">In {{ horizon }}: what the flat is worth, minus what you still owe and the cash you spent on housing. Nothing is sold.</p>
              <CashFlowChart v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon-year="horizon" />
            </div>
          </section>

          <section class="card" aria-labelledby="costs-heading">
            <div class="card-body">
              <h2 id="costs-heading" class="h5">Costs up to {{ horizon }}</h2>
              <p class="text-secondary small">Rent while waiting, renovation, fees, loan interest and CPF interest, and how each is paid.</p>
              <CostBreakdownTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
            </div>
          </section>

          <section class="card" aria-labelledby="notes-heading">
            <div class="card-body">
              <h2 id="notes-heading" class="h5">Before you decide</h2>
              <ul class="mb-0 small">
                <li data-cy="dashboard-note-mop">
                  <strong>Minimum Occupation Period:</strong> you cannot sell before
                  {{ monthYear(A?.timeline?.earliestSaleDate) }} (BTO) or {{ monthYear(B?.timeline?.earliestSaleDate) }} (resale).
                  <RouterLink to="/sources">See the current rule</RouterLink>.
                </li>
                <li data-cy="dashboard-note-eip">
                  <strong>Ethnic Integration Policy:</strong> some resale blocks may not be open to your household; check a block before you commit.
                  <a href="https://www.hdb.gov.sg" target="_blank" rel="noopener noreferrer">HDB EIP checker<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </template>
  </section>
</template>