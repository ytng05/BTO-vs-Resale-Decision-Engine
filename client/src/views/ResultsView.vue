<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import GapBreakdownPanel from '../components/GapBreakdownPanel.vue';
import HeatmapGrid from '../components/HeatmapGrid.vue';
import PathOutcomeCard from '../components/PathOutcomeCard.vue';
import CashFlowOverTimeChart from '../components/CashFlowOverTimeChart.vue';
import SaveScenarioPanel from '../components/SaveScenarioPanel.vue';
import TimingOptimiserPanel from '../components/TimingOptimiserPanel.vue';
import { CLASSIFICATIONS, FLAT_TYPES, TOWNS } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';
import { isPlanComplete } from '../validation/planValidation.js';

const store = useScenarioStore();
const router = useRouter();

// D38: the parents question is only asked if picked in step 1, so say when the Proximity Housing Grant
// was left out, and offer a way back to it.
const phgNotAsked = computed(() => store.choiceB.livingArrangement === 'NONE');
function addParents() {
  if (!store.wishes.includes('parents')) store.wishes.push('parents');
  store.step = 3; // the resale step, where the parents question is
  router.push('/plan');
}
const result = ref(null);
const error = ref(null);
const loading = ref(false);

// Someone who opens /results directly (or reloads) has no real inputs yet: show an empty state instead
// of asking the server to compare nothing. "Has inputs" = every input the comparison needs passes the
// same validation the stepper enforces, defaults included (isPlanComplete). (Checking applicants.length
// is not enough: the store's blank state already seeds one empty buyer.)
const hasInputs = computed(() => isPlanComplete(store));

// Contract v2: Outcome.horizonYear is the authoritative value once results load (both paths share it,
// D1). Before that, fall back to the user's own assumption so the empty/loading states can still size
// things sensibly.
const horizonYear = computed(() => result.value?.horizonYear ?? store.assumptions.horizonYear ?? null);

const userPoint = computed(() => ({
  priceGrowth: store.assumptions.annualPriceGrowth,
  incomeGrowth: store.assumptions.annualIncomeGrowth,
}));

// Positive when Path A ends ahead. Cents, per the contract.
const gap = computed(() => {
  const a = result.value?.outcomeA?.netPositionCents;
  const b = result.value?.outcomeB?.netPositionCents;
  return typeof a === 'number' && typeof b === 'number' ? a - b : null;
});

const gapSentence = computed(() => {
  if (gap.value === null) return '';
  const years = horizonYear.value ? `By ${horizonYear.value}, ` : '';
  if (gap.value === 0) return `${years}both paths end with the same net financial position under your assumptions.`;
  const ahead = gap.value > 0 ? 'BTO' : 'resale';
  return `${years}${ahead} ends ${formatMoney(Math.abs(gap.value) / 100)} ahead in net financial position under your assumptions.`;
});

