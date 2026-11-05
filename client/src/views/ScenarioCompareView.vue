<script setup>
// /scenarios/compare?a=<id>&b=<id>
// Read-only summary of two saved scenarios side by side. Full detail for a path stays on /results,
// one click away via "Open full results". Styles: .compare-* in styles/_components.scss.
// Scenarios are only ranked against each other at a common horizon year under one ruleset (D1);
// otherwise the headline says they can't be compared directly and no winner is highlighted.
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ScenarioCompareCard from '../components/ScenarioCompareCard.vue';
import { loadComparePair, openScenarioInResults } from '../api/scenarioCompare.js';
import { compareHeadline, horizonsDiffer, rulesetsDiffer } from '../utils/scenarioCompare.js';
import { useAuthStore } from '../stores/auth.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const status = ref('idle'); // idle | loading | ready | error | notFound | invalid | loggedOut
const errorMessage = ref('');
const scenarios = ref([]);
const openingId = ref(null);

const idA = computed(() => route.query.a);
const idB = computed(() => route.query.b);

const bothLoaded = computed(() => scenarios.value.length === 2);
const headline = computed(() =>
  bothLoaded.value ? compareHeadline(scenarios.value[0], scenarios.value[1]) : null,
);
const showHorizonNote = computed(
  () => bothLoaded.value && horizonsDiffer(scenarios.value[0], scenarios.value[1]),
);
const showRulesetNote = computed(
  () => bothLoaded.value && rulesetsDiffer(scenarios.value[0], scenarios.value[1]),
);
// Only explain the basis of the comparison when one was actually made (a winner or a tie).
const compared = computed(() => headline.value?.winner != null);

async function load() {
  // Logged out: the same prompt as My scenarios, without asking the API first (it would only answer 401).
  if (!auth.isLoggedIn) {
    scenarios.value = [];
    status.value = 'loggedOut';
    return;
  }
  if (!idA.value || !idB.value || idA.value === idB.value) {
    status.value = 'invalid';
    return;
  }
  status.value = 'loading';
  errorMessage.value = '';
  try {
    scenarios.value = await loadComparePair(idA.value, idB.value);
    status.value = 'ready';
  } catch (err) {
    scenarios.value = [];
    if (err?.response?.status === 401) {
      // Login expired (tokens last 7 days): sign out here too, so the navbar agrees, and offer to log in again.
      auth.logout();
      status.value = 'loggedOut';
    } else if (err?.code === 'NOT_FOUND' || err?.response?.status === 404) {
      status.value = 'notFound';
    } else {
      status.value = 'error';
      errorMessage.value =
        err?.response?.data?.error?.message ||
        'The scenarios could not be loaded. Check your connection and try again.';
    }
  }
}

async function openResults(scenario) {
  openingId.value = scenario.id;
  try {
    await openScenarioInResults(scenario);
    await router.push('/results');
  } catch (err) {
    errorMessage.value = 'The scenario could not be opened. Check your connection and try again.';
    status.value = 'error';
  } finally {
    openingId.value = null;
  }
}

// Logging out in the navbar while on this page shows the prompt too.
watch([idA, idB, () => auth.isLoggedIn], load, { immediate: true });
</script>

<template>
  <section data-cy="compare-view">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h4 mb-0">Compare scenarios</h1>
      <RouterLink to="/scenarios" class="btn btn-link px-0" data-cy="compare-back-link">
        ← My scenarios
      </RouterLink>
    </div>

    <!-- Loading: skeletons shaped like the two cards (UI.md §8) -->
    <div v-if="status === 'loading'" class="row g-3" aria-busy="true" data-cy="compare-loading">
      <span class="visually-hidden" role="status">Loading the two scenarios...</span>
      <div v-for="n in 2" :key="n" class="col-12 col-md-6">
        <div class="skeleton compare-skeleton" aria-hidden="true"></div>
      </div>
    </div>

    <!-- Logged out: same approach as My scenarios (prompt in the view, no router guard) -->
    <div v-else-if="status === 'loggedOut'" class="card" data-cy="compare-logged-out">
      <div class="card-body">
        <p class="text-secondary">Log in to compare your saved scenarios.</p>
        <RouterLink
          :to="{ name: 'login', query: { redirect: route.fullPath } }"
          class="btn btn-primary"
          data-cy="compare-login-link"
        >
          Log in
        </RouterLink>
      </div>
    </div>

    <!-- No or bad ids in the link -->
    <div v-else-if="status === 'invalid'" class="card" data-cy="compare-invalid">
      <div class="card-body">
        <p class="text-secondary">Pick two different saved scenarios to compare them side by side.</p>
        <RouterLink to="/scenarios" class="btn btn-primary" data-cy="compare-pick-link">Go to My scenarios</RouterLink>
      </div>
    </div>

    <!-- A scenario was deleted, or is not this user's -->
    <div v-else-if="status === 'notFound'" class="alert alert-warning" role="alert" data-cy="compare-not-found">
      <p class="mb-2">One of these scenarios no longer exists. It may have been deleted in another tab.</p>
      <RouterLink to="/scenarios" class="btn btn-outline-secondary btn-sm" data-cy="compare-repick-link">
        Choose another pair
      </RouterLink>
    </div>

    <!-- Any other failure -->
    <div v-else-if="status === 'error'" class="alert alert-danger" role="alert" data-cy="compare-error">
      <p class="mb-2">{{ errorMessage }}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="compare-retry-button" @click="load">
        Try again
      </button>
    </div>

    <!-- Loaded -->
    <template v-else-if="status === 'ready'">
      <!-- Lead statement: .hero-statement, no card chrome (UI.md §8 cards) -->
      <div class="mb-4">
        <p class="hero-statement mb-1" data-cy="compare-headline-sentence">{{ headline.text }}</p>
        <p v-if="compared" class="text-secondary text-measure mb-0">Compared on each scenario's own best path.</p>
        <p v-if="showHorizonNote" class="text-secondary text-measure mt-2 mb-0" data-cy="compare-horizon-note">
          Scenario A is measured at {{ scenarios[0].horizonYear }} and Scenario B at
          {{ scenarios[1].horizonYear }}. Save both with the same horizon year to see which comes out ahead.
        </p>
        <p v-if="showRulesetNote" class="text-secondary text-measure mt-2 mb-0" data-cy="compare-ruleset-note">
          Scenario A was calculated under ruleset {{ scenarios[0].rulesetVersion }} and Scenario B under
          {{ scenarios[1].rulesetVersion }}. Reopen and re-save the older one to compare under the same rules.
        </p>
      </div>

      <div class="row g-3">
        <div v-for="(s, i) in scenarios" :key="s.id" class="col-12 col-md-6">
          <ScenarioCompareCard
            :scenario="s"
            :letter="i === 0 ? 'A' : 'B'"
            :is-winner="headline.winner === (i === 0 ? 'A' : 'B')"
            :opening="openingId === s.id"
            @open="openResults"
          />
        </div>
      </div>
    </template>
  </section>
</template>