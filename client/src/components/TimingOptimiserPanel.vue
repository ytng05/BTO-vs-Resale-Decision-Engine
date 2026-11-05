<script setup>
// Results page: "When to apply for the BTO". Sweeps the BTO application year (POST /api/timing,
// docs/API_CONTRACT.md) with everything else in the plan held fixed, and shows which year ends with the
// highest net financial position at the common horizon. Fetches on its own, like HistoricalRpiChart, so a
// slow or failing search never blocks the main comparison. The store's Path A is always BTO; if that ever
// changes the panel hides itself, because a resale purchase has no wait to optimise.
// data-cy names: docs/CONVENTIONS.md "Timing".
import { computed, onMounted, ref } from 'vue';
import { timing } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import { formatMoney } from '../utils/format.js';
import { skipReasonText, timingHeadline, timingRows } from '../utils/timingFormat.js';

// 'loaded' carries the result up, so Results can name the best year in the section's one-line takeaway.
const emit = defineEmits(['loaded']);
const store = useScenarioStore();
const result = ref(null);
const error = ref(null);
const loading = ref(false);

const isBto = computed(() => store.choiceA.path === 'BTO');
const rows = computed(() => timingRows(result.value));
const headline = computed(() => (result.value ? timingHeadline(result.value) : ''));
const skipped = computed(() => result.value?.skipped ?? []);
const explanation = computed(() => result.value?.explanation ?? []);

async function load() {
  if (!isBto.value) return;
  loading.value = true;
  error.value = null;
  try {
    result.value = await timing(store, 'choiceA');
    emit('loaded', result.value);
  } catch (e) {
    error.value =
      e?.response?.data?.error?.message || 'The timing search could not be loaded. Check your connection and try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div v-if="isBto" class="card mb-3" data-cy="results-timing-card">
    <div class="card-body">
      <h2 class="h5">When to apply for the BTO</h2>
      <p class="text-secondary">
        Your plan and assumptions stay the same; only the year you apply changes. Each year is measured at the
        same horizon, so the figures are comparable.
      </p>

      <div v-if="loading" data-cy="results-timing-loading" aria-busy="true">
        <span class="visually-hidden" role="status">Checking application years...</span>
        <div class="skeleton results-skeleton results-skeleton--line mb-2" aria-hidden="true"></div>
        <div class="skeleton results-skeleton results-skeleton--card" aria-hidden="true"></div>
      </div>

      <div v-else-if="error" class="alert alert-danger mb-0" role="alert" data-cy="results-timing-error">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="results-timing-retry-button" @click="load">
          Try again
        </button>
      </div>

      <template v-else-if="result">
        <p class="fw-semibold" data-cy="results-timing-headline">{{ headline }}</p>

        <ul v-if="rows.length" class="list-unstyled border-top mb-3" data-cy="results-timing-list">
          <li
            v-for="row in rows"
            :key="row.year"
            class="d-flex flex-wrap align-items-center gap-2 py-2 border-bottom"
            :data-cy="`results-timing-row-${row.year}`"
          >
            <div class="flex-grow-1">
              <div class="fw-semibold">Apply in {{ row.year }}</div>
              <div v-if="row.keysYear" class="text-caption">Keys around {{ row.keysYear }}</div>
            </div>
            <span
              v-if="row.isBest"
              class="badge-version"
              :data-cy="`results-timing-best-${row.year}`"
            >
              Highest
            </span>
            <div class="timing-price">
              <div>{{ formatMoney(row.netPositionCents / 100) }}</div>
              <div v-if="row.behindBestCents > 0" class="text-caption">
                {{ formatMoney(row.behindBestCents / 100) }} behind the highest
              </div>
            </div>
          </li>
        </ul>

        <div v-if="skipped.length" class="mb-3" data-cy="results-timing-skipped">
          <p class="mb-1 fw-semibold">Years not compared</p>
          <ul class="mb-0 ps-3">
            <li v-for="s in skipped" :key="s.year" :data-cy="`results-timing-skipped-${s.year}`">
              {{ s.year }}: {{ skipReasonText(s.reason) }}
            </li>
          </ul>
        </div>

        <ul v-if="explanation.length" class="text-secondary ps-3 mb-3" data-cy="results-timing-explanation">
          <li v-for="(line, i) in explanation" :key="i">{{ line }}</li>
        </ul>

        <p class="text-caption mb-0">
          Net position in the comparison year, under your assumptions. This is not a prediction of prices.
          <span v-if="result.mock" data-cy="results-timing-mock-notice">Showing mock data.</span>
        </p>
      </template>
    </div>
  </div>
</template>


<style scoped>
/* The figure for each year: on the right of the row on wider screens. On phones the row wraps, so the figure gets
   its own full line and starts at the left, so every year's figure lines up. */
.timing-price { text-align: right; }

@media (max-width: 575.98px) {
  .timing-price {
    flex-basis: 100%;
    text-align: left;
  }
}
</style>
