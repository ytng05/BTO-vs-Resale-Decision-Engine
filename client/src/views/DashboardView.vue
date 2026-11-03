<script setup>
// Feature 2: the financial dashboard. Both paths side by side, measured in the same year (contract v2, D1).
// Layout (version E, picked on the design canvas): top, the verdict (indigo) and whether today's savings cover the
// cash up front; left, "Side by side" (rounded, each row naming the path it favours, with "why" on request) and
// "How each purchase is paid" (exact, price down to cash); right, what changed since your inputs and the what-if
// sliders; below, every detail section, closed, and the notes before deciding.
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
import DashboardVerdict from '../components/dashboard/DashboardVerdict.vue';
import DashboardCashCard from '../components/dashboard/DashboardCashCard.vue';
import DashboardSideBySide from '../components/dashboard/DashboardSideBySide.vue';
import DashboardPaid from '../components/dashboard/DashboardPaid.vue';
import DashboardNotes from '../components/dashboard/DashboardNotes.vue';
import { groupWarnings, priceFlip, whatIfChanges } from '../utils/dashboardSummary.js';
import { verdict } from '../utils/resultsVerdict.js';
import { totalCpfOa } from '../utils/dashboardFormat.js';
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
const baselineGapCents = ref(null);
// What the sliders changed from the saved plan, in words (empty when nothing moved).
const changes = computed(() => whatIfChanges(whatIf, planValues.value));

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
    if (id === requestId) {
      result.value = res; // ignore answers to older slider positions
      // The answer at the saved plan's own values, for "since your inputs" once a slider moves.
      if (changes.value.length === 0 && res?.outcomeA && res?.outcomeB) {
        baselineGapCents.value = res.outcomeA.netPositionCents - res.outcomeB.netPositionCents;
      }
    }
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

// Who ends ahead, by the Results page's rule (D42): within 2% of the larger net position neither path is called
// ahead, so the two pages never disagree.
const call = computed(() => verdict(A.value, B.value, horizon.value));

const headline = computed(() => {
  if (gapCents.value === null) return 'Your financial dashboard';
  if (call.value.close) return call.value.headline; // "Too close to call: …" or "… about the same by …", as on Results
  // Rounded to S$1,000 like every summary on the page; the exact figures are in "How each purchase is paid".
  return `${gapCents.value > 0 ? 'BTO' : 'Resale'} ends ${formatMoney(Math.round(Math.abs(gapCents.value) / 100 / 1000) * 1000)} ahead by ${horizon.value}`;
});

// Where the answer flips on the flat price growth slider, at the income growth being tried now.
const flip = computed(() => priceFlip(result.value, whatIf.annualIncomeGrowth));

