<script setup>
// Feature 2: the financial dashboard. Both paths side by side, measured in the same year (contract v2, D1).
// Top: a friendly overview of what the result is made of (cash cover, savings, grants, cash spent, keys).
// Below: net position and affordability, grants with every test's reason, what makes up the net position,
// the cost breakdown, and notes before deciding.
// What-if sliders re-run the comparison with changed assumptions. They are local only: the saved plan
// in the store never changes, and "Reset" goes back to it.
// Store and sliders hold dollars and fractions; client.js turns them into the contract's cents (D14).
// All money from the API is integer cents (API_CONTRACT.md); it is divided by 100 only for display.
import Term from '../components/Term.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import { isPlanComplete } from '../validation/planValidation.js';
import { CLASSIFICATIONS, FLAT_TYPES, TOWNS } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';
import { costsTakeaway, grantsTakeaway, monthYear } from '../utils/dashboardFormat.js';
import WhatIfPanel from '../components/dashboard/WhatIfPanel.vue';
import GrantsTable from '../components/dashboard/GrantsTable.vue';
import CashFlowChart from '../components/dashboard/CashFlowChart.vue';
import CostBreakdownTable from '../components/dashboard/CostBreakdownTable.vue';
import DashboardOverview from '../components/dashboard/DashboardOverview.vue';
import DashboardSection from '../components/dashboard/DashboardSection.vue';
import PhgMapCard from '../components/dashboard/PhgMapCard.vue';
import HistoricalRpiChart from '../components/HistoricalRpiChart.vue';
import SizePriceTable from '../components/dashboard/SizePriceTable.vue';

const store = useScenarioStore();
const thisYear = new Date().getFullYear();

// Same rule the stepper uses before it lets anyone reach the results.
const hasInputs = computed(() => isPlanComplete(store));

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
    // null = the middle of HDB's range for the launch (D26).
    btoPrice: store.choiceA.btoPrice ?? null,
    // null = the median of recent sales (D39).
    resalePrice: store.choiceB.resalePrice ?? null,
  };
}
const whatIf = reactive(fromPlan());
// The saved plan's values, so the panel can tell how many hidden assumptions have moved.
const planValues = computed(() => fromPlan());

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
  choiceA: { ...store.choiceA, applicationYear: whatIf.applicationYear, renovation: whatIf.renovationA, btoPrice: whatIf.btoPrice },
  choiceB: { ...store.choiceB, applicationYear: whatIf.applicationYear + yearGap.value, renovation: whatIf.renovationB, resalePrice: whatIf.resalePrice },
  assumptions: {
    ...store.assumptions,
    annualPriceGrowth: whatIf.annualPriceGrowth,
    annualIncomeGrowth: whatIf.annualIncomeGrowth,
    horizonYear: whatIf.horizonYear,
    monthlyHousingCostWhileWaiting: whatIf.monthlyHousingCostWhileWaiting,
  },
}));

const result = ref(null);

// The BTO launch the comparison used and HDB's price range for the flat, in dollars (D26), for the price slider.
// The resale median (the flat's valuation, D39) in dollars, for the resale price slider.
const resaleMedian = computed(() => {
  const r = result.value?.resolvedB;
  return r?.medianPriceCents ? { median: r.medianPriceCents / 100, used: r.purchasePriceCents / 100 } : null;
});
const btoRange = computed(() => {
  const p = result.value?.btoProjectA;
  if (!p?.priceMinCents || !p?.priceMaxCents) return null;
  // D40: where the verdict flips, if the server sent it. It doesn't depend on the slider's own price.
  const be = result.value.btoPriceBreakEven;
  return {
    name: p.name, launch: p.launch, min: p.priceMinCents / 100, max: p.priceMaxCents / 100,
    used: (result.value.resolvedA?.purchasePriceCents ?? 0) / 100,
    breakEven: be ? { price: be.priceCents === null ? null : be.priceCents / 100, atMin: be.atHdbMin, atMax: be.atHdbMax } : null,
  };
});
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

const warnings = computed(() => [
  ...(A.value?.warnings ?? []).map((w) => ({ path: 'BTO', w })),
  ...(B.value?.warnings ?? []).map((w) => ({ path: 'Resale', w })),
]);
// A code becomes the server's plain-English sentence (`warningMessages`, docs/API_CONTRACT.md "POST /api/compare");
// the bare code only if the server sent none for it.

