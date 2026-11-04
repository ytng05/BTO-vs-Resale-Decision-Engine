<script setup>
// Feature 2: the financial dashboard, where you test the answer the Results page gives. Both paths, measured in the
// same year (contract v2, D1). Top to bottom: the answer as a compact card tinted in the leading path's colour
// (DashboardVerdictBar), whether today's savings cover the cash, quick scenario chips, the notes no card already
// says, "At a glance", then "How you'd pay for it", how each net position adds up, where each path comes out ahead
// (the heatmap: click a square to try its rates), and "Explore the detail" (pop-ups), with the What-if panel
// beside them, sticky on large screens.
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
import { formatMoneyRounded } from '../utils/format.js';
import { costsTakeaway, grantsTakeaway, monthYear } from '../utils/dashboardFormat.js';
import WhatIfPanel from '../components/dashboard/WhatIfPanel.vue';
import GrantsTable from '../components/dashboard/GrantsTable.vue';
import CashFlowChart from '../components/dashboard/CashFlowChart.vue';
import CostBreakdownTable from '../components/dashboard/CostBreakdownTable.vue';
import DashboardVerdictBar from '../components/dashboard/DashboardVerdictBar.vue';
import HeatmapGrid from '../components/HeatmapGrid.vue';
import DashboardCashCard from '../components/dashboard/DashboardCashCard.vue';
import DashboardGlance from '../components/dashboard/DashboardGlance.vue';
import DashboardPaid from '../components/dashboard/DashboardPaid.vue';
import DashboardNotes from '../components/dashboard/DashboardNotes.vue';
import { groupWarnings, priceFlip, whatIfChanges } from '../utils/dashboardSummary.js';
import { verdict } from '../utils/resultsVerdict.js';
import { totalCpfOa } from '../utils/dashboardFormat.js';
import DashboardExplore from '../components/dashboard/DashboardExplore.vue';
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
// Each path's net position at the saved plan, for the ghost bars at the top.
const baselineNets = ref(null);
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
        baselineNets.value = { a: res.outcomeA.netPositionCents, b: res.outcomeB.netPositionCents };
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

// The same sentence as the top of the Results page (verdict() in utils/resultsVerdict.js), so the two pages never
// word the answer differently: "BTO leaves you about S$104,000 better off by 2039", "Too close to call: …".
const headline = computed(() => (gapCents.value === null ? 'Your financial dashboard' : call.value.headline));

// The heatmap: every combination of flat price and income growth the server tested (D33). "You" marks the rates
// being tried now; clicking a square moves both growth sliders to it, and the whole page updates.
const heatmapUser = computed(() => ({ priceGrowth: whatIf.annualPriceGrowth, incomeGrowth: whatIf.annualIncomeGrowth }));
const heatmapLine = computed(() => {
  const cells = (result.value?.grid ?? []).flat();
  if (!cells.length) return '';
  const a = cells.filter((c) => c.winner === 'A').length;
  const b = cells.filter((c) => c.winner === 'B').length;
  if (a === cells.length) return `BTO comes out ahead in all ${cells.length} futures tested.`;
  if (b === cells.length) return `Resale comes out ahead in all ${cells.length} futures tested.`;
  return `BTO comes out ahead in ${a} of ${cells.length} futures tested, resale in ${b}.`;
});
function tryCell(cell) {
  if (!cell) return;
  setWhatIf({ ...whatIf, annualPriceGrowth: cell.annualPriceGrowth, annualIncomeGrowth: cell.annualIncomeGrowth });
}

// Where the answer flips on the flat price growth slider, at the income growth being tried now.
const flip = computed(() => priceFlip(result.value, whatIf.annualIncomeGrowth));