// "Since your inputs": the answer at the saved plan against the answer now.
const k = (cents) => formatMoney(Math.round(Math.abs(cents) / 100 / 1000) * 1000);
const sinceInputs = computed(() => {
  if (!changes.value.length || baselineGapCents.value === null || gapCents.value === null) return null;
  const before = baselineGapCents.value;
  const now = gapCents.value;
  const leaderNow = now === 0 ? null : now > 0 ? 'BTO' : 'Resale';
  const leaderBefore = before === 0 ? null : before > 0 ? 'BTO' : 'Resale';
  const status = !leaderNow ? 'Now level'
    : call.value.close ? 'Now too close to call'
      : leaderNow === leaderBefore ? `${leaderNow} still ahead` : `Now ${leaderNow.toLowerCase()} is ahead`;
  return { status, before: k(before), now: k(now), tone: leaderNow === 'Resale' ? 'resale' : 'bto' };
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

// One line per path for the purchase cards' headers: "Bishan · 4-room · Prime".
const cardSubtitle = (c, withClass) => [labelOf(TOWNS, c.town), labelOf(FLAT_TYPES, c.flatType), withClass && c.classification ? labelOf(CLASSIFICATIONS, c.classification) : '']
  .filter(Boolean).join(' · ');
const cpfOa = computed(() => totalCpfOa(store.profile.applicants));

// The warnings, below the summary: a banner when HDB wouldn't sell this BTO that year, then the notes that no card
// already says, one per code (groupWarnings).
const warningGroups = computed(() => groupWarnings(A.value, B.value, result.value?.warningMessages ?? {}));

// "Try a later year in What if": bring the panel into view and move focus to the application year's + button (the
// years are − / + steppers, so the panel's first slider would be flat price growth).
function jumpToWhatIf() {
  const panel = document.querySelector('[data-cy=dashboard-whatif]');
  panel?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  (panel?.querySelector('[data-cy=whatif-year-plus]') ?? panel?.querySelector('button, input'))?.focus({ preventScroll: true });
}
// A code becomes the server's plain-English sentence (`warningMessages`, docs/API_CONTRACT.md "POST /api/compare");
// the bare code only if the server sent none for it.

// The detail sections open and close. All start closed (the summary above answers first), each with a one-line
// takeaway in its header. "Expand all" opens or closes every one.
const sections = reactive({ overview: false, cashflow: false, grants: false, costs: false, rpi: false, map: false, size: false });
const allOpen = computed(() => Object.values(sections).every(Boolean));
function toggleAll() {
  const next = !allOpen.value;
  Object.keys(sections).forEach((key) => { sections[key] = next; });
}
// "More detail" folds every section into one row, closed at first.
const moreOpen = ref(false);
// The grants link in the overview: open the section, then bring its heading into view and focus it.
function showGrants() {
  moreOpen.value = true;
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
      <div class="dash-e">
        <div class="dash-topbar">
          <p class="dash-topbar__subtitle mb-0">
            <span data-cy="dashboard-subtitle">{{ subtitle }}</span>
            <span class="badge-version" data-cy="dashboard-ruleset-version">Ruleset {{ result.rulesetVersion }}</span>
            <span v-if="result.mock" class="dash-topbar__chip" data-cy="dashboard-mock-notice">Example data</span>
            <span v-if="updating" class="text-caption" role="status" data-cy="dashboard-updating">Updating…</span>
          </p>
          <div class="d-flex gap-2 d-print-none">
            <RouterLink to="/plan" class="btn btn-outline-secondary" data-cy="dashboard-edit-button">Edit inputs</RouterLink>
            <RouterLink to="/results" class="btn btn-primary" data-cy="dashboard-results-button">Back to results</RouterLink>
          </div>
        </div>

        <div v-if="error" class="alert alert-warning" role="alert" data-cy="dashboard-update-error">
          {{ error }} Showing your last results.
        </div>

        <div v-if="A && B" class="dash-top">
          <DashboardVerdict :outcome-a="A" :outcome-b="B" :headline="headline" :call="call" :horizon="horizon" :blocked-year="warningGroups.blocking.length ? whatIf.applicationYear : null" />
          <DashboardCashCard :outcome-a="A" :outcome-b="B" :cash-savings="store.profile.cashSavings" @jump-whatif="jumpToWhatIf" />
        </div>
        <h1 v-else id="dashboard-heading" class="hero-statement" data-cy="dashboard-headline">{{ headline }}</h1>

        <div class="dash-main" :aria-busy="updating ? 'true' : 'false'">
          <div class="dash-main__content">
            <DashboardSideBySide v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon="horizon" :gap="result.gapBreakdown ?? null" />

            <DashboardPaid
              v-if="A && B"
              :outcome-a="A"
              :outcome-b="B"
              :resolved-b="result.resolvedB ?? null"
              :subtitle-a="cardSubtitle(store.choiceA, true)"
              :subtitle-b="cardSubtitle(store.choiceB, false)"
              :cash-savings="store.profile.cashSavings ?? null"
              :cpf-oa="cpfOa"
            />

            <DashboardNotes
              :blocking="warningGroups.blocking"
              :notes="warningGroups.notes"
              :application-year="whatIf.applicationYear"
              @jump-whatif="jumpToWhatIf"
            />

            <!-- Everything else, one click away: the sections hold the grant checks with sources, the costs, the
                 price history (D35), the PHG map (D15) and the flat sizes, so they stay, folded into one row. -->
            <details class="dash-more" :open="moreOpen" data-cy="dashboard-more-detail" @toggle="moreOpen = $event.target.open">
              <summary class="dash-more__summary">
                <span>
                  <strong>More detail</strong>
                  <small>Grant checks with sources, every cost, how the net position adds up, price history, the PHG map, flat sizes and notes before you decide</small>
                </span>
                <svg class="dash-more__chevron" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </summary>
              <div class="dash-more__body">
            <div class="d-flex justify-content-end">
              <button type="button" class="btn btn-link p-0" data-cy="dashboard-sections-toggle" @click="toggleAll">
                {{ allOpen ? 'Collapse all' : 'Expand all' }}
              </button>
            </div>

            <DashboardSection
              v-model:open="sections.overview"
              title="Cash, savings and keys"
              takeaway="How much of the cash up front your savings cover, what you start with, and when the keys come."
              flat
              cy="dashboard-section-overview"
            >
              <DashboardOverview
                v-if="A && B"
                :outcome-a="A"
                :outcome-b="B"
                :cash-savings="store.profile.cashSavings"
                :applicants="store.profile.applicants"
                :horizon="horizon"
                @open-grants="showGrants"
              />
            </DashboardSection>

            <DashboardSection
              v-model:open="sections.cashflow"
              title="How the net position adds up"
              :takeaway="`In ${horizon}: what the flat is worth, minus what you still owe and the cash you spent on housing.`"
              lazy
              cy="dashboard-section-cashflow"
            >
              <p class="text-secondary small">Nothing is sold: this is the position if you stayed in the flat.</p>
              <CashFlowChart v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon-year="horizon" />
            </DashboardSection>

            <DashboardSection
              v-model:open="sections.grants"
              heading-id="grants-heading"
              title="Every grant check, with sources"
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
              :title="`Every cost up to ${horizon}, and how it's paid`"
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
            </details>
          </div>

          <aside class="dash-main__side">
            <div class="dash-sticky">
              <WhatIfPanel
                :model-value="whatIf"
                :horizon-shown="horizon"
                :horizon-min="horizonLimits.min"
                :horizon-max="horizonLimits.max"
                :bto-range="btoRange"
                :resale-median="resaleMedian"
                :baseline="planValues"
                :price-flip="flip"
                @update:model-value="setWhatIf"
                @reset="reset"
              >
                <template #live>
                  <div class="dash-since" :class="sinceInputs ? `dash-since--${sinceInputs.tone}` : ''" aria-live="polite" data-cy="dashboard-since-inputs">
                    <template v-if="sinceInputs">
                      <strong class="dash-since__status">{{ sinceInputs.status }}</strong>
                      <span class="dash-since__figures"><s>{{ sinceInputs.before }}</s> {{ sinceInputs.now }}</span>
                      <span class="small text-secondary">Since your inputs: {{ changes.join('; ') }}</span>
                    </template>
                    <template v-else>
                      <strong class="dash-since__status">Try a what-if</strong>
                      <span class="small text-secondary">Change any of these and every number on the page updates. Your saved plan stays as it is.</span>
                    </template>
                  </div>
                </template>
              </WhatIfPanel>
            </div>
          </aside>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* On large screens the What-if panel stays in view as you scroll, as in the mock-up. The right column stretches to
   the full height of the page's content so the panel has room to stick in; the panel itself never scrolls inside. */
.dash-main__side { align-self: stretch; }
@media (min-width: 992px) {
  .dash-sticky { position: sticky; top: var(--space-5); }
  .dash-sticky :deep(.dash-whatif) { position: static; }
}
/* Version E's colours: BTO indigo and resale berry for text, with pale tints behind (all pass 4.5:1). */
.dash-e {
  --dash-bto: var(--accent-deep); --dash-bto-tint: var(--accent-fill-3); --dash-bto-pale: #f4f5fb;
  --dash-resale: var(--color-berry); --dash-resale-tint: var(--accent-fill-2); --dash-resale-pale: #fdeef5;
  display: flex; flex-direction: column; gap: var(--space-5);
}
.dash-topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.dash-topbar__subtitle { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); color: var(--text-secondary); font-size: 1.0625rem; }
.dash-topbar__chip { padding: 0.125rem 0.75rem; border-radius: var(--radius-pill); border: 1px solid var(--border-subtle); background: var(--bg-surface); font-size: 0.8125rem; }
.dash-top { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--space-5); }
.dash-main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 400px); gap: var(--space-5); align-items: start; }
.dash-main__content { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
.dash-main :deep(.dash-panel) { display: flex; flex-direction: column; gap: var(--space-4); padding: clamp(20px, 3vw, 36px); border-radius: var(--radius-lg); background: var(--bg-surface); box-shadow: var(--shadow-sm); }
.dash-main :deep(.dash-panel__title) { margin: 0; font-family: var(--font-heading); font-size: 1.5rem; font-weight: 600; }
.dash-more { border-radius: var(--radius-lg); background: var(--bg-surface); box-shadow: var(--shadow-sm); }
.dash-more__summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-5) clamp(20px, 3vw, 36px); cursor: pointer; list-style: none; }
.dash-more__summary::-webkit-details-marker { display: none; }
.dash-more__summary strong { display: block; font-family: var(--font-heading); font-size: 1.25rem; font-weight: 600; }
.dash-more__summary small { display: block; color: var(--text-secondary); font-size: 0.875rem; }
.dash-more__summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: var(--radius-lg); }
.dash-more__chevron { flex: none; transition: transform var(--duration-base) var(--ease-out); }
.dash-more[open] .dash-more__chevron { transform: rotate(180deg); }
.dash-more__body { display: flex; flex-direction: column; gap: var(--space-4); padding: 0 clamp(12px, 2vw, 20px) clamp(12px, 2vw, 20px); }
@media (prefers-reduced-motion: reduce) { .dash-more__chevron { transition: none; } }
.dash-since { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-5); padding: var(--space-4) var(--space-4); border-radius: var(--radius-sm); background: var(--bg-page); }
.dash-since--bto { background: var(--dash-bto-tint); }
.dash-since--resale { background: var(--dash-resale-tint); }
.dash-since__status { color: var(--dash-bto); }
.dash-since--resale .dash-since__status { color: var(--dash-resale); }
.dash-since__figures { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; }
.dash-since__figures s { font-size: 1.125rem; font-weight: 500; color: var(--text-secondary); margin-right: var(--space-2); }
@media (max-width: 991.98px) {
  .dash-top, .dash-main { grid-template-columns: minmax(0, 1fr); }
}
.dash-note {
  background: var(--accent-fill-3);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
}
</style>
