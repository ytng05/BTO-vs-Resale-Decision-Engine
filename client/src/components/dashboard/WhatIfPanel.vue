<script setup>
// What-if sliders for the dashboard. Emits a new copy of the values on every change; the
// dashboard re-runs the comparison (debounced). Growth rates are fractions (0.03 = 3%) like the
// store; the sliders show percent. Money sliders are in dollars; client.js turns them into cents (D14).
// Rent while waiting = contract v2's assumptions.monthlyHousingCostWhileWaitingCents (one figure for both
// paths, paid until each path's keys); renovation = choiceA/choiceB.renovationCents (paid at keys).
// Compare in = assumptions.horizonYear: both paths are measured in that year (D1); it can't be before the keys.
// BTO price = choiceA.btoPriceCents, within the launch's HDB range (D26); shown once a result names the launch.
// Resale price = choiceB.resalePriceCents (D39), 80% to 130% of the median; the median stays the valuation.
import { computed } from 'vue';
import WhatIfSlider from './WhatIfSlider.vue';
import { formatMoney } from '../../utils/format.js';
import { RENT_GUIDE_URL } from '../../constants/planOptions.js';

const props = defineProps({
  // { applicationYear, annualPriceGrowth, annualIncomeGrowth, horizonYear, monthlyHousingCostWhileWaiting, renovationA, renovationB }
  modelValue: { type: Object, required: true },
  // horizonYear can be null (server default); this is the year the last result used.
  horizonShown: { type: Number, default: null },
  horizonMin: { type: Number, required: true },
  horizonMax: { type: Number, required: true },
  // { name, min, max, used } in dollars: the BTO launch's HDB price range and the price the last result used.
  btoRange: { type: Object, default: null },
  // { median, used } in dollars: the resale median (the valuation, D39) and the price the last result used.
  resaleMedian: { type: Object, default: null },
  // The values from the saved plan, to count how many hidden assumptions have been changed.
  baseline: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'reset']);

const thisYear = new Date().getFullYear();

function set(key, raw, scale = 1) {
  emit('update:modelValue', { ...props.modelValue, [key]: Number(raw) / scale });
}

const pct = (fraction) => Math.round(fraction * 1000) / 10;

const sliders = computed(() => {
  const v = props.modelValue;
  const horizon = v.horizonYear ?? props.horizonShown ?? props.horizonMin;
  return [
    ...(props.btoRange
      ? [{
        group: 'Housing costs', key: 'btoPrice', id: 'whatif-bto-price', label: 'BTO price',
        hint: `${props.btoRange.name}: HDB's range ${formatMoney(props.btoRange.min)} to ${formatMoney(props.btoRange.max)}. Starts at the middle.`,
        min: props.btoRange.min, max: props.btoRange.max, step: 1000, scale: 1,
        value: v.btoPrice ?? props.btoRange.used, text: formatMoney(v.btoPrice ?? props.btoRange.used),
      }]
      : []),
    ...(props.resaleMedian
      ? [{
        group: 'Housing costs', key: 'resalePrice', id: 'whatif-resale-price', label: 'Resale price',
        hint: `Median of recent sales ${formatMoney(props.resaleMedian.median)}. Anything above it is paid in cash.`,
        min: Math.round((props.resaleMedian.median * 0.8) / 1000) * 1000,
        max: Math.round((props.resaleMedian.median * 1.3) / 1000) * 1000,
        step: 1000, scale: 1,
        value: v.resalePrice ?? props.resaleMedian.used, text: formatMoney(v.resalePrice ?? props.resaleMedian.used),
      }]
      : []),
    { key: 'renovationA', id: 'whatif-reno-bto', label: 'Renovation, BTO', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationA, text: formatMoney(v.renovationA) },
    { key: 'renovationB', id: 'whatif-reno-resale', label: 'Renovation, resale', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationB, text: formatMoney(v.renovationB) },
    { group: 'Timing', key: 'applicationYear', id: 'whatif-year', label: 'Apply / buy in', hint: 'Both paths move together', min: thisYear, max: thisYear + 6, step: 1, scale: 1, value: v.applicationYear, text: String(v.applicationYear) },
    { group: 'Market', key: 'annualPriceGrowth', id: 'whatif-price-growth', label: 'Flat price growth', min: -2, max: 8, step: 0.5, scale: 100, value: pct(v.annualPriceGrowth), text: `${pct(v.annualPriceGrowth)}% / yr` },
    { group: 'Market', key: 'annualIncomeGrowth', id: 'whatif-income-growth', label: 'Income growth', min: 0, max: 10, step: 0.5, scale: 100, value: pct(v.annualIncomeGrowth), text: `${pct(v.annualIncomeGrowth)}% / yr` },
    { group: 'Timing', key: 'horizonYear', id: 'whatif-horizon', label: 'Compare in', hint: 'Not before both sets of keys', min: props.horizonMin, max: props.horizonMax, step: 1, scale: 1, value: horizon, text: String(horizon) },
    { group: 'Housing costs', key: 'monthlyHousingCostWhileWaiting', id: 'whatif-rent', label: 'Rent while waiting for keys', hint: '0 = living with parents.', link: { href: RENT_GUIDE_URL, text: 'Median rents by town' }, min: 0, max: 5000, step: 100, scale: 1, value: v.monthlyHousingCostWhileWaiting, text: `${formatMoney(v.monthlyHousingCostWhileWaiting)}/mo` },
    { group: 'Housing costs', key: 'renovationA', id: 'whatif-reno-bto', label: 'Renovation, BTO', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationA, text: formatMoney(v.renovationA) },
    { group: 'Housing costs', key: 'renovationB', id: 'whatif-reno-resale', label: 'Renovation, resale', min: 0, max: 150000, step: 5000, scale: 1, value: v.renovationB, text: formatMoney(v.renovationB) },
  ];
});