// Which prices the comparison used (D26, D33), so a default is never hidden: the BTO launch and its price
// against HDB's range, and the resale median with the sales behind it.
const monthYear = (ym) => {
  const [y, m] = String(ym ?? '').split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '';
};
const btoPriceBasis = computed(() => {
  const p = result.value?.btoProjectA;
  const used = result.value?.resolvedA?.purchasePriceCents;
  if (!p || typeof used !== 'number') return '';
  const mid = Math.round((p.priceMinCents + p.priceMaxCents) / 2);
  const where = used === mid ? 'the middle of' : 'within';
  // D40: a past launch stands in for the user's own, which hasn't happened yet.
  const launch = p.launch ? ` (${monthYear(p.launch)} launch)` : '';
  return `BTO estimated from ${p.name}${launch} at ${formatMoney(used / 100)}, ${where} HDB's ${formatMoney(p.priceMinCents / 100)} to ${formatMoney(p.priceMaxCents / 100)} range.`;
});
const resalePriceBasis = computed(() => {
  const r = result.value?.resolvedB;
  const d = r?.priceData;
  if (!r || typeof r.purchasePriceCents !== 'number' || !d) return '';
  const lease = d.fellBackToAllLeases
    ? 'any remaining lease (too few sales in your band)'
    : `${d.leaseFilter?.minLeaseYears}–${d.leaseFilter?.maxLeaseYears} years left`;
  const sales = `${d.transactions} sale${d.transactions === 1 ? '' : 's'}`;
  const when = d.window ? `, ${monthYear(d.window.from)} to ${monthYear(d.window.to)}` : '';
  const rough = d.lowSample ? ' Few sales, so treat it as rough.' : '';
  const flats = `${labelOf(TOWNS, store.choiceB.town)} ${labelOf(FLAT_TYPES, store.choiceB.flatType).toLowerCase()} flats with ${lease}${when}`;
  const medianCents = r.medianPriceCents ?? r.purchasePriceCents;
  if (r.purchasePriceCents === medianCents) {
    return `Resale priced at ${formatMoney(medianCents / 100)}, the median of ${sales} of ${flats}. A specific listing can cost more or less.${rough}`;
  }
  // D39: an asking price. The flat is valued at the median; anything above it is cash over valuation.
  const over = r.purchasePriceCents - medianCents;
  const vsMedian = over > 0
    ? `${formatMoney(over / 100)} above the median of ${sales} (${formatMoney(medianCents / 100)}), so that part is paid in cash and the flat is valued at the median`
    : `${formatMoney(-over / 100)} below the median of ${sales} (${formatMoney(medianCents / 100)})`;
  return `Resale priced at your asking price, ${formatMoney(r.purchasePriceCents / 100)}: ${vsMedian}. Sales of ${flats}.${rough}`;
});

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
function describe(choice) {
  const parts = [labelOf(TOWNS, choice.town), labelOf(FLAT_TYPES, choice.flatType)];
  if (choice.path === 'BTO' && choice.classification) parts.push(labelOf(CLASSIFICATIONS, choice.classification));
  if (choice.applicationYear) parts.push(`from ${choice.applicationYear}`);
  return parts.filter(Boolean).join(', ');
}

