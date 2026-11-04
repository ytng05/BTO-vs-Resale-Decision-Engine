<script setup>
// My scenarios: the logged-in user's saved scenarios, newest first (GET /api/scenarios). Open refills the
// plan from the saved inputs (GET /api/scenarios/:id) and recalculates on Results; Delete asks first
// (DELETE /api/scenarios/:id). docs/API_CONTRACT.md "Saved scenarios".
// Compare mode (styles in styles/_components.scss): tick two scenarios, then Compare opens /scenarios/compare?a=&b= (side-by-side view).
// Filter bar: search, town, flat type, path ahead and price range, on the list's summaries (utils/scenarioFilter.js).
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteScenario, getScenario, listScenarios } from '../api/client.js';
import CompareBar from '../components/CompareBar.vue';
import { useComparePicker } from '../composables/useComparePicker.js';
import { useAuthStore } from '../stores/auth.js';
import { useScenarioStore } from '../stores/scenario.js';
import { formatDate } from '../utils/format.js';
import {
  emptyFilters, flatTypeOptions, hasFilters, keepValidFilters, matchesFilters, priceRangeProblem, summaryLine, townOptions,
} from '../utils/scenarioFilter.js';

const auth = useAuthStore();
const store = useScenarioStore();
const router = useRouter();

const scenarios = ref([]);
const loading = ref(false);
const error = ref(null);
const confirmingId = ref(null); // the row asking "Delete this scenario?"
const busyId = ref(null); // the row being opened or deleted

// Compare mode: Open and Delete are hidden so a tap cannot delete by accident.
const compareMode = ref(false);
const picker = useComparePicker();

// The filter bar. Everything is worked out on the page from the list, with no extra requests.
const filters = ref(emptyFilters());

// Compare mode keeps ticked scenarios in the list even when the filters would hide them, so Compare never opens
// a scenario the user cannot see (and they can untick it).
const shownScenarios = computed(function () {
  const shown = [];
  for (const s of scenarios.value) {
    if (matchesFilters(s, filters.value) || (compareMode.value && picker.isSelected(s.id))) {
      shown.push(s);
    }
  }
  return shown;
});
const townChoices = computed(function () {
  return townOptions(scenarios.value);
});
const flatTypeChoices = computed(function () {
  return flatTypeOptions(scenarios.value);
});
const filtersSet = computed(function () {
  return hasFilters(filters.value);
});
const priceProblem = computed(function () {
  return priceRangeProblem(filters.value);
});

// Every change to the list goes through here, so a town or flat type that is no longer in the dropdown is reset.
function setScenarios(list) {
  scenarios.value = list;
  filters.value = keepValidFilters(filters.value, list);
}

// How many scenarios match the filters (not counting ticked ones kept visible in compare mode).
const matchCount = computed(function () {
  let count = 0;
  for (const s of scenarios.value) {
    if (matchesFilters(s, filters.value)) {
      count = count + 1;
    }
  }
  return count;
});

// "3 scenarios", or "1 of 3 scenarios" while filtering.
const countText = computed(function () {
  const total = scenarios.value.length;
  let word = 'scenarios';
  if (total === 1) {
    word = 'scenario';
  }
  if (filtersSet.value) {
    return matchCount.value + ' of ' + total + ' ' + word;
  }
  return total + ' ' + word;
});

function clearFilters() {
  filters.value = emptyFilters();
}

function startCompare() {
  confirmingId.value = null;
  compareMode.value = true;
}

function exitCompare() {
  compareMode.value = false;
  picker.clear();
}

function goCompare() {
  if (picker.compareRoute.value) router.push(picker.compareRoute.value);
}

// Login expired (tokens last 7 days): sign out here too and come back after logging in.
function handledAuthError(e) {
  if (e?.response?.status !== 401) return false;
  auth.logout();
  router.push({ name: 'login', query: { redirect: '/scenarios' } });
  return true;
}

const messageOf = (e, fallback) => e?.response?.data?.error?.message || fallback;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    setScenarios((await listScenarios()).scenarios);
  } catch (e) {
    if (!handledAuthError(e)) {
      error.value = messageOf(e, 'Your scenarios could not be loaded. Check your connection and try again.');
    }
  } finally {
    loading.value = false;
  }
}

// The plan in memory was saved as this scenario, which no longer exists: Results offers "Save scenario" again.
function forgetIfCurrent(id) {
  if (store.savedId === id) {
    store.forgetSavedScenario();
  }
}

