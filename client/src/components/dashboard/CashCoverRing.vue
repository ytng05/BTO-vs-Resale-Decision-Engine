<script setup>
// One progress ring: how much of the cash needed at purchase the household's cash savings cover (D35, D19).
// The ring is decoration for the number: the percentage, the amounts and the status are all written out,
// and the path is named in text, so colour is never the only signal (UI.md §3, §11). BTO is ink, resale pink.
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { cashCover } from '../../utils/dashboardFormat.js';

const props = defineProps({
  label: { type: String, required: true }, // "BTO" | "Resale"
  tone: { type: String, default: 'bto' }, // 'bto' | 'resale'
  cashSavings: { type: Number, default: null }, // dollars (the store)
  requiredCents: { type: Number, default: null }, // Outcome.cashRequiredAtPurchaseCents
  cy: { type: String, default: '' },
});

const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

const cover = computed(() => cashCover(props.cashSavings, props.requiredCents));
const dash = computed(() => `${(cover.value.pct / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`);
const centre = computed(() => (cover.value.state === 'unknown' ? '—' : `${cover.value.pct}%`));
const amounts = computed(() => {
  if (cover.value.state === 'unknown' || typeof props.requiredCents !== 'number') return '';
  if (cover.value.state === 'none' || cover.value.state === 'covered') return ''; // the status line already says it
  return `${formatMoney(props.cashSavings)} of ${formatMoney(props.requiredCents / 100)}`;
});
</script>

<template>
  <figure class="cash-ring m-0" :data-cy="cy || undefined">
    <div class="cash-ring__dial">
      <svg viewBox="0 0 120 120" class="cash-ring__svg" aria-hidden="true">
        <circle class="cash-ring__track" cx="60" cy="60" :r="R" fill="none" stroke-width="12" />
        <circle
          class="cash-ring__bar"
          :class="`cash-ring__bar--${tone}`"
          cx="60"
          cy="60"
          :r="R"
          fill="none"
          stroke-width="12"
          :stroke-linecap="cover.pct > 0 ? 'round' : 'butt'"
          :stroke-dasharray="dash"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <span class="cash-ring__pct text-numeric" aria-hidden="true">{{ centre }}</span>
    </div>
    <figcaption class="cash-ring__caption">
      <span class="fw-semibold d-block"><span class="dash-dot" :class="`dash-dot--${tone}`" aria-hidden="true"></span>{{ label }}</span>
      <span v-if="amounts" class="text-numeric d-block small">{{ amounts }}</span>
      <span class="d-block small text-secondary" :data-cy="cy ? `${cy}-status` : undefined">{{ cover.text }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.cash-ring { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); flex: 1 1 0; min-width: 0; }
.cash-ring__dial { position: relative; width: 7.5rem; height: 7.5rem; }
.cash-ring__svg { width: 100%; height: 100%; display: block; }
.cash-ring__track { stroke: var(--accent-fill-3); }
.cash-ring__bar--bto { stroke: var(--path-bto); }
.cash-ring__bar--resale { stroke: var(--path-resale-bar); }
.cash-ring__pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
@media (max-width: 575.98px) {
  .cash-ring__dial { width: 6rem; height: 6rem; }
  .cash-ring__pct { font-size: 1.25rem; }
}
@media (prefers-reduced-motion: no-preference) {
  .cash-ring__bar { transition: stroke-dasharray var(--duration-base) var(--ease-out); }
}
</style>
