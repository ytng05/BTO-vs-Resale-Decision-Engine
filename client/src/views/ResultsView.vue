<script setup>
import { computed, onMounted, ref } from 'vue';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import HeatmapGrid from '../components/HeatmapGrid.vue';
import PathOutcomeCard from '../components/PathOutcomeCard.vue';
import { CLASSIFICATIONS, FLAT_TYPES, TOWNS } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';
import { validateStep } from '../validation/planValidation.js';

const store = useScenarioStore();
const result = ref(null);
const error = ref(null);
const loading = ref(false);

// Someone who opens /results directly (or reloads) has no real inputs yet: show an empty state instead
// of asking the server to compare nothing. "Has inputs" = all three plan steps pass the same validation
// the stepper enforces before it lets anyone reach /results. (Checking applicants.length is not enough:
// the store's blank state already seeds one empty buyer.)
const hasInputs = computed(() => [0, 1, 2].every((step) => Object.keys(validateStep(step, store)).length === 0));

const horizonYears = computed(() => result.value?.horizonYears ?? store.assumptions.horizonYears ?? null);

const userPoint = computed(() => ({
  priceGrowth: store.assumptions.priceGrowth,
  incomeGrowth: store.assumptions.incomeGrowth,
}));

// Positive when Path A ends ahead.
const gap = computed(() => {
  const a = result.value?.outcomeA?.netFinancialPosition;
  const b = result.value?.outcomeB?.netFinancialPosition;
  return typeof a === 'number' && typeof b === 'number' ? a - b : null;
});

const gapSentence = computed(() => {
  if (gap.value === null) return '';
  const years = horizonYears.value ? `After ${horizonYears.value} years, ` : '';
  if (gap.value === 0) return `${years}both paths end with the same net financial position under your assumptions.`;
  const ahead = gap.value > 0 ? 'BTO' : 'resale';
  return `${years}${ahead} ends ${formatMoney(Math.abs(gap.value))} ahead in net financial position under your assumptions.`;
});

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
function describe(choice) {
  const parts = [labelOf(TOWNS, choice.town), labelOf(FLAT_TYPES, choice.flatType)];
  if (choice.path === 'BTO' && choice.classification) parts.push(labelOf(CLASSIFICATIONS, choice.classification));
  if (choice.purchaseYear) parts.push(`from ${choice.purchaseYear}`);
  return parts.filter(Boolean).join(', ');
}

async function load() {
  if (!hasInputs.value) return;
  loading.value = true;
  error.value = null;
  try {
    result.value = await compare({
      profile: store.profile,
      choiceA: store.choiceA,
      choiceB: store.choiceB,
      // The engine works from an explicit "today" (engine/types.js); it is not a form field.
      assumptions: { ...store.assumptions, asOfDate: new Date().toISOString().slice(0, 10) },
    });
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
      <p class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span class="badge-version" data-cy="results-ruleset-version">Ruleset {{ result.rulesetVersion }}</span>
        <span class="text-caption">
          The break-even line is not a prediction of prices.
          <span v-if="result.mock" data-cy="results-mock-notice">Showing mock data.</span>
        </span>
      </p>
      <RouterLink to="/plan" class="btn btn-outline-secondary mb-4" data-cy="results-edit-button">Change inputs</RouterLink>

      <div v-if="result.outcomeA && result.outcomeB" class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path A: BTO"
            :subtitle="describe(store.choiceA)"
            :outcome="result.outcomeA"
            :horizon-years="horizonYears"
            cy-prefix="results-patha"
          />
        </div>
        <div class="col-12 col-lg-6">
          <PathOutcomeCard
            title="Path B: Resale"
            :subtitle="describe(store.choiceB)"
            :outcome="result.outcomeB"
            :horizon-years="horizonYears"
            cy-prefix="results-pathb"
          />
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h2 class="h5">Where each path ends ahead</h2>
          <p class="text-secondary">Select a square to see the difference. "You" marks your own assumptions.</p>
          <HeatmapGrid
            :grid="result.grid"
            :user-point="userPoint"
            :horizon-years="horizonYears"
            label-a="BTO"
            label-b="Resale"
          />
        </div>
      </div>
      <!-- TODO (seat 5): timing optimiser panel and strategy top 3 once /api/timing and /api/strategy exist. -->
    </template>
  </section>
</template>