async function open(id) {
  busyId.value = id;
  error.value = null;
  try {
    const { scenario } = await getScenario(id);
    store.loadSaved(scenario);
    router.push('/results');
  } catch (e) {
    if (handledAuthError(e)) return;
    if (e?.response?.status === 404) {
      // Deleted elsewhere (another tab or device) since the list loaded.
      setScenarios(scenarios.value.filter((s) => s.id !== id));
      forgetIfCurrent(id);
      error.value = 'That scenario no longer exists. It may have been deleted in another tab.';
    } else {
      error.value = messageOf(e, 'The scenario could not be opened. Check your connection and try again.');
    }
  } finally {
    busyId.value = null;
  }
}

async function remove(id) {
  busyId.value = id;
  error.value = null;
  try {
    await deleteScenario(id);
    setScenarios(scenarios.value.filter((s) => s.id !== id));
    forgetIfCurrent(id);
    confirmingId.value = null;
  } catch (e) {
    if (handledAuthError(e)) return;
    if (e?.response?.status === 404) {
      // Already gone: the outcome the user wanted.
      // Already gone: the outcome the user wanted.
      setScenarios(scenarios.value.filter((s) => s.id !== id));
      forgetIfCurrent(id);
      confirmingId.value = null;
    } else {
      error.value = messageOf(e, 'The scenario could not be deleted. Check your connection and try again.');
    }
  } finally {
    busyId.value = null;
  }
}

onMounted(() => {
  if (auth.isLoggedIn) load();
});
</script>

