<script setup>
// Feature 2: the financial dashboard. Both paths side by side: net position, what you pay upfront,
// grants with every test's reason, money in and out, the PHG distance map and notes before deciding.
// What-if sliders re-run the comparison with changed assumptions. They are local only: the saved plan
// in the store never changes, and "Reset" goes back to it.
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
import PhgMap from '../components/dashboard/PhgMap.vue';

const store = useScenarioStore();
const thisYear = new Date().getFullYear();

// Same rule the stepper uses before it lets anyone reach the results.
const hasInputs = computed(() => [0, 1, 2].every((step) => Object.keys(validateStep(step, store)).length === 0));

// The store calls the holding period horizonYears today; seat 1 is renaming it to holdingPeriodYears.
// This works with either name, so the rename does not break the dashboard.
const HOLDING_KEY = 'holdingPeriodYears' in store.assumptions ? 'holdingPeriodYears' : 'horizonYears';

function fromPlan() {
  return {
    purchaseYear: store.choiceA.purchaseYear ?? thisYear + 1,
    priceGrowth: store.assumptions.priceGrowth ?? 0.03,
    incomeGrowth: store.assumptions.incomeGrowth ?? 0.02,
    holdingYears: store.assumptions[HOLDING_KEY] ?? 10,
  };
}
const whatIf = reactive(fromPlan());
const setWhatIf = (next) => Object.assign(whatIf, next);
const reset = () => Object.assign(whatIf, fromPlan());

// A copy of the plan with the what-if values swapped in. compare() turns it into the contract's request.
const whatIfPlan = computed(() => ({
  profile: store.profile,
  choiceA: { ...store.choiceA, purchaseYear: whatIf.purchaseYear },
  choiceB: { ...store.choiceB, purchaseYear: whatIf.purchaseYear },
  assumptions: {
    ...store.assumptions,
    priceGrowth: whatIf.priceGrowth,
    incomeGrowth: whatIf.incomeGrowth,
    [HOLDING_KEY]: whatIf.holdingYears,
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
const years = computed(() => result.value?.holdingPeriodYears ?? whatIf.holdingYears);

// Positive when BTO (Path A) ends ahead, same sign as ResultsView.
const gapCents = computed(() => {
  const a = A.value?.netPositionCents;
  const b = B.value?.netPositionCents;
  return typeof a === 'number' && typeof b === 'number' ? a - b : null;
});

const headline = computed(() => {
  if (gapCents.value === null) return 'Your financial dashboard';
  if (gapCents.value === 0) return `Both paths end level after ${years.value} years`;
  return `${gapCents.value > 0 ? 'BTO' : 'Resale'} ends ${formatMoney(Math.abs(gapCents.value) / 100)} ahead after ${years.value} years`;
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
  return `${labelOf(TOWNS, a.town)} ${labelOf(FLAT_TYPES, a.flatType)}${cls} BTO vs ${labelOf(TOWNS, b.town)} ${labelOf(FLAT_TYPES, b.flatType)} resale · buying in ${whatIf.purchaseYear}`;
});

const paths = computed(() => [
  { key: 'bto', title: 'Path A · BTO', o: A.value },
  { key: 'resale', title: 'Path B · Resale', o: B.value },
]);

const warnings = computed(() => [
  ...(A.value?.warnings ?? []).map((w) => ({ path: 'BTO', w })),
  ...(B.value?.warnings ?? []).map((w) => ({ path: 'Resale', w })),
]);
const warningText = (w) => (typeof w === 'string' ? w : w?.message ?? w?.code ?? '');

const parentsPostal = computed(() => {
  const p = store.profile.parentsAddress;
  return typeof p === 'string' ? p : p?.postal ?? '';
});
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
          <WhatIfPanel :model-value="whatIf" @update:model-value="setWhatIf" @reset="reset" />
        </div>

        <div class="col-12 col-lg-8 d-flex flex-column gap-4">
          <div v-if="A && B" class="row g-3">
            <div v-for="p in paths" :key="p.key" class="col-12 col-md-6">
              <div class="card h-100" :class="`dash-card--${p.key}`" :data-cy="`dashboard-summary-${p.key}`">
                <div class="card-body">
                  <h2 class="h5">{{ p.title }}</h2>
                  <p class="text-secondary small mb-0">Net financial position after {{ years }} years</p>
                  <p class="fs-2 fw-semibold text-numeric mb-3" :data-cy="`dashboard-summary-${p.key}-net`">{{ formatMoney(dollars(p.o.netPositionCents)) }}</p>
                  <dl class="row small mb-0">
                    <dt class="col-7 fw-normal text-secondary">Cash at purchase</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.cashRequiredAtPurchaseCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">CPF at purchase</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.cpfUsedAtPurchaseCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Housing loan</dt>
                    <dd class="col-5 text-end text-numeric mb-1">{{ formatMoney(dollars(p.o.loanPrincipalCents)) }}</dd>
                    <dt class="col-7 fw-normal text-secondary">Grants</dt>
                    <dd class="col-5 text-end text-numeric mb-0" :data-cy="`dashboard-summary-${p.key}-grants`">{{ formatMoney(dollars(p.o.totalGrantsCents)) }}</dd>
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

          <section class="card" aria-labelledby="grants-heading">
            <div class="card-body">
              <h2 id="grants-heading" class="h5">Grants you qualify for</h2>
              <p class="text-secondary small">
                Every check says why it passed or failed.
                <RouterLink to="/sources" data-cy="dashboard-sources-link">See the official sources for each rule</RouterLink>.
              </p>
              <GrantsTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
              <hr class="my-4" />
              <PhgMap :initial-parents-postal="parentsPostal" />
            </div>
          </section>

          <section class="card" aria-labelledby="cashflow-heading">
            <div class="card-body">
              <h2 id="cashflow-heading" class="h5">Money in and out</h2>
              <p class="text-secondary small">What each path costs when you buy, and what comes back when you sell after {{ years }} years.</p>
              <CashFlowChart v-if="A && B" :outcome-a="A" :outcome-b="B" :holding-years="years" />
            </div>
          </section>

          <section class="card" aria-labelledby="notes-heading">
            <div class="card-body">
              <h2 id="notes-heading" class="h5">Before you decide</h2>
              <ul class="mb-0 small">
                <li data-cy="dashboard-note-mop">
                  <strong>Minimum Occupation Period:</strong> you cannot sell either flat until its MOP ends.
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