// The detail sections open and close. The chart that explains the result starts open; the rest start closed,
// each with a one-line takeaway in its header. "Expand all" opens or closes every one.
const sections = reactive({ cashflow: true, grants: false, costs: false, rpi: false, map: false, size: false });
const allOpen = computed(() => Object.values(sections).every(Boolean));
function toggleAll() {
  const next = !allOpen.value;
  Object.keys(sections).forEach((key) => { sections[key] = next; });
}
// The grants link in the overview: open the section, then bring its heading into view and focus it.
function showGrants() {
  sections.grants = true;
  nextTick(() => {
    const heading = document.getElementById('grants-heading');
    heading?.scrollIntoView();
    heading?.focus({ preventScroll: true });
  });
}
const grantsLine = computed(() => grantsTakeaway(A.value, B.value));
const costsLine = computed(() => costsTakeaway(A.value, B.value));
const mapLine = computed(() => (store.choiceB.livingArrangement === 'NEAR'
  ? "You said you'll live near your parents: check the 4 km rule."
  : "Only needed if you'll live near your parents."));
const warningText = (w) =>
  typeof w === 'string' ? result.value?.warningMessages?.[w] ?? w : w?.message ?? w?.code ?? '';
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
      <div class="skeleton mb-2 results-skeleton results-skeleton--heading" aria-hidden="true"></div>
      <div class="skeleton mb-4 results-skeleton results-skeleton--line" aria-hidden="true"></div>
      <div class="row g-3 mb-4" aria-hidden="true">
        <div class="col-12 col-lg-5"><div class="skeleton results-skeleton results-skeleton--card"></div></div>
        <div class="col-12 col-lg-7"><div class="skeleton results-skeleton results-skeleton--card"></div></div>
      </div>
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
          <RouterLink to="/results" class="btn btn-primary" data-cy="dashboard-results-button">Back to results</RouterLink>
        </div>
      </div>

      <div v-if="error" class="alert alert-warning" role="alert" data-cy="dashboard-update-error">
        {{ error }} Showing your last results.
      </div>

      <DashboardOverview
        v-if="A && B"
        :outcome-a="A"
        :outcome-b="B"
        :cash-savings="store.profile.cashSavings"
        :applicants="store.profile.applicants"
        :horizon="horizon"
        @open-grants="showGrants"
      />

      <div class="row g-4" :aria-busy="updating ? 'true' : 'false'">
        <!-- What-if: after the overview on phones, on the right on large screens -->
        <div class="col-12 col-lg-4 order-lg-last">
          <div class="dash-sticky">
          <WhatIfPanel
            :model-value="whatIf"
            :horizon-shown="horizon"
            :horizon-min="horizonLimits.min"
            :horizon-max="horizonLimits.max"
            :bto-range="btoRange"
            :resale-median="resaleMedian"
            :baseline="planValues"
            @update:model-value="setWhatIf"
            @reset="reset"
          />
          </div>
        </div>

        <div class="col-12 col-lg-8 d-flex flex-column gap-4">
          <div v-if="A && B" class="row g-3">
            <div v-for="p in paths" :key="p.key" class="col-12 col-md-6">
              <div class="card h-100" :class="`dash-card--${p.key}`" :data-cy="`dashboard-summary-${p.key}`">
                <div class="card-body">
                  <h2 class="h5 mb-1"><span class="dash-dot" :class="`dash-dot--${p.key}`" aria-hidden="true"></span>{{ p.title }}</h2>
                  <p class="text-secondary small mb-0">What you'd own outright in {{ horizon }} (<Term id="net-position">net position</Term>)</p>
                  <p class="dash-net text-numeric mb-3" :data-cy="`dashboard-summary-${p.key}-net`">{{ formatMoney(dollars(p.o.netPositionCents)) }}</p>

                  <p v-if="p.o.affordability" class="mb-4" :data-cy="`dashboard-summary-${p.key}-affordability`">
                    <span v-if="p.o.affordability.withinLimit" class="dash-pill dash-pill--ok">✓ Within your loan limit</span>
                    <span v-else class="dash-pill dash-pill--bad">✗ Loan short by {{ formatMoney(dollars(p.o.affordability.shortfallCents)) }}</span>
                    <span class="d-block small text-secondary mt-2">
                      Max loan {{ formatMoney(dollars(p.o.affordability.maxLoanCents)) }}<template v-if="p.o.affordability.limitingRule">, set by {{ p.o.affordability.limitingRule }}</template>
                    </span>
                  </p>

                  <h3 class="dash-subhead">How the purchase is paid</h3>
                  <dl class="dash-list mb-0">
                    <div><dt>Price (before grants)</dt><dd class="text-numeric" :data-cy="`dashboard-summary-${p.key}-price`">{{ formatMoney(dollars(p.o.purchasePriceCents)) }}</dd></div>
                    <div><dt>Cash at purchase</dt><dd class="text-numeric">{{ formatMoney(dollars(p.o.cashRequiredAtPurchaseCents)) }}</dd></div>
                    <div><dt>CPF at purchase</dt><dd class="text-numeric">{{ formatMoney(dollars(p.o.cpfUsedAtPurchaseCents)) }}</dd></div>
                    <div><dt>Housing loan</dt><dd class="text-numeric">{{ formatMoney(dollars(p.o.loanPrincipalCents)) }}</dd></div>
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

          <div class="d-flex align-items-baseline justify-content-between gap-3 mt-2">
            <div>
              <h2 class="h5 mb-0">The detail</h2>
              <p class="text-secondary small mb-0">Open a section to see the numbers behind the result.</p>
            </div>
            <button type="button" class="btn btn-link p-0" data-cy="dashboard-sections-toggle" @click="toggleAll">
              {{ allOpen ? 'Collapse all' : 'Expand all' }}
            </button>
          </div>

          <DashboardSection
            v-model:open="sections.cashflow"
            title="How the net position adds up"
            :takeaway="`In ${horizon}: what the flat is worth, minus what you still owe and the cash you spent on housing.`"
            cy="dashboard-section-cashflow"
          >
            <p class="text-secondary small">Nothing is sold: this is the position if you stayed in the flat.</p>
            <CashFlowChart v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon-year="horizon" />
          </DashboardSection>

          <DashboardSection
            v-model:open="sections.grants"
            heading-id="grants-heading"
            title="Grants you qualify for"
            :takeaway="grantsLine"
            cy="dashboard-section-grants"
          >
            <p class="text-secondary small">
              Every check says why it passed or failed.
              <RouterLink to="/sources" data-cy="dashboard-sources-link">See the official sources for each rule</RouterLink>.
            </p>
            <GrantsTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
          </DashboardSection>

          <DashboardSection
            v-model:open="sections.costs"
            heading-id="costs-heading"
            :title="`Costs up to ${horizon}`"
            :takeaway="costsLine"
            cy="dashboard-section-costs"
          >
            <p class="text-secondary small">Rent while waiting, renovation, fees, loan interest and CPF interest, and how each is paid.</p>
            <CostBreakdownTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
          </DashboardSection>

          <!-- D35: the historical range informs the price growth slider. Fetches on its own, only once opened. -->
          <DashboardSection
            v-model:open="sections.rpi"
            title="Resale price history"
            takeaway="Historical only, not a prediction of future prices."
            lazy
            flat
            cy="dashboard-section-rpi"
          >
            <HistoricalRpiChart />
          </DashboardSection>

          <DashboardSection
            v-model:open="sections.map"
            title="Near your parents? (Proximity Housing Grant)"
            :takeaway="mapLine"
            lazy
            flat
            cy="dashboard-section-map"
          >
            <PhgMapCard
              :bto-town="store.choiceA.town"
              :resale-town="store.choiceB.town"
              :living-arrangement="store.choiceB.livingArrangement"
            />
          </DashboardSection>

                    <!-- Fetches the flat sizes and prices only once opened (lazy). -->
          <DashboardSection
            v-model:open="sections.size"
            title="Size and price side by side"
            takeaway="How much flat each path gets for the money: floor area, price and price per square metre."
            lazy
            cy="dashboard-section-size"
          >
            <SizePriceTable :choice-a="store.choiceA" :choice-b="store.choiceB" :result="result" />
          </DashboardSection>

          <section class="card" aria-labelledby="notes-heading">
            <div class="card-body">
              <h2 id="notes-heading" class="h5">Before you decide</h2>
              <ul class="list-unstyled d-flex flex-column gap-2 mb-0 small">
                <li class="dash-note" data-cy="dashboard-note-mop">
                  <strong><Term id="mop">Minimum Occupation Period</Term>:</strong> you cannot sell before
                  {{ monthYear(A?.timeline?.earliestSaleDate) }} (BTO) or {{ monthYear(B?.timeline?.earliestSaleDate) }} (resale).
                  <RouterLink to="/sources#flat-types">See the current rule</RouterLink>.
                </li>
                <li class="dash-note" data-cy="dashboard-note-eip">
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

<style scoped>
/* On large screens the What-if panel follows you down the page, so it is never stranded beside empty space.
   It scrolls inside itself if the screen is shorter than the panel. */
@media (min-width: 992px) {
  .dash-sticky {
    position: sticky;
    top: 5rem;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    padding: 4px;
    margin: -4px;
  }
}
.dash-net {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.dash-pill {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.8125rem;
  font-weight: 500;
}
.dash-pill--ok { background: var(--success-fill); color: var(--success); }
.dash-pill--bad { background: var(--danger-fill); color: var(--danger); }
.dash-subhead {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin: 0 0 var(--space-2);
}
.dash-list > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.875rem;
}
.dash-list dt { font-weight: 400; color: var(--text-secondary); }
.dash-list dd { margin: 0; text-align: right; font-weight: 500; }
.dash-note {
  background: var(--accent-fill-3);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
}
</style>