<template>
  <section data-cy="scenarios-view">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h4 mb-0">My scenarios</h1>
      <!-- Compare needs at least two saved scenarios -->
      <button
        v-if="auth.isLoggedIn && !loading && scenarios.length >= 2 && !compareMode"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        data-cy="scenarios-compare-mode-button"
        @click="startCompare"
      >
        Compare two
      </button>
    </div>

    <!-- Logged out -->
    <div v-if="!auth.isLoggedIn" class="card" data-cy="scenarios-logged-out">
      <div class="card-body">
        <p class="text-secondary">Log in to see the scenarios you have saved.</p>
        <RouterLink
          :to="{ name: 'login', query: { redirect: '/scenarios' } }"
          class="btn btn-primary"
          data-cy="scenarios-login-link"
        >
          Log in
        </RouterLink>
      </div>
    </div>

    <!-- Loading: skeleton rows shaped like the list (UI.md §8) -->
    <div v-else-if="loading" data-cy="scenarios-loading" aria-busy="true">
      <span class="visually-hidden" role="status">Loading your scenarios...</span>
      <div v-for="n in 3" :key="n" class="skeleton scenarios-skeleton mb-2" aria-hidden="true"></div>
    </div>

    <template v-else>
      <div v-if="error" class="alert alert-danger" role="alert" data-cy="scenarios-error">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="scenarios-retry-button" @click="load">
          Try again
        </button>
      </div>

      <!-- Empty -->
      <div v-if="!error && scenarios.length === 0" class="card" data-cy="scenarios-empty">
        <div class="card-body">
          <p class="text-secondary">
            No saved scenarios yet. Compare BTO and resale, then save the comparison from the results page.
          </p>
          <RouterLink to="/plan" class="btn btn-primary" data-cy="scenarios-start-plan-button">Start planning</RouterLink>
        </div>
      </div>

      <!-- Filter bar: only shown with two or more scenarios -->
      <form
        v-if="!error && scenarios.length >= 2"
        class="card card-body mb-3"
        role="search"
        aria-label="Filter your scenarios"
        data-cy="scenarios-filters"
        @submit.prevent
      >
        <div class="row g-2">
          <div class="col-12 col-md-6">
            <label for="filter-search" class="form-label">Search by name</label>
            <input
              id="filter-search"
              v-model="filters.search"
              type="search"
              class="form-control"
              autocomplete="off"
              data-cy="scenarios-filter-search"
            />
          </div>
          <div class="col-6 col-md-3">
            <label for="filter-town" class="form-label">Town</label>
            <select id="filter-town" v-model="filters.town" class="form-select" data-cy="scenarios-filter-town">
              <option value="">Any town</option>
              <option v-for="t in townChoices" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label for="filter-flat-type" class="form-label">Flat type</label>
            <select id="filter-flat-type" v-model="filters.flatType" class="form-select" data-cy="scenarios-filter-flat-type">
              <option value="">Any flat type</option>
              <option v-for="f in flatTypeChoices" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <div class="col-12 col-md-4">
            <label for="filter-ahead" class="form-label">Which path is ahead</label>
            <select id="filter-ahead" v-model="filters.ahead" class="form-select" data-cy="scenarios-filter-ahead">
              <option value="">Either</option>
              <option value="A">BTO ahead</option>
              <option value="B">Resale ahead</option>
              <option value="TIE">Level</option>
              <option value="NONE">Not calculated</option>
            </select>
          </div>
          <div class="col-6 col-md-4">
            <label for="filter-min-price" class="form-label">Price from (S$)</label>
            <input
              id="filter-min-price"
              v-model="filters.minPrice"
              type="number"
              min="0"
              step="10000"
              inputmode="numeric"
              class="form-control"
              data-cy="scenarios-filter-min-price"
            />
          </div>
          <div class="col-6 col-md-4">
            <label for="filter-max-price" class="form-label">Price up to (S$)</label>
            <input
              id="filter-max-price"
              v-model="filters.maxPrice"
              type="number"
              min="0"
              step="10000"
              inputmode="numeric"
              class="form-control"
              data-cy="scenarios-filter-max-price"
            />
          </div>
        </div>
        <p v-if="priceProblem" class="form-text text-danger mb-1" role="status" data-cy="scenarios-filter-price-hint">
          {{ priceProblem }}
        </p>
        <p class="form-text mb-0">
          The price range keeps a scenario when its BTO or its resale price is inside it. Prices are today's prices;
          scenarios saved before today's prices were kept use the price at the application year instead.
        </p>

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
          <p class="mb-0 text-secondary" role="status" data-cy="scenarios-filter-count">{{ countText }}</p>
          <button
            v-if="filtersSet"
            type="button"
            class="btn btn-link btn-sm p-0"
            data-cy="scenarios-filter-clear"
            @click="clearFilters"
          >
            Clear filters
          </button>
        </div>
      </form>

      <!-- No matches: the filters hide every scenario -->
      <div v-if="!error && scenarios.length > 0 && shownScenarios.length === 0" class="card" data-cy="scenarios-no-matches">
        <div class="card-body">
          <p class="text-secondary">No scenarios match these filters.</p>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="scenarios-no-matches-clear" @click="clearFilters">
            Clear filters
          </button>
        </div>
      </div>

      <p v-if="compareMode" class="text-secondary mb-2" data-cy="scenarios-compare-hint">
        Tick two scenarios to see them side by side.
      </p>

      <ul v-if="shownScenarios.length" class="list-unstyled d-grid gap-2 mb-0" data-cy="scenarios-list">
        <li
          v-for="s in shownScenarios"
          :key="s.id"
          class="card card-body d-flex flex-row flex-wrap align-items-center gap-2"
          :class="{ 'scenarios-row--picked': compareMode && picker.isSelected(s.id) }"
          :data-cy="`scenarios-row-${s.id}`"
        >
          <!-- Compare mode: the whole name area is the label, so the tap target is large on a phone -->
          <input
            v-if="compareMode"
            :id="`compare-${s.id}`"
            type="checkbox"
            class="form-check-input mt-0 flex-shrink-0"
            :checked="picker.isSelected(s.id)"
            :disabled="picker.isDisabled(s.id)"
            :aria-label="`Select ${s.name} to compare`"
            data-cy="scenarios-compare-checkbox"
            @change="picker.toggle(s.id)"
          />

          <component
            :is="compareMode ? 'label' : 'div'"
            :for="compareMode ? `compare-${s.id}` : undefined"
            class="flex-grow-1 me-2"
            :class="{ 'scenarios-pick-label': compareMode }"
          >
            <div class="fw-semibold" data-cy="scenarios-row-name">{{ s.name }}</div>
            <div class="text-body-small text-secondary" data-cy="scenarios-row-summary">{{ summaryLine(s) }}</div>
            <div class="text-caption">
              Saved {{ formatDate(s.createdAt) }} · Ruleset {{ s.rulesetVersion }}
            </div>
          </component>

          <template v-if="!compareMode">
            <!-- One group, so the buttons wrap together under the name on a phone, never one beside it and one below. -->
            <div v-if="confirmingId === s.id" class="d-flex flex-wrap align-items-center gap-2">
              <span class="me-1">Delete this scenario?</span>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                :disabled="busyId === s.id"
                data-cy="scenarios-delete-confirm"
                @click="remove(s.id)"
              >
                Delete
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                data-cy="scenarios-delete-cancel"
                @click="confirmingId = null"
              >
                Keep
              </button>
            </div>
            <div v-else class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="busyId === s.id"
                data-cy="scenarios-open-button"
                @click="open(s.id)"
              >
                Open
              </button>
              <button
                type="button"
                class="btn btn-link btn-sm text-danger"
                :disabled="busyId === s.id"
                data-cy="scenarios-delete-button"
                @click="confirmingId = s.id"
              >
                Delete
              </button>
            </div>
          </template>
        </li>
      </ul>

      <CompareBar
        v-if="compareMode"
        class="mt-3"
        :count="picker.selected.value.length"
        :can-compare="picker.canCompare.value"
        @compare="goCompare"
        @cancel="exitCompare"
      />
    </template>
  </section>
</template>