// "Since your inputs": the answer at the saved plan against the answer now.
const k = (cents) => formatMoneyRounded(Math.abs(cents)); // one rounding rule: summaries to S$1,000
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
// The two flats being compared, as two chips at the top: "BTO · Bukit Merah · 4-room · Prime" and "Resale · …".

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
// Quick scenarios, as filter chips along the top (like a property site's search filters): each sets a few
// assumptions at once on top of the current ones; "Reset" in the What-if panel goes back to the plan.
const PRESETS = [
  { id: 'boom', label: 'Prices boom', hint: 'Flat prices +5% a year', set: { annualPriceGrowth: 0.05 } },
  { id: 'flat', label: 'Prices stay flat', hint: 'Flat prices 0% a year', set: { annualPriceGrowth: 0 } },
  { id: 'rent', label: 'I rent while waiting', hint: 'S$2,500 a month until the keys', set: { monthlyHousingCostWhileWaiting: 2500 } },
  { id: 'reno', label: 'Big renovation', hint: 'S$60,000 on each flat', set: { renovationA: 60000, renovationB: 60000 } },
];
const presetOn = (p) => Object.entries(p.set).every(([k, val]) => whatIf[k] === val);
const applyPreset = (p) => setWhatIf({ ...whatIf, ...p.set });

