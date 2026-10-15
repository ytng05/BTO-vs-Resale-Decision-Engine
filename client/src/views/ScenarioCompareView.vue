<script setup>
// /scenarios/compare?a=<id>&b=<id>
// Read-only summary of two saved scenarios side by side. Full detail for a
// path stays on /results, one click away via "Open full results".
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScenarioCompareCard from '../components/ScenarioCompareCard.vue'
import { loadComparePair, openScenarioInResults } from '../api/scenarioCompare'
import { compareHeadline, horizonsDiffer } from '../utils/scenarioCompare'

const route = useRoute()
const router = useRouter()

const status = ref('idle') // idle | loading | ready | error | notFound | invalid | loggedOut
const errorMessage = ref('')
const scenarios = ref([])
const openingId = ref(null)

const idA = computed(() => route.query.a)
const idB = computed(() => route.query.b)

const headline = computed(() =>
  scenarios.value.length === 2 ? compareHeadline(scenarios.value[0], scenarios.value[1]) : null,
)
const showHorizonNote = computed(
  () => scenarios.value.length === 2 && horizonsDiffer(scenarios.value[0], scenarios.value[1]),
)

async function load() {
  if (!idA.value || !idB.value || idA.value === idB.value) {
    status.value = 'invalid'
    return
  }
  status.value = 'loading'
  errorMessage.value = ''
  try {
    scenarios.value = await loadComparePair(idA.value, idB.value)
    status.value = 'ready'
  } catch (err) {
    scenarios.value = []
    if (err?.response?.status === 401) {
      status.value = 'loggedOut'
    } else if (err?.code === 'NOT_FOUND' || err?.response?.status === 404) {
      status.value = 'notFound'
    } else {
      status.value = 'error'
      errorMessage.value = err?.message || 'Something went wrong while loading the scenarios.'
    }
  }
}

async function openResults(scenario) {
  openingId.value = scenario.id
  try {
    await openScenarioInResults(scenario)
    await router.push('/results')
  } catch (err) {
    errorMessage.value = err?.message || 'Could not open that scenario.'
    status.value = 'error'
  } finally {
    openingId.value = null
  }
}

watch([idA, idB], load, { immediate: true })
</script>

<template>
  <main class="container py-4" data-cy="compare-page">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Compare scenarios</h1>
      <RouterLink to="/scenarios" class="btn btn-link px-0" data-cy="compare-back">
        ← Back to My scenarios
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="status === 'loading'" class="row g-3" aria-busy="true" data-cy="compare-loading">
      <div v-for="n in 2" :key="n" class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-body placeholder-glow">
            <span class="placeholder col-4 mb-2"></span>
            <span class="placeholder col-8 mb-3"></span>
            <span class="placeholder col-12 mb-2"></span>
            <span class="placeholder col-12"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- No or bad ids in the URL -->
    <div v-else-if="status === 'invalid'" class="alert alert-info" data-cy="compare-invalid">
      Pick two different saved scenarios to compare.
      <RouterLink to="/scenarios" class="alert-link">Go to My scenarios</RouterLink>
    </div>

    <!-- Logged out: same approach as My scenarios (prompt in the view, no router guard) -->
    <div v-else-if="status === 'loggedOut'" class="alert alert-info" data-cy="compare-logged-out">
      Log in to compare your saved scenarios.
      <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }" class="alert-link">Log in</RouterLink>
    </div>

    <!-- A scenario was deleted or isn't the user's -->
    <div v-else-if="status === 'notFound'" class="alert alert-warning" data-cy="compare-not-found">
      One of these scenarios no longer exists. It may have been deleted.
      <RouterLink to="/scenarios" class="alert-link">Choose another pair</RouterLink>
    </div>

    <!-- Any other failure -->
    <div v-else-if="status === 'error'" class="alert alert-danger" data-cy="compare-error">
      <p class="mb-2">{{ errorMessage }}</p>
      <button type="button" class="btn btn-sm btn-outline-danger" data-cy="compare-retry" @click="load">
        Try again
      </button>
    </div>

    <!-- Loaded -->
    <template v-else-if="status === 'ready'">
      <section class="compare-headline mb-3" data-cy="compare-headline">
        <p class="h5 mb-1">{{ headline.text }}</p>
        <p class="small text-muted mb-0">Compared on each scenario's own best path.</p>
      </section>

      <p v-if="showHorizonNote" class="small alert alert-light border py-2" data-cy="compare-horizon-note">
        These scenarios use different horizon years
        ({{ scenarios[0].horizonYear }} and {{ scenarios[1].horizonYear }}), so this is not a
        same-year comparison.
      </p>

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
  </main>
</template>

<style scoped lang="scss">

.compare-headline {
  padding: 1rem 1.25rem;
  border-left: 4px solid var(--bs-primary);
  background: var(--bs-primary-bg-subtle);
  border-radius: 0.375rem;
}
</style>