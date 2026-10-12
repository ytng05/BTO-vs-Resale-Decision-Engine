<script setup>
// My scenarios: the logged-in user's saved scenarios, newest first (GET /api/scenarios). Open refills the
// plan from the saved inputs (GET /api/scenarios/:id) and recalculates on Results; Delete asks first
// (DELETE /api/scenarios/:id). docs/API_CONTRACT.md "Saved scenarios".
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteScenario, getScenario, listScenarios } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useScenarioStore } from '../stores/scenario.js';
import { formatDate } from '../utils/format.js';

const auth = useAuthStore();
const store = useScenarioStore();
const router = useRouter();

const scenarios = ref([]);
const loading = ref(false);
const error = ref(null);
const confirmingId = ref(null); // the row asking "Delete this scenario?"
const busyId = ref(null); // the row being opened or deleted

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
    scenarios.value = (await listScenarios()).scenarios;
  } catch (e) {
    if (!handledAuthError(e)) {
      error.value = messageOf(e, 'Your scenarios could not be loaded. Check your connection and try again.');
    }
  } finally {
    loading.value = false;
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
      scenarios.value = scenarios.value.filter((s) => s.id !== id);
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
    scenarios.value = scenarios.value.filter((s) => s.id !== id);
    confirmingId.value = null;
  } catch (e) {
    if (handledAuthError(e)) return;
    if (e?.response?.status === 404) {
      // Already gone: the outcome the user wanted.
      scenarios.value = scenarios.value.filter((s) => s.id !== id);
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
    <h1 class="h4 mb-3">My scenarios</h1>

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

      <ul v-if="scenarios.length" class="list-unstyled d-grid gap-2 mb-0" data-cy="scenarios-list">
        <li
          v-for="s in scenarios"
          :key="s.id"
          class="card card-body d-flex flex-row flex-wrap align-items-center gap-2"
          :data-cy="`scenarios-row-${s.id}`"
        >
          <div class="flex-grow-1 me-2">
            <div class="fw-semibold" data-cy="scenarios-row-name">{{ s.name }}</div>
            <div class="text-caption">
              Saved {{ formatDate(s.createdAt) }} · Ruleset {{ s.rulesetVersion }}
            </div>
          </div>

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
        </li>
      </ul>
    </template>
  </section>
</template>
