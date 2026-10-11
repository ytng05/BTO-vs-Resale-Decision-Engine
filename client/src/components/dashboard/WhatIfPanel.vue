<script setup>
// What-if sliders for the dashboard. Emits a new copy of the values on every change; the
// dashboard re-runs the comparison (debounced). Growth rates are fractions (0.03 = 3%) like the
// store; the sliders show percent. Money sliders are in dollars; client.js turns them into cents (D14).
// Rent while waiting = contract v2's assumptions.monthlyHousingCostWhileWaitingCents (one figure for both
// paths, paid until each path's keys); renovation = choiceA/choiceB.renovationCents (paid at keys).
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  // { purchaseYear, priceGrowth, incomeGrowth, holdingYears, monthlyRent, renovationA, renovationB }
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(['update:modelValue', 'reset']);

const thisYear = new Date().getFullYear();

function set(key, raw, scale = 1) {
  emit('update:modelValue', { ...props.modelValue, [key]: Number(raw) / scale });
}

const pct = (fraction) => Math.round(fraction * 1000) / 10;

const sliders = computed(() => {
  const v = props.modelValue;
  return [
    { key: 'purchaseYear', id: 'whatif-year', label: 'Buy / apply in', min: thisYear, max: thisYear + 6, step: 1, scale: 1, value: v.purchaseYear, text: String(v.purchaseYear) },
    { key: 'priceGrowth', id: 'whatif-price-growth', label: 'Flat price growth', min: -2, max: 8, step: 0.5, scale: 100, value: pct(v.priceGrowth), text: `${pct(v.priceGrowth)}% / yr` },
    { key: 'incomeGrowth', id: 'whatif-income-growth', label: 'Income growth', min: 0, max: 10, step: 0.5, scale: 100, value: pct(v.incomeGrowth), text: `${pct(v.incomeGrowth)}% / yr` },
    { key: 'holdingYears', id: 'whatif-holding', label: 'Compare after', min: 1, max: 30, step: 1, scale: 1, value: v.holdingYears, text: `${v.holdingYears} years` },
    { key: 'monthlyRent', id: 'whatif-rent', label: 'Rent while waiting for keys', hint: '0 = living with parents', min: 0, max: 5000, step: 100, scale: 1, value: v.monthlyRent, text: `${formatMoney(v.monthlyRent)}/mo` },
    { key: 'renovationA', id: 'whatif-reno-bto', label: 'Renovation, BTO', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationA, text: formatMoney(v.renovationA) },
    { key: 'renovationB', id: 'whatif-reno-resale', label: 'Renovation, resale', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationB, text: formatMoney(v.renovationB) },
  ];
});
</script>

<template>
  <aside class="card dash-whatif" aria-labelledby="whatif-heading" data-cy="dashboard-whatif">
    <div class="card-body">
      <h2 id="whatif-heading" class="h5 mb-1">What if…</h2>
      <p class="text-secondary small mb-4">Move a slider and the comparison runs again. Your saved plan does not change.</p>

      <div v-for="s in sliders" :key="s.key" class="mb-3">
        <div class="d-flex justify-content-between small">
          <label :for="s.id" class="fw-semibold">{{ s.label }}</label>
          <output :for="s.id" class="fw-semibold text-numeric" :data-cy="`${s.id}-value`">{{ s.text }}</output>
        </div>
        <input
          :id="s.id"
          type="range"
          class="form-range"
          :min="s.min"
          :max="s.max"
          :step="s.step"
          :value="s.value"
          :aria-valuetext="s.text"
          :data-cy="`${s.id}-slider`"
          :aria-describedby="s.hint ? `${s.id}-hint` : undefined"
          @input="set(s.key, $event.target.value, s.scale)"
        />
        <div v-if="s.hint" :id="`${s.id}-hint`" class="form-text mt-0">{{ s.hint }}</div>
      </div>

      <button type="button" class="btn btn-outline-secondary w-100" data-cy="dashboard-whatif-reset" @click="emit('reset')">
        Reset to my inputs
      </button>
    </div>
  </aside>
</template>