// "How it changes over time" (the net position chart) is always open, beside the What-if panel, so dragging a
// slider shows its effect straight away.
// "Explore the detail": one card per detail. Clicking a card opens that detail in a pop-up (a dialog over the page),
// so the page stays short. Escape, the close button or a click outside closes it, and focus goes back to the card.
// The detail only loads when its pop-up opens.
const EXPLORE = [
  { key: 'grants', title: 'Grants', sub: 'Which grants you get, and why', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z' },
  { key: 'costs', title: 'Every cost', sub: 'Rent, fees, interest', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3' },
  { key: 'rpi', title: 'Price history', sub: 'Past resale prices', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { key: 'map', title: 'Near parents', sub: 'Postal code and 4 km map', icon: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { key: 'size', title: 'Flat sizes', sub: 'Price per square metre', icon: 'M4 4h16v16H4zM4 9h5M4 14h3M9 4v5M14 4v3' },
];
const openKey = ref(null);
const closeBtn = ref(null);
const everOpened = ref(false);
const seen = reactive({}); // the details opened so far: they stay mounted, only hidden
// The navbar sits outside this page, so it is made inert by hand while a pop-up is open.
const setNavInert = (on) => document.querySelector('[data-cy=nav-bar]')?.toggleAttribute('inert', on);
let openedFrom = null;
const openItem = computed(() => EXPLORE.find((e) => e.key === openKey.value) ?? null);
function onKey(e) {
  if (e.key === 'Escape') closeDetail();
}
async function openDetail(key) {
  openedFrom = document.activeElement;
  everOpened.value = true;
  seen[key] = true;
  openKey.value = key;
  setNavInert(true);
  document.body.classList.add('dash-modal-open'); // stops the page behind from scrolling
  document.addEventListener('keydown', onKey);
  await nextTick();
  closeBtn.value?.focus();
}
async function closeDetail() {
  if (!openKey.value) return;
  openKey.value = null;
  setNavInert(false);
  document.body.classList.remove('dash-modal-open');
  document.removeEventListener('keydown', onKey);
  await nextTick(); // the page stops being inert on the next update; only then can the card take focus back
  openedFrom?.focus?.();
}
onBeforeUnmount(closeDetail);
const grantsLine = computed(() => grantsTakeaway(A.value, B.value));
const costsLine = computed(() => costsTakeaway(A.value, B.value));
const mapLine = computed(() => (store.choiceB.livingArrangement === 'NEAR'
  ? "You said you'll live near your parents: check the 4 km rule."
  : "Only needed if you'll live near your parents."));
// One line under each pop-up's title.
const detailLine = computed(() => ({
  grants: grantsLine.value,
  costs: costsLine.value,
  rpi: 'Historical only, not a prediction of future prices.',
  map: mapLine.value,
  size: 'Floor area, price and price per square metre for each path.',
}[openKey.value] ?? ''));
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
      <div class="skeleton mb-4 results-skeleton results-skeleton--card" aria-hidden="true"></div>
      <div class="row g-3" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="col-6 col-lg-3"><div class="skeleton results-skeleton results-skeleton--card"></div></div>
      </div>
    </div>

    <!-- Error with nothing to show -->
    <div v-else-if="!result" class="alert alert-danger" role="alert" data-cy="dashboard-error">
      <p class="mb-2">{{ error }}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="dashboard-retry-button" @click="run">Try again</button>
    </div>

    <template v-else>
    <!-- While a pop-up is open the page behind is inert: Tab can't reach the sliders under the backdrop. -->
    <div class="dash-e" :inert="openKey ? '' : null">
      <!-- 1. The answer -->
      <DashboardVerdictBar
        v-if="A && B"
        :outcome-a="A"
        :outcome-b="B"
        :headline="headline"
        :call="call"
        :horizon="horizon"
        :flats="{ bto: cardSubtitle(store.choiceA, true), resale: cardSubtitle(store.choiceB, false) }"
        :ruleset-version="result.rulesetVersion"
        :blocked-year="warningGroups.blocking.length ? whatIf.applicationYear : null"
        :baseline="changes.length ? baselineNets : null"
        :updating="updating"
      >
        <RouterLink to="/results" class="btn btn-primary btn-disc dash-btn" data-cy="dashboard-results-button">
          <span class="btn-disc__disc" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
          Back to results
        </RouterLink>
        <RouterLink to="/plan" class="btn btn-outline-secondary dash-btn" data-cy="dashboard-edit-button">Edit inputs</RouterLink>
        <span v-if="result.mock" class="dash-status" data-cy="dashboard-mock-notice">Example data</span>
        <span v-if="updating" class="dash-status" role="status" data-cy="dashboard-updating">Updating…</span>
      </DashboardVerdictBar>
      <h1 v-else id="dashboard-heading" class="hero-statement" data-cy="dashboard-headline">{{ headline }}</h1>

      <div v-if="error" class="alert alert-warning mb-0" role="alert" data-cy="dashboard-update-error">
        {{ error }} Showing your last results.
      </div>

      <!-- 2. Can today's savings pay the cash up front? -->
      <DashboardCashCard v-if="A && B" :outcome-a="A" :outcome-b="B" :cash-savings="store.profile.cashSavings" @jump-whatif="jumpToWhatIf" />

      <!-- Quick scenarios, as filter chips. "More options" jumps to the full What-if panel. -->
      <div class="dash-chips" role="group" aria-label="Quick scenarios" data-cy="whatif-presets">
        <span class="dash-chips__label">Try a scenario</span>
        <button
          v-for="p in PRESETS"
          :key="p.id"
          type="button"
          class="dash-chip-btn"
          :class="{ 'is-on': presetOn(p) }"
          :aria-pressed="presetOn(p)"
          :title="p.hint"
          :data-cy="`whatif-preset-${p.id}`"
          @click="applyPreset(p)"
        >{{ p.label }}</button>
        <button v-if="changes.length" type="button" class="dash-chip-btn dash-chip-btn--reset" data-cy="dashboard-chips-reset" @click="reset">✕ Clear</button>
        <button type="button" class="dash-chip-btn dash-chip-btn--more" @click="jumpToWhatIf">More options ▾</button>
      </div>

      <!-- Warnings no tile already says -->
      <DashboardNotes
        :blocking="warningGroups.blocking"
        :notes="warningGroups.notes"
        :application-year="whatIf.applicationYear"
        @jump-whatif="jumpToWhatIf"
      />

      <!-- 3. At a glance -->
      <DashboardGlance v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon="horizon" :call="call" :gap="result.gapBreakdown ?? null" />

      <!-- 4. How you'd pay, and the detail, with the What-if panel beside them -->
      <div class="dash-main" :aria-busy="updating ? 'true' : 'false'">
        <div class="dash-main__content">
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

          <!-- How the net position adds up: always open, so the What-if panel's effect shows right here. -->
          <section class="dash-panel" aria-labelledby="cashflow-heading" data-cy="dashboard-section-cashflow">
            <div>
              <h2 id="cashflow-heading" class="section-head__title">How each net position adds up</h2>
              <p class="section-head__sub">What each path leaves you with in {{ horizon }}, line by line. Move a What-if slider to see it change.</p>
            </div>
            <CashFlowChart v-if="A && B" :outcome-a="A" :outcome-b="B" :horizon-year="horizon" />
          </section>

          <!-- Where each path comes out ahead: the heatmap, linked to the What-if panel. -->
          <section v-if="result.grid?.length" class="dash-panel" aria-labelledby="heatmap-heading" data-cy="dashboard-section-heatmap">
            <div>
              <h2 id="heatmap-heading" class="section-head__title">Where each path comes out ahead</h2>
              <p class="section-head__sub">{{ heatmapLine }} Click a square to try its rates in the What-if.</p>
            </div>
            <HeatmapGrid
              :grid="result.grid"
              :user-point="heatmapUser"
              :horizon-year="horizon"
              label-a="BTO"
              label-b="Resale"
              @pick="tryCell"
            />
          </section>

          <section class="dash-explore" aria-labelledby="explore-heading" data-cy="dashboard-more-detail">
            <h2 id="explore-heading" class="section-head__title">Explore the detail</h2>
            <DashboardExplore :items="EXPLORE" :picked="openKey" @pick="openDetail" />
          </section>

          <!-- Before you decide -->
          <section class="dash-before" aria-labelledby="notes-heading">
            <h2 id="notes-heading" class="section-head__title mb-3">Before you decide</h2>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <p class="dash-note mb-0" data-cy="dashboard-note-mop">
                  <strong><Term id="mop">Minimum Occupation Period</Term></strong><br>
                  Earliest sale: {{ monthYear(A?.timeline?.earliestSaleDate) }} (BTO), {{ monthYear(B?.timeline?.earliestSaleDate) }} (resale).
                  <RouterLink to="/sources#flat-types">Rule</RouterLink>
                </p>
              </div>
              <div class="col-12 col-md-6">
                <p class="dash-note mb-0" data-cy="dashboard-note-eip">
                  <strong>Ethnic Integration Policy</strong><br>
                  Some resale blocks are full on their ethnic or PR quota. Check the block before you pay for an Option to Purchase.
                  <a href="https://www.hdb.gov.sg/buying-a-flat/resale-flats/process-for-buying-a-resale-flat/resale-flat-planning/eip-and-spr-quota" target="_blank" rel="noopener noreferrer">Check the quota<span class="visually-hidden"> (EIP and SPR, HDB, opens in a new tab)</span> <span aria-hidden="true">↗</span></a>
                </p>
              </div>
            </div>
          </section>
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
                    <span class="small text-secondary">Drag a slider: every number on the page updates. Your saved plan stays the same.</span>
                  </template>
                </div>
              </template>
            </WhatIfPanel>
          </div>
        </aside>
      </div>


    </div>

      <!-- The detail pop-up. Clicking the dark backdrop (but not the box) closes it. It is created on the first open
           and then only hidden, so each detail keeps what was typed (PHG postal codes) and doesn't load again. -->
      <div v-if="everOpened" v-show="openItem" class="dash-modal" @click.self="closeDetail">
        <div
          class="dash-modal__box"
          :role="openItem ? 'dialog' : null"
          aria-modal="true"
          aria-labelledby="dash-modal-title"
          :data-cy="openItem ? `dashboard-section-${openItem.key}` : null"
        >
          <header class="dash-modal__head">
            <span class="dash-modal__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="openItem?.icon" /></svg></span>
            <div class="dash-modal__titles">
              <h2 id="dash-modal-title" class="dash-modal__title">{{ openItem?.title }}</h2>
              <p v-if="detailLine" class="dash-modal__sub mb-0">{{ detailLine }}</p>
            </div>
            <button ref="closeBtn" type="button" class="dash-modal__close" aria-label="Close" data-cy="dashboard-modal-close" @click="closeDetail">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div class="dash-modal__body">
            <div v-if="seen.grants" v-show="openKey === 'grants'">
              <GrantsTable v-if="A && B" :outcome-a="A" :outcome-b="B" />
              <p class="small text-secondary mt-3 mb-0">
                <RouterLink to="/sources" data-cy="dashboard-sources-link">See the official sources for each rule</RouterLink>
              </p>
            </div>
            <div v-if="seen.costs && A && B" v-show="openKey === 'costs'">
              <CostBreakdownTable :outcome-a="A" :outcome-b="B" />
            </div>
            <div v-if="seen.rpi" v-show="openKey === 'rpi'">
              <HistoricalRpiChart />
            </div>
            <div v-if="seen.map" v-show="openKey === 'map'">
              <PhgMapCard
                :bto-town="store.choiceA.town"
                :resale-town="store.choiceB.town"
                :living-arrangement="store.choiceB.livingArrangement"
              />
            </div>
            <div v-if="seen.size" v-show="openKey === 'size'">
              <SizePriceTable :choice-a="store.choiceA" :choice-b="store.choiceB" :result="result" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* The two path colours come from the path tokens (_tokens.scss): BTO indigo, resale berry/pink, as on Results. */
.dash-e {
  --dash-bto: var(--path-bto); --dash-bto-tint: var(--path-bto-fill); --dash-bto-pale: var(--path-bto-tint);
  --dash-resale: var(--path-resale); --dash-resale-tint: var(--path-resale-fill); --dash-resale-pale: var(--path-resale-tint);
  display: flex; flex-direction: column; gap: clamp(40px, 5vw, 64px);
}
/* The savings strip sits close under the verdict bar. */
.dash-e > :deep(.dash-cash) { margin-top: calc(clamp(40px, 5vw, 64px) * -0.6); }

/* The verdict bar's buttons: the primary one with the pink disc (as on Home), and an outlined one. */
.dash-btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); font-weight: 500; white-space: nowrap; }
.dash-btn.btn-disc { padding-right: var(--space-5); }
.dash-status { font-size: 0.8125rem; color: var(--text-secondary); }

/* Main area: content left, What-if right (sticky on large screens, below the sticky navbar). */
.dash-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); align-items: start; }
@media (min-width: 992px) {
  .dash-main { grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); }
  .dash-main__side { align-self: stretch; }
  /* Sticks below the navbar, and scrolls inside itself if it is taller than the screen, so Reset is always reachable. */
  .dash-sticky {
    position: sticky;
    top: calc(var(--nav-height, 0px) + var(--space-4));
    max-height: calc(100vh - var(--nav-height, 0px) - var(--space-6));
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--radius-lg);
  }
  .dash-sticky :deep(.dash-whatif) { position: static; }
}
.dash-main__content { display: flex; flex-direction: column; gap: clamp(32px, 4vw, 48px); min-width: 0; }

