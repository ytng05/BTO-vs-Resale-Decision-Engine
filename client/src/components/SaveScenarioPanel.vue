<script setup>
// Results page: save the current inputs and this result as a named scenario (POST /api/scenarios,
// docs/API_CONTRACT.md "Saved scenarios"). Once saved, the same inputs cannot be saved again: the button becomes
// "Saved as …". If the inputs change after that (or after opening a saved scenario), it offers "Update" (PUT, same
// scenario) or "Save as new". Logged out, it links to /login and comes back here; the plan
// stays in the store meanwhile. The one filled button on the page (UI.md §8 Buttons).
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { saveScenario, updateScenario } from '../api/client.js';
import { toTitleCase } from '../constants/planOptions.js';
import { useAuthStore } from '../stores/auth.js';
import { useScenarioStore } from '../stores/scenario.js';

const props = defineProps({
  result: { type: Object, default: null },
});

const auth = useAuthStore();
const store = useScenarioStore();
const router = useRouter();

const NAME_MAX = 100; // the server's limit
const open = ref(false);
const name = ref('');
const attempted = ref(false);
const saving = ref(false);
const error = ref(null);
const nameInput = ref(null);

// Saved, and nothing changed since: nothing to save again.
const savedUnchanged = computed(function () {
  return store.savedId !== null && store.inputsKey === store.savedKey;
});
// Saved before, but the inputs have changed since: offer to update that scenario, or save a new one.
const savedChanged = computed(function () {
  return store.savedId !== null && store.inputsKey !== store.savedKey;
});

const nameError = computed(() => {
  const n = name.value.trim();
  if (!n) return 'Enter a name for this scenario.';
  if (n.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
  return null;
});
const shownError = computed(() => (attempted.value ? nameError.value : null));

// "Tampines BTO vs Bedok resale" as a starting name; the user can type over it.
function suggestedName() {
  const town = (t) => (t ? toTitleCase(t) : '');
  return `${town(store.choiceA.town)} BTO vs ${town(store.choiceB.town)} resale`.replace(/\s+/g, ' ').trim();
}

async function start() {
  open.value = true;
  attempted.value = false;
  error.value = null;
  name.value = suggestedName();
  await nextTick();
  nameInput.value?.select();
}

function cancel() {
  open.value = false;
  error.value = null;
}

function handleSaveError(e) {
  if (e && e.response && e.response.status === 401) {
    // Login expired (tokens last 7 days): sign out here too and come back after logging in.
    auth.logout();
    router.push({ name: 'login', query: { redirect: '/results' } });
    return;
  }
  error.value = 'The scenario could not be saved. Check your connection and try again.';
  if (e && e.response && e.response.data && e.response.data.error && e.response.data.error.message) {
    error.value = e.response.data.error.message;
  }
}

async function save() {
  attempted.value = true;
  if (nameError.value) return;
  saving.value = true;
  error.value = null;
  try {
    const trimmed = name.value.trim();
    const data = await saveScenario(store.savePayload(trimmed, props.result));
    store.markSaved(data.scenario.id, trimmed);
    open.value = false;
  } catch (e) {
    handleSaveError(e);
  } finally {
    saving.value = false;
  }
}

// Saves the changed inputs over the scenario they came from (same name, same id).
async function update() {
  saving.value = true;
  error.value = null;
  try {
    await updateScenario(store.savedId, store.savePayload(store.savedName, props.result));
    store.markSaved(store.savedId, store.savedName);
  } catch (e) {
    if (e && e.response && e.response.status === 404) {
      // Deleted elsewhere since: save it as a new scenario instead.
      store.savedId = null;
      error.value = 'That scenario no longer exists. Save this as a new scenario instead.';
      return;
    }
    handleSaveError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mb-4" data-cy="results-save">
    <RouterLink
      v-if="!auth.isLoggedIn"
      :to="{ name: 'login', query: { redirect: '/results' } }"
      class="btn btn-primary"
      data-cy="results-save-login-link"
    >
      Log in to save this scenario
    </RouterLink>

    <template v-else>
      <p v-if="savedUnchanged && !open" class="mb-0" role="status" data-cy="results-save-success">
        Saved as "{{ store.savedName }}".
        <RouterLink to="/scenarios" data-cy="results-save-scenarios-link">See my scenarios</RouterLink>
      </p>
      <div v-else-if="savedChanged && !open" class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" :disabled="saving" data-cy="results-update-button" @click="update">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          Update "{{ store.savedName }}"
        </button>
        <button type="button" class="btn btn-outline-secondary" data-cy="results-save-as-new-button" @click="start">
          Save as new
        </button>
      </div>
      <button v-else-if="!open" type="button" class="btn btn-primary" data-cy="results-save-button" @click="start">
        Save scenario
      </button>

      <form v-else novalidate class="save-scenario-form" data-cy="results-save-form" @submit.prevent="save">
        <label for="save-scenario-name" class="form-label">Scenario name</label>
        <div class="d-flex flex-wrap gap-2 align-items-start">
          <div class="flex-grow-1">
            <input
              id="save-scenario-name"
              ref="nameInput"
              v-model="name"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': shownError }"
              :aria-invalid="shownError ? 'true' : null"
              :maxlength="NAME_MAX"
              data-cy="results-save-name-input"
            />
            <div class="invalid-feedback">{{ shownError }}</div>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="saving" data-cy="results-save-submit">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            Save
          </button>
          <button type="button" class="btn btn-outline-secondary" data-cy="results-save-cancel" @click="cancel">
            Cancel
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-danger mt-2 mb-0" role="alert" data-cy="results-save-error">
        {{ error }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.save-scenario-form {
  max-width: 40rem;
}
</style>
