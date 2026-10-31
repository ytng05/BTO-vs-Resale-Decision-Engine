<script setup>
// Step 2 of the plan stepper, "About you" (D38): the two buyers, cash savings, and the move-in year when
// the household picked "moving in by a date" in step 1. Price and income growth, the comparison year and
// rent while waiting are not asked here: they have defaults and are changed on the Dashboard (D35).
// Reads and writes the Pinia store directly; PlanView owns validation and passes errors in.
// Field names follow the store (contract v2/v2.1). Money is in dollars here; client.js sends cents.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { ehgEstimate } from '../api/client.js';
import { formatMoney } from '../utils/format.js';
import { CITIZENSHIPS, REQUIRED_APPLICANTS, blankApplicant } from '../constants/planOptions.js';

const props = defineProps({
  errors: { type: Object, default: () => ({}) },
});

const store = useScenarioStore();
const applicants = computed(() => store.profile.applicants);
const currentYear = new Date().getFullYear();

// The contract models exactly two buyers (API_CONTRACT.md), so always show two.
while (store.profile.applicants.length < REQUIRED_APPLICANTS) {
  store.profile.applicants.push(blankApplicant());
}
if (!store.profile.constraints) store.profile.constraints = { moveInByYear: null };

// Optional number inputs: an emptied box means "not set" (null), not 0 or ''.
function optional(get, set) {
  return computed({
    get: () => get() ?? '',
    set: (v) => set(v === '' || v === null ? null : Number(v)),
  });
}
const moveInByYear = optional(() => store.profile.constraints.moveInByYear, (v) => { store.profile.constraints.moveInByYear = v; });
// Shown when picked in step 1, or when a saved plan already has a year.
const askMoveIn = computed(() => store.wishes.includes('moveby') || store.profile.constraints.moveInByYear != null);

const err = (key) => props.errors[key];