// The sliders in three groups. Timing and Market are always shown (they move the answer most);
// Housing costs sit under "More assumptions" so the panel stays short.
const groups = computed(() => ['Timing', 'Market', 'Housing costs'].map((title) => ({
  title,
  items: sliders.value.filter((s) => s.group === title),
})));
const mainGroups = computed(() => groups.value.filter((g) => g.title !== 'Housing costs'));
const moreGroup = computed(() => groups.value.find((g) => g.title === 'Housing costs'));

// How many of the hidden sliders differ from the saved plan, so a closed panel never hides a change.
const moreChanged = computed(() => {
  if (!props.baseline) return 0;
  return (moreGroup.value?.items ?? []).filter((s) => props.modelValue[s.key] !== props.baseline[s.key]).length;
});
</script>

<template>
  <aside class="card dash-whatif" aria-labelledby="whatif-heading" data-cy="dashboard-whatif">
    <div class="card-body">
      <h2 id="whatif-heading" class="h5 mb-1">What if…</h2>
      <p class="text-secondary small mb-4">Move a slider and the comparison runs again. Your saved plan does not change.</p>

      <fieldset v-for="g in mainGroups" :key="g.title" class="whatif-group">
        <legend class="whatif-group__title">{{ g.title }}</legend>
        <WhatIfSlider v-for="s in g.items" :key="s.key" :slider="s" @change="set" />
      </fieldset>

      <details v-if="moreGroup && moreGroup.items.length" class="whatif-more" data-cy="dashboard-whatif-more">
        <summary class="whatif-more__summary">
          <span>More assumptions</span>
          <span v-if="moreChanged" class="whatif-more__count" data-cy="dashboard-whatif-more-count">{{ moreChanged }} changed</span>
          <svg class="whatif-more__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <fieldset class="whatif-group">
          <legend class="whatif-group__title">{{ moreGroup.title }}</legend>
          <WhatIfSlider v-for="s in moreGroup.items" :key="s.key" :slider="s" @change="set" />
        </fieldset>
      </details>

      <button type="button" class="btn btn-outline-secondary w-100 mt-3" data-cy="dashboard-whatif-reset" @click="emit('reset')">
        Reset to my inputs
      </button>
    </div>
  </aside>
</template>

<style scoped>
.whatif-group { border: 0; padding: 0; margin: 0; min-width: 0; }
.whatif-group + .whatif-group { border-top: 1px solid var(--border-subtle); padding-top: var(--space-4); }
.whatif-group__title {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  float: none;
  width: 100%;
  padding: 0;
  margin: 0 0 var(--space-3);
}
.whatif-more { border-top: 1px solid var(--border-subtle); margin-top: var(--space-2); }
.whatif-more__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 500;
}
.whatif-more__summary::-webkit-details-marker { display: none; }
.whatif-more__summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: var(--radius-sm); }
.whatif-more__count {
  background: var(--accent-fill-1);
  border-radius: var(--radius-pill);
  padding: 0 0.625rem;
  font-size: 0.75rem;
}
.whatif-more__chevron { margin-left: auto; transition: transform var(--duration-base) var(--ease-out); }
.whatif-more[open] .whatif-more__chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .whatif-more__chevron { transition: none; } }
</style>
