<script setup>
import { onMounted, ref } from 'vue';
import { compare } from '../api/client.js';
import { useScenarioStore } from '../stores/scenario.js';
import HeatmapGrid from '../components/HeatmapGrid.vue';

const store = useScenarioStore();
const result = ref(null);
const error = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    result.value = await compare({
      profile: store.profile,
      choiceA: store.choiceA,
      choiceB: store.choiceB,
      assumptions: store.assumptions,
    });
  } catch (e) {
    // Say what went wrong and how to fix it (rulebook: errors never apologise or stay vague).
    error.value = e?.response?.data?.error?.message || 'The results could not be loaded. Check your connection and try again.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <p v-if="loading" data-cy="results-loading">Loading results...</p>
    <div v-else-if="error" class="alert alert-warning" data-cy="results-error">{{ error }}</div>
    <template v-else>
      <!-- Lead with the single break-even sentence before any chart. -->
      <h1 class="h4" data-cy="results-breakeven-sentence">{{ result.breakEvenSentence }}</h1>
      <p v-if="result.mock" class="text-secondary" data-cy="results-mock-notice">Showing mock data.</p>
      <HeatmapGrid :grid="result.grid" />
      <!-- TODO (seat 5): timing optimiser panel, strategy top 3, cash flow chart, show-workings panel. -->
    </template>
  </section>
</template>