async function load() {
  if (!hasInputs.value) return;
  loading.value = true;
  error.value = null;
  try {
    result.value = await compare(store);
  } catch (e) {
    // Say what went wrong and how to fix it (rulebook: errors never apologise or stay vague).
    error.value =
      e?.response?.data?.error?.message || 'The results could not be loaded. Check your connection and try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section>
    <!-- Empty: no inputs yet -->
    <div v-if="!hasInputs" class="card" data-cy="results-empty">
      <div class="card-body">
        <h1 class="h4">No plan to compare yet</h1>
        <p class="text-secondary">Enter your situation and both paths first, then the comparison appears here.</p>
        <RouterLink to="/plan" class="btn btn-primary" data-cy="results-start-plan-button">Start planning</RouterLink>
      </div>
    </div>

    <!-- Loading: skeleton shaped like the real page (team .skeleton class, UI.md §8) -->
    <div v-else-if="loading" data-cy="results-loading" aria-busy="true">
      <span class="visually-hidden" role="status">Loading results...</span>
      <div class="skeleton mb-2 results-skeleton results-skeleton--heading" aria-hidden="true"></div>
      <div class="skeleton mb-4 results-skeleton results-skeleton--line" aria-hidden="true"></div>
      <div class="row g-3" aria-hidden="true">
        <div v-for="n in 2" :key="n" class="col-12 col-lg-6">
          <div class="skeleton results-skeleton results-skeleton--card"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-danger" role="alert" data-cy="results-error">
      <p class="mb-2">{{ error }}</p>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="results-retry-button" @click="load">
          Try again
        </button>
        <RouterLink to="/plan" class="btn btn-link btn-sm" data-cy="results-edit-button">Back to your plan</RouterLink>
      </div>
    </div>

    <template v-else-if="result">
      <!-- Lead with the single break-even sentence before any chart (UI.md §8). -->
      <h1 class="hero-statement" data-cy="results-breakeven-sentence">{{ result.breakEvenSentence }}</h1>
      <p v-if="gapSentence" data-cy="results-gap-sentence">{{ gapSentence }}</p>
      <!-- D40: the BTO price at which the verdict flips. Absent from older servers and when path A isn't a BTO. -->
      <p v-if="result.btoPriceSentence" data-cy="results-bto-price-breakeven">{{ result.btoPriceSentence }}</p>
      <p v-if="phgNotAsked" class="text-caption mb-2" data-cy="results-phg-note">
        Not counted: the Proximity Housing Grant (up to S$30,000 on a resale flat). Living with or within 4 km of your
        parents?
        <button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-cy="results-phg-add" @click="addParents">Add it</button>
      </p>
      <p class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span class="badge-version" data-cy="results-ruleset-version">Ruleset {{ result.rulesetVersion }}</span>
        <span class="text-caption">
          The break-even line is not a prediction of prices.
          <span v-if="result.mock" data-cy="results-mock-notice">Showing mock data.</span>
        </span>
      </p>
      <div class="d-flex flex-wrap gap-2 mb-3">
        <RouterLink to="/plan" class="btn btn-outline-secondary" data-cy="results-edit-button">Change inputs</RouterLink>
        <RouterLink to="/dashboard" class="btn btn-outline-primary" data-cy="results-dashboard-button">What's this made of?</RouterLink>
      </div>
      <SaveScenarioPanel :result="result" />

      <div v-if="result.outcomeA && result.outcomeB" class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path A: BTO"
            :subtitle="describe(store.choiceA)"
            :outcome="result.outcomeA"
            :horizon-year="horizonYear"
            cy-prefix="results-patha"
          />
        </div>
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path B: Resale"
            :subtitle="describe(store.choiceB)"
            :outcome="result.outcomeB"
            :horizon-year="horizonYear"
            cy-prefix="results-pathb"
          />
        </div>
      </div>

      <div v-if="btoPriceBasis || resalePriceBasis" class="text-caption mb-3" data-cy="results-price-basis">
        <p v-if="btoPriceBasis" class="mb-1" data-cy="results-price-basis-bto">
          {{ btoPriceBasis }}
          <RouterLink to="/dashboard" data-cy="results-price-basis-change">Change the price</RouterLink>
        </p>
        <p v-if="resalePriceBasis" class="mb-0" data-cy="results-price-basis-resale">{{ resalePriceBasis }}</p>
      </div>

      <!-- Why one path ends ahead, line by line (D34). Arrives with /compare; hidden if an older server omits it. -->
      <GapBreakdownPanel v-if="result.gapBreakdown" :gap="result.gapBreakdown" />

      <div v-if="result.outcomeA && result.outcomeB" class="card mb-3">
        <div class="card-body">
          <h2 class="h5">Net position over time</h2>
          <p class="text-secondary">
            How much you'd own outright each year, before selling. For what makes up the figure at
            {{ horizonYear }} itself, see the
            <RouterLink to="/dashboard" data-cy="results-cashflow-dashboard-link">financial dashboard</RouterLink>.
          </p>
          <CashFlowOverTimeChart :outcome-a="result.outcomeA" :outcome-b="result.outcomeB" :horizon-year="horizonYear" />
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <h2 class="h5">Where each path ends ahead</h2>
          <p class="text-secondary">Select a square to see the difference. "You" marks your own assumptions.</p>
          <HeatmapGrid
            :grid="result.grid"
            :user-point="userPoint"
            :horizon-year="horizonYear"
            label-a="BTO"
            label-b="Resale"
          />
        </div>
      </div>

      <!-- Part of the plan, fetches independently of /compare: which BTO application year ends highest (POST /api/timing). -->
      <TimingOptimiserPanel />

      <!-- TODO (seat 5): strategy top 3 once /api/strategy exists (future work, off by default). -->
    </template>
  </section>
</template>