/* Cards: white, thin border. No hover effect: the panels aren't clickable, so only real buttons move. */
.dash-main :deep(.dash-panel) {
  display: flex; flex-direction: column; gap: var(--space-4);
  padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-lg);
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
}

/* What-if: a white card with a pink "live" box at the top. */
.dash-sticky :deep(.dash-whatif) { border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); box-shadow: 0 10px 30px rgba(60, 64, 90, 0.06); }
.dash-since { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--accent-tint); }
.dash-since--bto { background: var(--dash-bto-pale); }
.dash-since--resale { background: var(--dash-resale-pale); }
.dash-since__status { color: var(--dash-resale); }
.dash-since--bto .dash-since__status { color: var(--dash-bto); }
.dash-since__figures { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.dash-since__figures s { font-size: 1.0625rem; font-weight: 500; color: var(--text-secondary); margin-right: var(--space-2); }

/* Explore the detail */
.dash-explore { display: flex; flex-direction: column; gap: var(--space-4); }

/* The detail pop-up: a dark backdrop over the page, a white box in the middle that scrolls inside if it's long.
   On phones it slides up from the bottom. */
.dash-modal {
  position: fixed; inset: 0; z-index: 1050;
  display: grid; place-items: center;
  padding: var(--space-4);
  background: rgba(29, 29, 36, 0.45);
  animation: dash-fade 0.2s ease both;
}
.dash-modal__box {
  display: flex; flex-direction: column;
  width: min(880px, 100%); max-height: min(86vh, 900px);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: 0 30px 80px rgba(29, 29, 36, 0.3);
  animation: dash-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.dash-modal__head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-5) var(--space-5) var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.dash-modal__icon { flex: none; width: 44px; height: 44px; border-radius: 14px; background: var(--accent-tint); display: grid; place-items: center; }
.dash-modal__icon svg { width: 22px; height: 22px; fill: none; stroke: var(--color-berry); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.dash-modal__titles { flex: 1; min-width: 0; }
.dash-modal__title { margin: 0; font-family: var(--font-heading); font-size: 1.375rem; font-weight: 600; }
.dash-modal__sub { color: var(--text-secondary); font-size: 0.9375rem; }
.dash-modal__close { flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--bg-page); display: grid; place-items: center; transition: background 0.2s ease; }
.dash-modal__close:hover { background: var(--accent-fill-2); }
.dash-modal__close:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.dash-modal__close svg { width: 18px; height: 18px; fill: none; stroke: var(--text-primary); stroke-width: 2.2; stroke-linecap: round; }
.dash-modal__body { overflow-y: auto; padding: var(--space-5); }
@keyframes dash-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes dash-pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
@media (max-width: 575.98px) {
  .dash-modal { padding: var(--space-2); align-items: end; }
  .dash-modal__box { max-height: 92vh; }
}
/* Tables inside the pop-ups (grants, costs, sizes): white rows with thin lines and a pale pink header, instead of
   the grey fill they have elsewhere. Rows turn pale pink on hover. */
.dash-modal__body :deep(table) { --bs-table-bg: transparent; --bs-table-striped-bg: transparent; --bs-table-hover-bg: var(--accent-tint); background: transparent; }
.dash-modal__body :deep(thead th), .dash-modal__body :deep(thead td) { background: var(--accent-tint) !important; color: var(--color-berry); border-bottom: 1px solid var(--accent-fill-2); }
.dash-modal__body :deep(tbody th), .dash-modal__body :deep(tbody td) { background: transparent !important; border-color: var(--border-subtle); }
.dash-modal__body :deep(tbody tr) { transition: background 0.15s ease; }
.dash-modal__body :deep(tbody tr:hover) { background: var(--accent-tint); }
.dash-modal__body :deep(.card) { background: var(--bg-surface); }

/* Quick scenario chips, like a property site's filter bar. */
.dash-chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-top: calc(clamp(40px, 5vw, 64px) * -0.6); }
.dash-chips__label { margin-right: var(--space-1); font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
.dash-chip-btn { padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-surface); font-size: 0.9375rem; font-weight: 500; transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, translate 0.2s ease; }
.dash-chip-btn:hover { border-color: var(--accent-fill-1); background: var(--accent-tint); translate: 0 -1px; }
.dash-chip-btn.is-on { background: var(--text-primary); border-color: var(--text-primary); color: var(--on-primary); }
.dash-chip-btn--reset { border-style: dashed; }
.dash-chip-btn--more { margin-left: auto; }
.dash-chip-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .dash-modal, .dash-modal__box { animation: none; } .dash-chip-btn { transition: none; } }

/* Before you decide */
/* Pale pink and pale indigo instead of grey. Compact, and the same height side by side (height: 100% in a .row).
   No hover lift: they aren't clickable, so only real buttons move. */
.dash-note { height: 100%; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--accent-tint); border: 1px solid var(--accent-fill-2); font-size: 0.875rem; line-height: 1.5; }
.col-12:last-child > .dash-note { background: var(--indigo-tint); border-color: var(--indigo-tint-strong); }
</style>

<style>
/* While a detail pop-up is open, the page behind it doesn't scroll. (Every page is white now: _tokens.scss.) */
body.dash-modal-open { overflow: hidden; }
</style>