// ---- Early EHG estimate from seat 2's grant rules (POST /api/grants), once both buyers' ages and
// incomes are in. Projected to the plan's application year, as Results works it out, so the two agree.
// Worded as an estimate: the flat comes later. Hidden on mock data.
const ehg = ref(null); // { cents, reason, year, growthPct, years } or null
const ready = computed(() => applicants.value.length === REQUIRED_APPLICANTS && applicants.value.every(
  (a) => Number.isInteger(a.age) && a.age >= 18 && typeof a.monthlyIncome === 'number' && a.monthlyIncome >= 0,
));
let timer = null;
let requestId = 0;
async function refreshEhg() {
  if (!ready.value) { ehg.value = null; return; }
  const id = ++requestId;
  try {
    const res = await ehgEstimate(store);
    if (id !== requestId) return; // a newer edit is already on its way
    const grant = res.mock ? null : res.grants?.find((g) => g.id === 'EHG');
    if (!grant) { ehg.value = null; return; }
    const band = grant.tests.find((t) => t.id === 'EHG_INCOME_BAND' && t.passed);
    const failed = grant.tests.find((t) => !t.passed);
    ehg.value = {
      cents: grant.amountCents,
      reason: (grant.amountCents > 0 ? band : failed)?.reason ?? '',
      year: res.applicationYear,
      years: res.years,
      growthPct: Math.round((store.assumptions.annualIncomeGrowth ?? 0) * 1000) / 10,
    };
  } catch {
    if (id === requestId) ehg.value = null; // the hint is a bonus: no error message for it
  }
}
watch(
  () => applicants.value.map((a) => [a.age, a.citizenship, a.firstTimer, a.monthlyIncome]),
  () => { clearTimeout(timer); timer = setTimeout(refreshEhg, 400); },
  { deep: true, immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div data-cy="situation-form">
    <!-- Buyers. The step's intro (two buyers, at least one a citizen; CPF statement handy) sits in PlanView's banner. -->
    <p v-if="err('applicants')" class="text-danger small" role="alert" data-cy="situation-applicants-error">{{ err('applicants') }}</p>

    <!-- The two buyers one above the other, each in its own box: on wide screens a single row per buyer. -->
    <div class="row g-2 mb-3">
    <div
      v-for="(a, i) in applicants"
      :key="a.id ?? i"
      class="col-12"
    >
    <div class="buyer border rounded p-3 h-100" :data-cy="`situation-buyer-${i + 1}`">
      <div class="buyer__head">
        <p class="fw-semibold mb-0 buyer__name">Buyer {{ i + 1 }}</p>
        <div class="form-check form-switch mb-0">
          <input
            :id="`buyer-${i}-first-timer`"
            v-model="a.firstTimer"
            type="checkbox"
            role="switch"
            class="form-check-input"
            :data-cy="`situation-buyer-${i + 1}-first-timer-switch`"
          />
          <label :for="`buyer-${i}-first-timer`" class="form-check-label" title="Has never taken an HDB housing subsidy">
            First-timer <span class="buyer__hint text-secondary">(never taken an HDB housing subsidy)</span>
          </label>
        </div>
      </div>

      <!-- Age, citizenship, income and CPF beside the name on wide screens (buyer__fields), two by two below; on phones
           the money fields take the full width so a six-figure balance is never cut off. -->
      <div class="row g-2 buyer__fields">
        <div class="col-3 col-sm-6 buyer__field">
          <label :for="`buyer-${i}-age`" class="form-label">Age</label>
          <input
            :id="`buyer-${i}-age`"
            v-model.number="a.age"
            type="number"
            min="18"
            step="1"
            inputmode="numeric"
            placeholder="30"
            :aria-invalid="err(`applicants.${i}.age`) ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err(`applicants.${i}.age`) }"
            :data-cy="`situation-buyer-${i + 1}-age-input`"
          />
          <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-age-error`">{{ err(`applicants.${i}.age`) }}</div>

        </div>

        <div class="col-9 col-sm-6 buyer__field">
          <label :for="`buyer-${i}-citizenship`" class="form-label">Citizenship</label>
          <select
            :id="`buyer-${i}-citizenship`"
            v-model="a.citizenship"
            class="form-select"
            :class="{ 'is-invalid': err(`applicants.${i}.citizenship`) }"
            :aria-invalid="err(`applicants.${i}.citizenship`) ? 'true' : null"
            :data-cy="`situation-buyer-${i + 1}-citizenship-select`"
          >
            <option v-for="c in CITIZENSHIPS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-citizenship-error`">{{ err(`applicants.${i}.citizenship`) }}</div>

        </div>

        <div class="col-12 col-sm-6 buyer__field">
          <label :for="`buyer-${i}-income`" class="form-label">Monthly income</label>
          <div class="input-group has-validation">
            <span class="input-group-text">$</span>
            <input
              :id="`buyer-${i}-income`"
              v-model.number="a.monthlyIncome"
              type="number"
              min="0"
              step="100"
              inputmode="numeric"
              placeholder="e.g. 5000"
              :aria-invalid="err(`applicants.${i}.monthlyIncome`) ? 'true' : null"
              class="form-control"
              :class="{ 'is-invalid': err(`applicants.${i}.monthlyIncome`) }"
              :data-cy="`situation-buyer-${i + 1}-income-input`"
            />
              <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-income-error`">{{ err(`applicants.${i}.monthlyIncome`) }}</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 buyer__field">
          <label :for="`buyer-${i}-cpf`" class="form-label">CPF OA balance</label>
          <div class="input-group has-validation">
            <span class="input-group-text">$</span>
            <input
              :id="`buyer-${i}-cpf`"
              v-model.number="a.cpfOaBalance"
              type="number"
              min="0"
              step="100"
              inputmode="numeric"
              placeholder="e.g. 40000"
              :aria-invalid="err(`applicants.${i}.cpfOaBalance`) ? 'true' : null"
              class="form-control"
              :class="{ 'is-invalid': err(`applicants.${i}.cpfOaBalance`) }"
              :data-cy="`situation-buyer-${i + 1}-cpf-input`"
            />
            <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-cpf-error`">{{ err(`applicants.${i}.cpfOaBalance`) }}</div>
          </div>
        </div>

      </div>
    </div>
    </div>
    </div>

    <!-- Early estimate: the EHG in the application year, incomes grown as on Results (D38) -->
    <div v-if="ehg" class="alert alert-info small py-2 mb-3" role="status" aria-live="polite" data-cy="situation-ehg-hint">
      <strong v-if="ehg.cents > 0">Applying in {{ ehg.year }}, you'd likely get up to {{ formatMoney(ehg.cents / 100) }} in Enhanced CPF Housing Grant.</strong>
      <strong v-else>Applying in {{ ehg.year }}, the Enhanced CPF Housing Grant likely doesn't apply.</strong>
      <template v-if="ehg.years > 0">We grow your incomes {{ ehg.growthPct }}% a year to then, as the results do. </template>
      {{ ehg.reason }} We check all your grants again once you choose your flats.
    </div>

    <!-- Household -->
    <div class="row g-3">
      <div class="col-12 col-md-6">
        <label for="cash-savings" class="form-label">Cash savings now</label>
        <div class="input-group has-validation">
          <span class="input-group-text">$</span>
          <input
            id="cash-savings"
            v-model.number="store.profile.cashSavings"
            type="number"
            min="0"
            step="1000"
            inputmode="numeric"
            placeholder="e.g. 20000"
            :aria-invalid="err('cashSavings') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('cashSavings') }"
            data-cy="situation-cash-savings-input"
          />
          <div class="invalid-feedback">{{ err('cashSavings') }}</div>
        </div>
      </div>
      <div v-if="askMoveIn" class="col-12 col-md-6">
        <label for="move-in-by" class="form-label">Must move in by</label>
        <input
          id="move-in-by"
          v-model="moveInByYear"
          type="number"
          :min="currentYear"
          step="1"
          inputmode="numeric"
          :placeholder="`e.g. ${currentYear + 4}`"
          aria-describedby="move-in-by-help"
          :aria-invalid="err('moveInByYear') ? 'true' : null"
          class="form-control"
          :class="{ 'is-invalid': err('moveInByYear') }"
          data-cy="situation-move-in-by-input"
        />
        <div id="move-in-by-help" class="form-text">We'll tell you if a path's keys come later than this. Leave blank for no deadline.</div>
        <div class="invalid-feedback">{{ err('moveInByYear') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Only the two-digit age drops its spinner, which would cover the digits in its narrow box (every width). */
.buyer__fields input[id$="-age"] { appearance: textfield; -moz-appearance: textfield; }
.buyer__fields input[id$="-age"]::-webkit-inner-spin-button,
.buyer__fields input[id$="-age"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.buyer__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 16px; margin-bottom: 8px; }
/* From lg each buyer is one row: name and first-timer switch, then age, citizenship and the two money fields, which
   get the most room. Below lg the name sits on top and the fields go two by two. */
@media (min-width: 992px) {
  .buyer { display: grid; grid-template-columns: 150px 64px minmax(190px, 1fr) 1.3fr 1.3fr; column-gap: 12px; align-items: end; }
  .buyer__head { flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 4px; margin-bottom: 0; align-self: stretch; }
  /* The hint would wrap the name column onto four lines: kept for screen readers, shown as the label's tooltip. */
  .buyer__hint { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .buyer__head .form-check-label { white-space: nowrap; }
  .buyer__fields { display: contents; }
  .buyer__fields > .buyer__field { width: auto; padding-inline: 0; margin-top: 0; }
  .buyer__fields .form-select { padding-left: 12px; padding-right: 32px; background-position: right 12px center; }
}
</style>
