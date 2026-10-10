<script setup>
// What-if sliders for the dashboard. Emits a new copy of the values on every change; the
// dashboard re-runs the comparison (debounced). Growth rates are fractions (0.03 = 3%) like the
// store; the sliders show percent. Only inputs the API contract already accepts are here.
// TODO (seats 1 + 4): add rent while waiting and renovation once they are in API_CONTRACT.md.
import { computed } from 'vue';

const props = defineProps({
  // { purchaseYear, priceGrowth, incomeGrowth, holdingYears }
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
          @input="set(s.key, $event.target.value, s.scale)"
        />
      </div>

      <button type="button" class="btn btn-outline-secondary w-100" data-cy="dashboard-whatif-reset" @click="emit('reset')">
        Reset to my inputs
      </button>
    </div>
  </aside>
</template>