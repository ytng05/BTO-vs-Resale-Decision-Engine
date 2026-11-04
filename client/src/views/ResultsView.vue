<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { compareReusing } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import ResultsRobustness from '../components/ResultsRobustness.vue';
import ResultsTradeoff from '../components/ResultsTradeoff.vue';
import ResultsPhgCard from '../components/ResultsPhgCard.vue';
import HeatmapGrid from '../components/HeatmapGrid.vue';
import PathOutcomeCard from '../components/PathOutcomeCard.vue';
import CashFlowOverTimeChart from '../components/CashFlowOverTimeChart.vue';
import SaveScenarioPanel from '../components/SaveScenarioPanel.vue';
import TimingOptimiserPanel from '../components/TimingOptimiserPanel.vue';
import ResultsNextSteps from '../components/ResultsNextSteps.vue';
import ResultsVerdict from '../components/ResultsVerdict.vue';
import BackToTop from '../components/BackToTop.vue';
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
  sections.value = { ...sections.value, chart: true, heatmap: true, steps: true };
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

// Progressive disclosure (redesign, 4 Nov 2026): the answer, "Would the answer change?" (the heatmap in small, so the
// central idea stays in view, D35), the trade-off and the two path cards are open; the full heatmap, the chart over
// time, when to apply and the official steps open on request (DashboardSection), each with a one-line takeaway.
const sections = ref({ chart: false, heatmap: false, timing: false, steps: false });

// Open a folded part, then move to its heading with focus, so keyboard and screen-reader users land there too.
async function openAndGo(id) {
  await nextTick();
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}
function openGrid() {
  sections.value = { ...sections.value, heatmap: true };
  openAndGo('heatmap-title');
}
function jumpToSteps() {
  sections.value = { ...sections.value, steps: true };
  openAndGo('steps-title');
}

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

