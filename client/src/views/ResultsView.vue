<script setup>
import Term from '../components/Term.vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import GapBreakdownPanel from '../components/GapBreakdownPanel.vue';
import HeatmapGrid from '../components/HeatmapGrid.vue';
import PathOutcomeCard from '../components/PathOutcomeCard.vue';
import CashFlowOverTimeChart from '../components/CashFlowOverTimeChart.vue';
import SaveScenarioPanel from '../components/SaveScenarioPanel.vue';
import TimingOptimiserPanel from '../components/TimingOptimiserPanel.vue';
import ResultsNextSteps from '../components/ResultsNextSteps.vue';
import ResultsVerdict from '../components/ResultsVerdict.vue';
import DashboardSection from '../components/dashboard/DashboardSection.vue';
import { CLASSIFICATIONS, FLAT_TYPES, LEASE_BANDS, TOWNS } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';
import { keyRows, verdict as buildVerdict } from '../utils/resultsVerdict.js';
import { isPlanComplete } from '../validation/planValidation.js';

const store = useScenarioStore();
const router = useRouter();

// D38: the parents question is only asked if picked in step 1, so say when the Proximity Housing Grant
// was left out, and offer a way back to it. Not when they were asked and answered "Neither".
const phgNotAsked = computed(() => store.choiceB.livingArrangement === 'NONE' && !store.wishes.includes('parents'));
function addParents() {
  if (!store.wishes.includes('parents')) store.wishes.push('parents');
  store.choiceB.livingArrangement = null; // ask, don't assume "Neither"
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

// Print or save as PDF: the browser's own dialog; styles/_print.scss lays the page out for paper. The chart and
// heatmap sections only draw once opened, so open them first and give the chart a moment to draw.
async function printPage() {
  sections.value = { ...sections.value, chart: true, heatmap: true };
  await nextTick();
  await new Promise((resolve) => { setTimeout(resolve, 400); });
  window.print();
}
const printedOn = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
// One line naming what was compared, for the top of the printout.
const planLine = computed(() => {
  const lease = labelOf(LEASE_BANDS, store.choiceB.leaseBand);
  const a = `${labelOf(TOWNS, store.choiceA.town)} ${labelOf(FLAT_TYPES, store.choiceA.flatType).toLowerCase()} BTO`;
  const b = `${labelOf(TOWNS, store.choiceB.town)} ${labelOf(FLAT_TYPES, store.choiceB.flatType).toLowerCase()} resale${lease ? ` (${lease} left)` : ''}`;
  return `${a} compared with ${b}${horizonYear.value ? `, in ${horizonYear.value}` : ''}.`;
});

const userPoint = computed(() => ({
  priceGrowth: store.assumptions.annualPriceGrowth,
  incomeGrowth: store.assumptions.annualIncomeGrowth,
}));

// Positive when Path A ends ahead. Cents, per the contract.
// Progressive disclosure: the verdict, the two paths and why the gap stay open; the chart over time, the heatmap
// and the timing panel open on request (DashboardSection, as on the Dashboard), each with a one-line takeaway.
// The heatmap starts open: it is the app's central idea (where the paths are equal) and part of the verdict (D35).
const sections = ref({ chart: false, heatmap: true, timing: false });
// Filled once the timing panel has loaded (it only loads when its section is first opened).
const timingResult = ref(null);
const timingTakeaway = computed(() => {
  const best = timingResult.value?.best?.year;
  if (best) return `Applying in ${best} ends with the highest net position of the years checked.`;
  if (timingResult.value) return 'None of the years checked work with your cash and move-in year.';
  return 'Which application year ends with the highest net position, and which miss your move-in year.';
});
const heatmapTakeaway = computed(() => {
  const cells = (result.value?.grid ?? []).flat();
  if (!cells.length) return '';
  const a = cells.filter((c) => c.winner === 'A').length;
  const b = cells.filter((c) => c.winner === 'B').length;
  if (a === cells.length) return `BTO ends ahead in all ${cells.length} combinations of price and income growth tested.`;
  if (b === cells.length) return `Resale ends ahead in all ${cells.length} combinations of price and income growth tested.`;
  return `BTO ends ahead in ${a} of ${cells.length} combinations of price and income growth tested, resale in ${b}.`;
});

const gap = computed(() => {
  const a = result.value?.outcomeA?.netPositionCents;
  const b = result.value?.outcomeB?.netPositionCents;
  return typeof a === 'number' && typeof b === 'number' ? a - b : null;
});

// Who ends ahead, in a plain sentence, and the few numbers side by side (utils/resultsVerdict.js, unit-tested).
const verdict = computed(() => buildVerdict(result.value?.outcomeA, result.value?.outcomeB, horizonYear.value));
const keyComparison = computed(() => keyRows(result.value?.outcomeA, result.value?.outcomeB, horizonYear.value));

const gapSentence = computed(() => {
  if (gap.value === null) return '';
  const years = horizonYear.value ? `By ${horizonYear.value}, ` : '';
  if (gap.value === 0) return `${years}both paths leave you with the same net position (what each path leaves you with, after costs) under your assumptions.`;
  const ahead = gap.value > 0 ? 'BTO' : 'resale';
  return `${years}${ahead} ends ${formatMoney(Math.abs(gap.value) / 100)} ahead in net position (what each path leaves you with, after costs) under your assumptions.`;
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
      <p class="d-none d-print-block small mb-2" data-cy="results-print-header">
        BTO vs Resale · printed {{ printedOn }} · {{ planLine }}
      </p>
      <ResultsVerdict
        v-if="verdict.winner"
        :verdict="verdict"
        :rows="keyComparison"
        :gap-sentence="gapSentence"
        :break-even-sentence="result.breakEvenSentence"
        :horizon-year="horizonYear"
        :label-a="`BTO · ${labelOf(TOWNS, store.choiceA.town)}`"
        :label-b="`Resale · ${labelOf(TOWNS, store.choiceB.town)}`"
      />
      <template v-else>
        <h1 class="hero-statement" data-cy="results-breakeven-sentence">{{ result.breakEvenSentence }}</h1>
        <p v-if="gapSentence" data-cy="results-gap-sentence">{{ gapSentence }}</p>
        <!-- No verdict to show (an outcome has no net position): the way back and on must still be here. -->
        <div class="d-flex flex-wrap gap-2 mb-3 d-print-none">
          <RouterLink to="/plan" class="btn btn-outline-secondary" data-cy="results-edit-button">Change inputs</RouterLink>
          <RouterLink to="/dashboard" class="btn btn-outline-primary" data-cy="results-dashboard-button">Open the dashboard</RouterLink>
        </div>
      </template>
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
          The <Term id="break-even">break-even</Term> line is not a prediction of prices.
          <span v-if="result.mock" data-cy="results-mock-notice">Showing mock data.</span>
        </span>
      </p>
      <div v-if="result.outcomeA && result.outcomeB" class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path A: BTO"
            :subtitle="describe(store.choiceA)"
            :outcome="result.outcomeA"
            :horizon-year="horizonYear"
            cy-prefix="results-patha"
            tone="bto"
            :ahead="!verdict.close && verdict.winner === 'bto'"
          />
        </div>
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path B: Resale"
            :subtitle="describe(store.choiceB)"
            :outcome="result.outcomeB"
            :horizon-year="horizonYear"
            cy-prefix="results-pathb"
            tone="resale"
            :ahead="!verdict.close && verdict.winner === 'resale'"
          />
        </div>
      </div>

      <!-- The two prices everything rests on, as figures, with where each came from (D26, D39). -->
      <section v-if="btoPriceBasis || resalePriceBasis" class="card mb-3 price-basis" aria-labelledby="price-basis-title" data-cy="results-price-basis">
        <div class="card-body">
          <h2 id="price-basis-title" class="h6 mb-3">The prices we used</h2>
          <div class="price-basis__grid">
            <div v-if="btoPriceBasis" class="price-basis__item">
              <p class="price-basis__label"><span class="dash-dot dash-dot--bto" aria-hidden="true"></span>BTO price (estimated)</p>
              <p class="price-basis__figure text-numeric" data-cy="results-price-bto">{{ formatMoney(result.resolvedA.purchasePriceCents / 100) }}</p>
              <p class="price-basis__note" data-cy="results-price-basis-bto">
                {{ btoPriceBasis }}
                <RouterLink to="/dashboard" data-cy="results-price-basis-change">Change the price</RouterLink>
              </p>
            </div>
            <div v-if="resalePriceBasis" class="price-basis__item">
              <p class="price-basis__label"><span class="dash-dot dash-dot--resale" aria-hidden="true"></span>Resale price</p>
              <p class="price-basis__figure text-numeric" data-cy="results-price-resale">{{ formatMoney(result.resolvedB.purchasePriceCents / 100) }}</p>
              <p class="price-basis__note" data-cy="results-price-basis-resale">{{ resalePriceBasis }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Why one path ends ahead, line by line (D34). Arrives with /compare; hidden if an older server omits it. -->
      <GapBreakdownPanel v-if="result.gapBreakdown" :gap="result.gapBreakdown" />

      <div class="d-flex flex-wrap gap-2 mb-3 d-print-none">
        <button type="button" class="btn btn-outline-secondary" data-cy="results-print-button" @click="printPage">Print or save as PDF</button>
      </div>
      <SaveScenarioPanel class="d-print-none" :result="result" />

      <h2 class="h5 mt-4 mb-2">More detail</h2>
      <div class="results-sections">
        <DashboardSection
          v-if="result.outcomeA && result.outcomeB"
          v-model:open="sections.chart"
          title="Net position over time"
          takeaway="How each path's net position builds up year by year. Hover or tap the chart to compare."
          lazy
          cy="results-section-chart"
        >
          <p class="text-secondary">
            A running estimate, without selling: the flat's value minus the loan and the CPF to put back. It does not take off
            the cash you pay in, so {{ horizonYear }} here differs a little from the net position above. For the exact figure
            and what it is made of, see the
            <RouterLink to="/dashboard" data-cy="results-cashflow-dashboard-link">financial dashboard</RouterLink>.
          </p>
          <CashFlowOverTimeChart :outcome-a="result.outcomeA" :outcome-b="result.outcomeB" :horizon-year="horizonYear" />
        </DashboardSection>

        <DashboardSection
          v-model:open="sections.heatmap"
          title="Where each path ends ahead"
          :takeaway="heatmapTakeaway"
          cy="results-section-heatmap"
        >
          <!-- How to read it, in plain words: the grid is easy to misread without this. -->
          <ul class="heatmap-guide text-secondary" data-cy="results-heatmap-guide">
            <li>Nobody knows how fast flat prices or incomes will grow, so each square tries one combination: flat price growth a year across the top, income growth a year down the side.</li>
            <li>The colour says which path leaves you better off<template v-if="horizonYear"> in {{ horizonYear }}</template>: dark for BTO, pink for resale, grey when they're about level.</li>
            <li>"You" marks the growth rates in your plan. Select any square to see by how much one path is ahead.</li>
          </ul>
          <HeatmapGrid
            :grid="result.grid"
            :user-point="userPoint"
            :horizon-year="horizonYear"
            label-a="BTO"
            label-b="Resale"
          />
        </DashboardSection>

        <!-- Part of the plan, fetches independently of /compare: which BTO application year ends highest (POST /api/timing).
             Lazy: it only asks the server once the section is opened. -->
        <DashboardSection
          v-model:open="sections.timing"
          class="d-print-none"
          title="When to apply"
          :takeaway="timingTakeaway"
          lazy
          flat
          cy="results-section-timing"
        >
          <TimingOptimiserPanel @loaded="timingResult = $event" />
        </DashboardSection>
      </div>

      <ResultsNextSteps />

      <!-- TODO (seat 5): strategy top 3 once /api/strategy exists (future work, off by default). -->
    </template>
  </section>
</template>

<style scoped>
.results-sections { display: flex; flex-direction: column; gap: var(--space-3); }
.price-basis__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-4); }
.price-basis__item { min-width: 0; }
.price-basis__label { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
.price-basis__figure { margin: var(--space-1) 0 var(--space-2); font-family: var(--font-heading); font-size: 1.75rem; font-weight: 500; line-height: 1.1; letter-spacing: -0.02em; }
.price-basis__note { margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
.heatmap-guide { margin: 0 0 var(--space-3); padding-left: 1.1rem; font-size: 0.9375rem; line-height: 1.5; }
.heatmap-guide li + li { margin-top: var(--space-1); }
</style>

