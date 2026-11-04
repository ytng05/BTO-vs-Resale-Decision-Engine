<script setup>
// Results: why the leading path comes out ahead, from /api/compare's gapBreakdown (D34). The biggest lines first, each
// as a bar towards the path it favours, with its exact amount; "Show all" adds the smaller ones. Hidden when it's too
// close to call or the two are level (D42), so it never explains a winner the page doesn't name.
// (The Dashboard used to carry this; it belongs with the answer.)
import { computed, ref } from 'vue';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  gap: { type: Object, default: null }, // gapBreakdown: { lines: [{ id, label, amountCents }] }, amountCents > 0 favours BTO
  verdict: { type: Object, default: null }, // verdict() from utils/resultsVerdict.js
});

const leader = computed(() => {
  const v = props.verdict;
  if (!v || v.close || !['bto', 'resale'].includes(v.winner)) return null;
  return v.winner === 'bto' ? 'BTO' : 'Resale';
});

const TOP = 3;
const showAll = ref(false);
const lines = computed(() => (props.gap?.lines ?? [])
  .filter((l) => Math.round(Math.abs(l.amountCents ?? 0) / 100) !== 0)
  .sort((x, y) => Math.abs(y.amountCents) - Math.abs(x.amountCents))
  .map((l, i, all) => ({
    id: l.id,
    label: l.label,
    side: l.amountCents > 0 ? 'bto' : 'resale',
    pct: Math.max(3, Math.round((Math.abs(l.amountCents) / Math.abs(all[0].amountCents)) * 100)),
    amount: formatMoney(Math.abs(l.amountCents) / 100),
  })));
const shown = computed(() => (showAll.value ? lines.value : lines.value.slice(0, TOP)));
</script>

<template>
  <section v-if="leader && lines.length" class="rwhy" aria-labelledby="results-why-title" data-cy="results-why">
    <div class="section-head mb-0">
      <h2 id="results-why-title" class="section-head__title">Why {{ leader }} comes out ahead</h2>
      <p class="section-head__sub">What pushes the answer each way, biggest first. Exact amounts, by the comparison year.</p>
    </div>

    <div class="rwhy__axis" aria-hidden="true"><span></span><span class="rwhy__axis-chart"><span>Favours resale</span><span>Favours BTO</span></span><span></span></div>
    <ul class="rwhy__list">
      <li v-for="l in shown" :key="l.id" class="rwhy__row" :data-cy="`results-why-${l.id}`">
        <span class="rwhy__label">{{ l.label }}</span>
        <span class="rwhy__chart" aria-hidden="true">
          <span class="rwhy__half rwhy__half--resale"><i v-if="l.side === 'resale'" :style="{ width: `${l.pct}%` }"></i></span>
          <span class="rwhy__half rwhy__half--bto"><i v-if="l.side === 'bto'" :style="{ width: `${l.pct}%` }"></i></span>
        </span>
        <span class="rwhy__amount text-numeric" :class="`is-${l.side}`">
          {{ l.amount }}<span class="rwhy__for"> for {{ l.side === 'bto' ? 'BTO' : 'resale' }}</span>
        </span>
      </li>
    </ul>
    <button
      v-if="lines.length > TOP"
      type="button"
      class="rwhy__more d-print-none"
      :aria-expanded="showAll ? 'true' : 'false'"
      data-cy="results-why-all"
      @click="showAll = !showAll"
    >{{ showAll ? 'Show the biggest only' : `Show all ${lines.length}` }}</button>
  </section>
</template>

<style scoped>
.rwhy { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-surface); }
.rwhy__axis { display: grid; grid-template-columns: minmax(8rem, 14rem) 1fr 9rem; gap: var(--space-3); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
.rwhy__axis-chart { display: grid; grid-template-columns: 1fr 1fr; }
.rwhy__axis-chart span:first-child { text-align: right; padding-right: var(--space-2); }
.rwhy__axis-chart span:last-child { padding-left: var(--space-2); }
.rwhy__list { display: flex; flex-direction: column; gap: 0; margin: 0; padding: 0; list-style: none; }
.rwhy__row { display: grid; grid-template-columns: minmax(8rem, 14rem) 1fr 9rem; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); margin: 0 calc(var(--space-3) * -1); border-radius: var(--radius-sm); font-size: 0.9375rem; transition: background-color 0.15s ease; }
/* Hover a reason: its row lights up and its bar thickens. */
.rwhy__row:hover { background: var(--accent-tint); }
.rwhy__row:hover .rwhy__chart { height: 18px; }
.rwhy__chart { transition: height 0.15s ease; }
.rwhy__label { min-width: 0; }
.rwhy__chart { display: grid; grid-template-columns: 1fr 1fr; height: 14px; }
.rwhy__half { display: flex; height: 100%; }
.rwhy__half--resale { justify-content: flex-end; border-right: 2px solid var(--text-primary); }
.rwhy__half i { display: block; height: 100%; animation: rwhy-grow 0.7s var(--ease-out) both; }
.rwhy__half--resale i { transform-origin: right; }
.rwhy__half--bto i { transform-origin: left; }
.rwhy__row:nth-child(2) .rwhy__half i { animation-delay: 0.08s; }
.rwhy__row:nth-child(3) .rwhy__half i { animation-delay: 0.16s; }
.rwhy__row:nth-child(n + 4) .rwhy__half i { animation-delay: 0.22s; }
@keyframes rwhy-grow { from { transform: scaleX(0); } to { transform: none; } }
.rwhy__half--resale i { background: var(--path-resale-bar); border-radius: 4px 0 0 4px; }
.rwhy__half--bto i { background: var(--path-bto); border-radius: 0 4px 4px 0; }
.rwhy__amount { text-align: right; font-weight: 600; white-space: nowrap; }
.rwhy__amount.is-bto { color: var(--path-bto); }
.rwhy__amount.is-resale { color: var(--path-resale); }
.rwhy__for { font-weight: 400; color: var(--text-secondary); }
.rwhy__more { align-self: flex-start; padding: 0; border: 0; background: none; font-weight: 600; color: var(--text-primary); text-decoration: underline; text-underline-offset: 3px; transition: color 0.15s ease; }
.rwhy__more:hover { color: var(--color-berry); }
.rwhy__more:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }

/* Phones: label on its own line, then the bar and the amount. */
@media (prefers-reduced-motion: reduce) {
  .rwhy__half i { animation: none; }
  .rwhy__row, .rwhy__chart { transition: none; }
}
@media (max-width: 575.98px) {
  .rwhy__axis { grid-template-columns: 1fr auto; }
  .rwhy__axis > span:first-child { display: none; }
  .rwhy__row { grid-template-columns: 1fr auto; }
  .rwhy__label { grid-column: 1 / -1; }
}
</style>
