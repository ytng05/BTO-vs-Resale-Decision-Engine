<script setup>
// "Why BTO comes out ahead" (gapBreakdown, D34): one sentence on the main reason, then every part that differs as a
// bar either side of a centre line (left favours resale, right favours BTO), its amount and side in words, and the
// total. Colour is never the only signal: each line says which path it favours. The slot holds "See each path's
// full breakdown" (the two path cards). data-cy names: docs/CONVENTIONS.md "Gap breakdown".
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';
import { gapTotal, hiddenLineCount } from '../utils/gapFormat.js';
import { whySummary } from '../utils/resultsSummary.js';

const props = defineProps({ gap: { type: Object, default: null } });
const why = computed(() => whySummary(props.gap));
const total = computed(() => gapTotal(props.gap));
const hidden = computed(() => hiddenLineCount(props.gap));
</script>

<template>
  <section v-if="gap" class="why" aria-labelledby="why-title" data-cy="results-gap-card">
    <h2 id="why-title" class="why__title">{{ why.title }}</h2>
    <p v-if="why.sentence" class="why__lead" data-cy="results-why-sentence">{{ why.sentence }}</p>

    <div v-if="why.rows.length" class="why__axis" aria-hidden="true">
      <span></span>
      <span class="why__axis-sides"><span class="why__axis-left">Favours resale</span><span class="why__axis-right">Favours BTO</span></span>
      <span></span>
    </div>
    <ul v-if="why.rows.length" class="why__list" data-cy="results-gap-list">
      <li v-for="row in why.rows" :key="row.id" class="why__row" :data-cy="`results-gap-line-${row.id}`">
        <span class="why__label">{{ row.label }}</span>
        <span class="why__bars" aria-hidden="true">
          <span class="why__half why__half--left"><span v-if="row.side === 'resale'" class="why__bar why__bar--resale" :style="{ width: `${row.pct}%` }"></span></span>
          <span class="why__half"><span v-if="row.side === 'bto'" class="why__bar why__bar--bto" :style="{ width: `${row.pct}%` }"></span></span>
        </span>
        <span class="why__value"><strong class="text-numeric">{{ formatMoney(row.absCents / 100) }}</strong><small>{{ row.sideText }}</small></span>
      </li>
    </ul>
    <p v-else class="mb-0" data-cy="results-gap-none">No part of net position differs between the two paths.</p>

    <div v-if="total.text" class="why__total" data-cy="results-gap-total">
      <span>Total gap</span><strong class="text-numeric">{{ total.text }}</strong>
    </div>
    <p class="why__note" data-cy="results-gap-note">
      Grants and loan interest have no line of their own: they are already in the loan, CPF and cash lines.
      <template v-if="hidden > 0">{{ hidden }} other {{ hidden === 1 ? 'part is' : 'parts are' }} the same on both paths.</template>
    </p>
    <slot />
  </section>
</template>

<style scoped>
.why { display: flex; flex-direction: column; gap: var(--space-3); padding: clamp(20px, 3vw, 36px); border-radius: var(--radius-md); background: var(--bg-surface); }
.why__title { margin: 0; font-size: 1.5rem; font-weight: 600; }
.why__lead { margin: 0; color: var(--text-secondary); max-width: 75ch; line-height: 1.5; }
.why__axis, .why__row { display: grid; grid-template-columns: minmax(120px, 240px) minmax(0, 1fr) minmax(96px, 140px); column-gap: var(--space-4); align-items: center; }
.why__axis { font-size: 0.8125rem; color: var(--text-secondary); margin-top: var(--space-2); }
.why__axis-sides { display: flex; }
.why__axis-left { flex: 1; text-align: right; padding-right: var(--space-3); color: var(--color-berry); }
.why__axis-right { flex: 1; padding-left: var(--space-3); color: var(--accent-deep); }
.why__list { list-style: none; margin: 0; padding: 0; }
.why__row { padding: var(--space-2) 0; border-top: 1px solid var(--border-subtle); }
.why__label { font-size: 0.9375rem; }
.why__bars { display: flex; height: 18px; }
.why__half { flex: 1; display: flex; }
.why__half--left { justify-content: flex-end; border-right: 2px solid var(--text-primary); }
.why__bar { display: block; height: 100%; border-radius: 4px; }
.why__bar--bto { background: var(--accent-deep); }
.why__bar--resale { background: var(--accent-fill-1); }
.why__value { text-align: right; }
.why__value small { display: block; font-size: 0.75rem; color: var(--text-secondary); }
.why__total { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0 0; border-top: 1.5px solid var(--text-primary); font-weight: 600; }
.why__note { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
@media (max-width: 575.98px) {
  .why__axis, .why__row { grid-template-columns: minmax(0, 1fr) minmax(88px, auto); row-gap: var(--space-1); }
  .why__axis > :first-child, .why__axis > :last-child { display: none; }
  .why__axis { grid-template-columns: minmax(0, 1fr); }
  .why__bars { grid-column: 1 / -1; grid-row: 2; }
}
</style>
