<script setup>
// Step 1 of the plan stepper: who is buying, their money, and the assumptions.
// Reads and writes the Pinia store directly; PlanView owns validation and passes errors in.
import { computed } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { CITIZENSHIPS, MAX_APPLICANTS, blankApplicant } from '../constants/planOptions.js';

const props = defineProps({
  errors: { type: Object, default: () => ({}) },
});

const store = useScenarioStore();
const applicants = computed(() => store.profile.applicants);

if (store.profile.applicants.length === 0) {
  store.profile.applicants.push(blankApplicant());
}

function addApplicant() {
  if (applicants.value.length < MAX_APPLICANTS) store.profile.applicants.push(blankApplicant());
}

function removeApplicant(index) {
  if (applicants.value.length > 1) store.profile.applicants.splice(index, 1);
}

// The contract stores growth rates as decimals (0.03), but people think in percent (3).
function percentOf(key) {
  return computed({
    get() {
      const v = store.assumptions[key];
      return v === null || v === undefined ? '' : Math.round(v * 10000) / 100;
    },
    set(pct) {
      store.assumptions[key] = pct === '' || pct === null ? null : Number(pct) / 100;
    },
  });
}

const priceGrowthPct = percentOf('priceGrowth');
const incomeGrowthPct = percentOf('incomeGrowth');

const err = (key) => props.errors[key];
</script>

<template>
  <div data-cy="situation-form">
    <!-- Buyers -->
    <h3 class="h6 mt-2">Buyers</h3>
    <p v-if="err('applicants')" class="text-danger small" data-cy="situation-applicants-error">{{ err('applicants') }}</p>

    <div
      v-for="(a, i) in applicants"
      :key="i"
      class="border rounded p-3 mb-3"
      :data-cy="`situation-buyer-${i + 1}`"
    >
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="fw-semibold">Buyer {{ i + 1 }}</span>
        <button
          v-if="applicants.length > 1"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :data-cy="`situation-buyer-${i + 1}-remove-button`"
          @click="removeApplicant(i)"
        >
          Remove
        </button>
      </div>

      <div class="row g-3">
        <div class="col-12 col-sm-6 col-lg-3">
          <label :for="`buyer-${i}-age`" class="form-label">Age</label>
          <input
            :id="`buyer-${i}-age`"
            v-model.number="a.age"
            type="number"
            min="18"
            step="1"
            inputmode="numeric"
            placeholder="e.g. 30"
            :aria-invalid="err(`applicants.${i}.age`) ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err(`applicants.${i}.age`) }"
            :data-cy="`situation-buyer-${i + 1}-age-input`"
          />
          <div class="invalid-feedback">{{ err(`applicants.${i}.age`) }}</div>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
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
          <div class="invalid-feedback">{{ err(`applicants.${i}.citizenship`) }}</div>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
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
            <div class="invalid-feedback">{{ err(`applicants.${i}.monthlyIncome`) }}</div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
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
            <div class="invalid-feedback">{{ err(`applicants.${i}.cpfOaBalance`) }}</div>
          </div>
        </div>

        <div class="col-12">
          <div class="form-check form-switch">
            <input
              :id="`buyer-${i}-first-timer`"
              v-model="a.firstTimer"
              type="checkbox"
              role="switch"
              class="form-check-input"
              :data-cy="`situation-buyer-${i + 1}-first-timer-switch`"
            />
            <label :for="`buyer-${i}-first-timer`" class="form-check-label">
              First-timer (has never taken an HDB housing subsidy)
            </label>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="applicants.length < MAX_APPLICANTS"
      type="button"
      class="btn btn-outline-primary btn-sm mb-4"
      data-cy="situation-add-buyer-button"
      @click="addApplicant"
    >
      Add a second buyer
    </button>

    <!-- Savings -->
    <h3 class="h6">Savings</h3>
    <div class="row g-3 mb-4">
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
    </div>

    <!-- Assumptions -->
    <h3 class="h6">Assumptions</h3>
    <p class="text-secondary small">
      These are your own guesses, not forecasts. The results show how the answer changes if they are wrong.
    </p>
    <div class="row g-3">
      <div class="col-12 col-md-4">
        <label for="price-growth" class="form-label">Flat price growth per year</label>
        <div class="input-group has-validation">
          <input
            id="price-growth"
            v-model.number="priceGrowthPct"
            type="number"
            step="0.5"
            placeholder="e.g. 3"
            :aria-invalid="err('priceGrowth') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('priceGrowth') }"
            data-cy="situation-price-growth-input"
          />
          <span class="input-group-text">%</span>
          <div class="invalid-feedback">{{ err('priceGrowth') }}</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <label for="income-growth" class="form-label">Income growth per year</label>
        <div class="input-group has-validation">
          <input
            id="income-growth"
            v-model.number="incomeGrowthPct"
            type="number"
            step="0.5"
            placeholder="e.g. 2"
            :aria-invalid="err('incomeGrowth') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('incomeGrowth') }"
            data-cy="situation-income-growth-input"
          />
          <span class="input-group-text">%</span>
          <div class="invalid-feedback">{{ err('incomeGrowth') }}</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <label for="horizon" class="form-label">Compare after</label>
        <div class="input-group has-validation">
          <input
            id="horizon"
            v-model.number="store.assumptions.horizonYears"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            placeholder="e.g. 10"
            :aria-invalid="err('horizonYears') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('horizonYears') }"
            data-cy="situation-horizon-input"
          />
          <span class="input-group-text">years</span>
          <div class="invalid-feedback">{{ err('horizonYears') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>