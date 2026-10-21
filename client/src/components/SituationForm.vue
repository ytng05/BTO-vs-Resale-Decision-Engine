<script setup>
// Step 1 of the plan stepper: who is buying, their money, and the assumptions.
// Reads and writes the Pinia store directly; PlanView owns validation and passes errors in.
// Field names follow the store (contract v2/v2.1). Money is in dollars here; client.js sends cents.
import { computed } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { CITIZENSHIPS, REQUIRED_APPLICANTS, RENT_GUIDE_URL, blankApplicant } from '../constants/planOptions.js';

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

const priceGrowthPct = percentOf('annualPriceGrowth');
const incomeGrowthPct = percentOf('annualIncomeGrowth');

// Optional number inputs: an emptied box means "not set" (null), not 0 or ''.
function optional(get, set) {
  return computed({
    get: () => get() ?? '',
    set: (v) => set(v === '' || v === null ? null : Number(v)),
  });
}
const horizonYear = optional(() => store.assumptions.horizonYear, (v) => { store.assumptions.horizonYear = v; });
const moveInByYear = optional(() => store.profile.constraints.moveInByYear, (v) => { store.profile.constraints.moveInByYear = v; });
const rentWhileWaiting = optional(
  () => store.assumptions.monthlyHousingCostWhileWaiting,
  (v) => { store.assumptions.monthlyHousingCostWhileWaiting = v ?? 0; },
);

const err = (key) => props.errors[key];
</script>

<template>
  <div data-cy="situation-form">
    <!-- Buyers -->
    <h3 class="h6 mt-2">Buyers</h3>
    <p class="text-secondary small mb-2">This version compares two buyers buying together; at least one must be a Singapore Citizen.</p>
    <p v-if="err('applicants')" class="text-danger small" role="alert" data-cy="situation-applicants-error">{{ err('applicants') }}</p>

    <div
      v-for="(a, i) in applicants"
      :key="a.id ?? i"
      class="border rounded p-3 mb-3"
      :data-cy="`situation-buyer-${i + 1}`"
    >
      <p class="fw-semibold mb-2">Buyer {{ i + 1 }}</p>

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
          <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-age-error`">{{ err(`applicants.${i}.age`) }}</div>

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
          <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-citizenship-error`">{{ err(`applicants.${i}.citizenship`) }}</div>

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
              <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-income-error`">{{ err(`applicants.${i}.monthlyIncome`) }}</div>
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
            <div class="invalid-feedback" :data-cy="`situation-buyer-${i + 1}-cpf-error`">{{ err(`applicants.${i}.cpfOaBalance`) }}</div>
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

    <!-- Savings and timing -->
    <h3 class="h6 mt-4">Savings and timing</h3>
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
      <div class="col-12 col-md-6">
        <label for="move-in-by" class="form-label">Must move in by <span class="text-secondary fw-normal">(optional)</span></label>
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
        <div id="move-in-by-help" class="form-text">We'll warn you if a path's keys come later than this.</div>
        <div class="invalid-feedback">{{ err('moveInByYear') }}</div>
      </div>
    </div>

    <!-- Assumptions -->
    <h3 class="h6">Assumptions</h3>
    <p class="text-secondary small">
      These are your own guesses, not forecasts. The results show how the answer changes if they are wrong.
    </p>
    <div class="row g-3">
      <div class="col-12 col-md-6 col-lg-3">
        <label for="price-growth" class="form-label">Flat price growth per year</label>
        <div class="input-group has-validation">
          <input
            id="price-growth"
            v-model.number="priceGrowthPct"
            type="number"
            step="0.5"
            placeholder="e.g. 3"
            :aria-invalid="err('annualPriceGrowth') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('annualPriceGrowth') }"
            data-cy="situation-price-growth-input"
          />
          <span class="input-group-text">%</span>
          <div class="invalid-feedback">{{ err('annualPriceGrowth') }}</div>
        </div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <label for="income-growth" class="form-label">Income growth per year</label>
        <div class="input-group has-validation">
          <input
            id="income-growth"
            v-model.number="incomeGrowthPct"
            type="number"
            step="0.5"
            placeholder="e.g. 2"
            :aria-invalid="err('annualIncomeGrowth') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('annualIncomeGrowth') }"
            data-cy="situation-income-growth-input"
          />
          <span class="input-group-text">%</span>
          <div class="invalid-feedback">{{ err('annualIncomeGrowth') }}</div>
        </div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <label for="horizon-year" class="form-label">Compare in year <span class="text-secondary fw-normal">(optional)</span></label>
        <input
          id="horizon-year"
          v-model="horizonYear"
          type="number"
          :min="currentYear + 1"
          step="1"
          inputmode="numeric"
          :placeholder="`e.g. ${currentYear + 15}`"
          aria-describedby="horizon-year-help"
          :aria-invalid="err('horizonYear') ? 'true' : null"
          class="form-control"
          :class="{ 'is-invalid': err('horizonYear') }"
          data-cy="situation-horizon-year-input"
        />
        <div id="horizon-year-help" class="form-text">Leave blank to compare 10 years after the later move-in.</div>
        <div class="invalid-feedback">{{ err('horizonYear') }}</div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <label for="rent-while-waiting" class="form-label">Rent while waiting for keys</label>
        <div class="input-group has-validation">
          <span class="input-group-text">$</span>
          <input
            id="rent-while-waiting"
            v-model="rentWhileWaiting"
            type="number"
            min="0"
            step="100"
            inputmode="numeric"
            placeholder="0"
            aria-describedby="rent-while-waiting-help"
            :aria-invalid="err('monthlyHousingCostWhileWaiting') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('monthlyHousingCostWhileWaiting') }"
            data-cy="situation-rent-input"
          />
          <span class="input-group-text">/mo</span>
          <div class="invalid-feedback">{{ err('monthlyHousingCostWhileWaiting') }}</div>
        </div>
        <div id="rent-while-waiting-help" class="form-text">
          Leave at 0 if you'll live with your parents. This makes a big difference to BTO.
          <a :href="RENT_GUIDE_URL" target="_blank" rel="noopener noreferrer">HDB median rents by town<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
        </div>
      </div>
    </div>
  </div>
</template>