// Who ends ahead, in a plain sentence, and the few numbers side by side (utils/resultsVerdict.js, unit-tested).
const verdict = computed(() => buildVerdict(result.value?.outcomeA, result.value?.outcomeB, horizonYear.value));
const keyComparison = computed(() => keyRows(result.value?.outcomeA, result.value?.outcomeB, horizonYear.value));


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
// The same two prices in a few words, for the "Based on" line: "middle of Tampines Bliss's range", "median of 112 sales".
const btoShort = computed(() => {
  const p = result.value?.btoProjectA;
  const used = result.value?.resolvedA?.purchasePriceCents;
  if (!p || typeof used !== 'number') return '';
  const mid = Math.round((p.priceMinCents + p.priceMaxCents) / 2);
  return `${used === mid ? 'middle of' : 'within'} ${p.name}'s range`;
});
const resaleShort = computed(() => {
  const r = result.value?.resolvedB;
  const d = r?.priceData;
  if (!r || typeof r.purchasePriceCents !== 'number' || !d) return '';
  const medianCents = r.medianPriceCents ?? r.purchasePriceCents;
  if (r.purchasePriceCents !== medianCents) return 'your asking price';
  return `median of ${d.transactions} ${labelOf(TOWNS, store.choiceB.town)} sale${d.transactions === 1 ? '' : 's'}`;
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
    result.value = await compareReusing(store); // the same request as the other page reuses its answer
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
      <p class="d-none d-print-block small mb-2" data-cy="results-print-header">
        BTO vs Resale · printed {{ printedOn }} · {{ planLine }}
      </p>
      <div class="results-page">
        <!-- 1. Who ends ahead, by how much, and both net positions (D1, D42). -->
        <ResultsVerdict
          v-if="verdict.winner"
          :verdict="verdict"
          :rows="keyComparison"
          :horizon-year="horizonYear"
          :label-a="`BTO · ${labelOf(TOWNS, store.choiceA.town)}`"
          :label-b="`Resale · ${labelOf(TOWNS, store.choiceB.town)}`"
        />
        <h1 v-else class="hero-statement">Your result</h1>

        <!-- 2. The two prices everything rests on, in one line; where each came from one click away (D26, D33, D39). -->
        <section class="basis" aria-label="The prices we used" data-cy="results-price-basis">
          <div class="basis__strip">
            <span class="basis__lead">Based on</span>
            <span v-if="btoShort">
              <strong>BTO <span class="text-numeric" data-cy="results-price-bto">{{ formatMoney(result.resolvedA.purchasePriceCents / 100) }}</span></strong>
              · {{ btoShort }}
            </span>
            <span v-if="btoShort && resaleShort" class="basis__sep" aria-hidden="true">|</span>
            <span v-if="resaleShort">
              <strong>Resale <span class="text-numeric" data-cy="results-price-resale">{{ formatMoney(result.resolvedB.purchasePriceCents / 100) }}</span></strong>
              · {{ resaleShort }}
            </span>
            <span class="basis__sep" aria-hidden="true">|</span>
            <span class="badge-version" data-cy="results-ruleset-version">Ruleset {{ result.rulesetVersion }}</span>
            <span v-if="result.mock" class="basis__mock" data-cy="results-mock-notice">Showing mock data</span>
            <RouterLink to="/dashboard" class="basis__change d-print-none" data-cy="results-price-basis-change">Change the prices</RouterLink>
          </div>
          <details class="basis__more">
            <summary class="basis__more-toggle">How we chose these prices</summary>
            <p v-if="btoPriceBasis" class="basis__note" data-cy="results-price-basis-bto">{{ btoPriceBasis }}</p>
            <p v-if="resalePriceBasis" class="basis__note" data-cy="results-price-basis-resale">{{ resalePriceBasis }}</p>
          </details>
        </section>

        <!-- 3. Would the answer change (the heatmap in small, D35, D40), and the trade-off. -->
        <div class="results-pair">
          <ResultsRobustness
            :grid="result.grid"
            :break-even-sentence="result.breakEvenSentence"
            :bto-price-sentence="result.btoPriceSentence"
            @open-grid="openGrid"
          />
          <ResultsTradeoff :rows="keyComparison" :close="verdict.close" />
        </div>

        <!-- 4. Each path in plain words (D1). Why one path ends ahead, line by line (D34), is on the Dashboard. -->
        <section v-if="result.outcomeA && result.outcomeB" class="paths" aria-labelledby="path-details-title">
          <h2 id="path-details-title" class="paths__title" tabindex="-1">Each path<template v-if="horizonYear"> in {{ horizonYear }}</template>, in plain words</h2>
          <div class="row g-3">
            <div class="col-12 col-lg-6">
              <PathOutcomeCard
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
                :subtitle="describe(store.choiceB)"
                :outcome="result.outcomeB"
                :horizon-year="horizonYear"
                cy-prefix="results-pathb"
                tone="resale"
                :ahead="!verdict.close && verdict.winner === 'resale'"
              />
            </div>
          </div>
          <p class="paths__why d-print-none" data-cy="results-why-dashboard">
            Why one path comes out ahead, line by line, is on the
            <RouterLink to="/dashboard" data-cy="results-why-dashboard-link">Dashboard</RouterLink>.
          </p>
        </section>

        <!-- 5. The Proximity Housing Grant, when the parents question wasn't asked (D38). Each card has its own grants. -->
        <ResultsPhgCard v-if="phgNotAsked" @add-parents="addParents" />

        <!-- 6. Next: the Dashboard, the official steps, saving and printing. -->
        <section class="next d-print-none" aria-label="Next" data-cy="results-verdict-next">
          <p class="next__text mb-0"><strong>Next:</strong> see how the numbers change over time, then check the official steps.</p>
          <div class="next__actions">
            <RouterLink to="/dashboard" class="btn btn-primary" data-cy="results-dashboard-button">Open the dashboard</RouterLink>
            <button type="button" class="btn btn-outline-secondary" data-cy="results-steps-jump" @click="jumpToSteps">Official steps</button>
            <SaveScenarioPanel class="next__save" :result="result" />
            <button type="button" class="btn btn-link" data-cy="results-print-button" @click="printPage">Print or save as PDF</button>
            <RouterLink to="/plan" class="btn btn-link" data-cy="results-edit-button">Change inputs</RouterLink>
          </div>
        </section>

        <!-- 7. More detail, folded: the chart over time, the full heatmap, when to apply, the official steps. -->
        <section aria-labelledby="more-title" class="results-more">
          <h2 id="more-title" class="results-more__title">More detail</h2>
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
              heading-id="heatmap-title"
              cy="results-section-heatmap"
            >
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

            <!-- Fetches on its own once opened: which BTO application year ends highest (POST /api/timing). -->
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

            <DashboardSection
              v-model:open="sections.steps"
              title="What to do next"
              takeaway="Five official steps: the HFE letter, grants, a budget, resale payments and the conditions after buying."
              flat
              heading-id="steps-title"
              cy="results-section-steps"
            >
              <ResultsNextSteps />
            </DashboardSection>
          </div>
        </section>
      </div>
      <!-- TODO (seat 5): strategy top 3 once /api/strategy exists (future work, off by default). -->
    </template>

    <BackToTop />
  </section>
</template>

<style scoped>
/* Redesign (4 Nov 2026): one column of boxes, two side by side where they pair up, stacking on phones. */
.results-page { display: flex; flex-direction: column; gap: var(--space-5); }
.results-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: var(--space-4); }
.results-sections { display: flex; flex-direction: column; gap: var(--space-3); }
.results-more__title { margin: 0 0 var(--space-3); font-size: 1.125rem; font-weight: 600; }

/* "Based on" line */
.basis { padding: var(--space-3) var(--space-5); border-radius: var(--radius-md); background: var(--bg-surface); font-size: 0.875rem; color: var(--text-secondary); }
.basis__strip { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); }
.basis__strip strong { color: var(--text-primary); }
.basis__lead { font-weight: 500; }
.basis__mock { padding: 0.125rem 0.625rem; border-radius: var(--radius-pill); background: var(--warning-fill); color: var(--warning); font-weight: 500; }
.basis__change { margin-left: auto; font-weight: 600; color: var(--text-primary); }
.basis__more { margin-top: var(--space-2); }
.basis__more-toggle { cursor: pointer; font-size: 0.8125rem; color: var(--text-secondary); }
.basis__more-toggle:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }
.basis__note { margin: var(--space-2) 0 0; line-height: 1.5; }

/* Each path in plain words */
.paths { display: flex; flex-direction: column; gap: var(--space-3); }
.paths__title { margin: 0; font-size: 1.5rem; font-weight: 600; }
.paths__why { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
.paths__why a { font-weight: 600; color: var(--text-primary); }

/* Next bar */
.next { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); background: var(--bg-surface); }
.next__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.next__save { margin-bottom: 0 !important; }

.heatmap-guide { margin: 0 0 var(--space-3); padding-left: 1.1rem; font-size: 0.9375rem; line-height: 1.5; }
.heatmap-guide li + li { margin-top: var(--space-1); }
</style>

