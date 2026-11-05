<script setup>
// Top of the Results page (redesign, 4 Nov 2026): who ends ahead and by how much (the amount in pink), what the path
// that is behind still does better, and both net positions as bars. The "Would the answer change?", trade-off, why
// and grants boxes follow in ResultsView; the full side-by-side table lives on the Dashboard. Everything is derived from the two Outcomes by utils/resultsVerdict.js
// (pure, unit-tested); this component only lays it out. Wording follows the guardrails: "net position" (what a
// path leaves you with, after costs), never "profit". Colour is never the only signal: the leading path is named in
// words and each bar carries its figure.
// data-cy names: docs/CONVENTIONS.md "Results verdict".
import Term from './Term.vue';
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';
import { barShares, reasonLine } from '../utils/resultsVerdict.js';

const props = defineProps({
  verdict: { type: Object, required: true }, // from verdict()
  rows: { type: Array, required: true }, // from keyRows()
  horizonYear: { type: Number, default: null },
  labelA: { type: String, default: 'BTO' }, // e.g. 'BTO · Tampines', for the bars
  labelB: { type: String, default: 'Resale' },
});

const reason = computed(() => reasonLine(props.rows, props.verdict));
const position = computed(() => props.rows.find((r) => r.id === 'position'));
const shares = computed(() => barShares(position.value?.raw?.[0], position.value?.raw?.[1]));
const bars = computed(() => [
  { key: 'bto', label: props.labelA, value: position.value?.a, pct: shares.value.a },
  { key: 'resale', label: props.labelB, value: position.value?.b, pct: shares.value.b },
]);
const named = computed(() => (props.verdict.winner === 'bto' || props.verdict.winner === 'resale') && !props.verdict.close);
// The headline with its amount picked out in pink: [before, amount, after]. The whole sentence stays one h1.
const headlineParts = computed(() => {
  const h = props.verdict.headline ?? '';
  const amount = props.verdict.roundedDollars ? formatMoney(props.verdict.roundedDollars) : '';
  const at = amount ? h.indexOf(amount) : -1;
  return at === -1 ? [h, '', ''] : [h.slice(0, at), amount, h.slice(at + amount.length)];
});
</script>

<template>
  <section aria-labelledby="verdict-headline" class="verdict" data-cy="results-verdict">
    <div class="verdict__hero">
      <div class="verdict__lead">
        <p class="verdict__eyebrow" data-cy="results-verdict-eyebrow">
          <template v-if="named">
            <span class="verdict__dot" :class="`verdict__dot--${verdict.winner}`" aria-hidden="true"></span>
            {{ verdict.winner === 'bto' ? 'BTO' : 'Resale' }} comes out ahead<template v-if="horizonYear"> in {{ horizonYear }}</template>
          </template>
          <!-- Within the "too close to call" line (D42) no path is named as ahead, here or on the cards. -->
          <template v-else>{{ verdict.close ? 'Too close to call' : 'Your result' }}<template v-if="horizonYear"> in {{ horizonYear }}</template></template>
        </p>
        <h1 id="verdict-headline" class="verdict__headline" data-cy="results-verdict-headline">{{ headlineParts[0] }}<span v-if="headlineParts[1]" class="verdict__amount">{{ headlineParts[1] }}</span>{{ headlineParts[2] }}</h1>
        <p v-if="reason" class="verdict__reason" data-cy="results-verdict-reason">{{ reason }}</p>
      </div>

      <div class="verdict__bars" data-cy="results-verdict-bars">
        <p class="verdict__bars-title mb-3">
          <Term id="net-position">Net position</Term><template v-if="horizonYear"> in {{ horizonYear }}</template>
        </p>
        <div v-for="bar in bars" :key="bar.key" class="verdict__bar" :data-cy="`results-verdict-bar-${bar.key}`">
          <div class="verdict__bar-head">
            <span><span class="verdict__dot" :class="`verdict__dot--${bar.key}`" aria-hidden="true"></span>{{ bar.label }}</span>
            <span class="verdict__bar-value text-numeric">{{ bar.value }}</span>
          </div>
          <div class="verdict__track" aria-hidden="true">
            <div class="verdict__fill" :class="`verdict__fill--${bar.key}`" :style="{ width: `${bar.pct}%` }"></div>
          </div>
        </div>
        <p class="verdict__diff mb-1" data-cy="results-verdict-diff">{{ verdict.diffLine }}</p>
        <p class="text-caption mb-0">What the flat is worth, minus the loan, the CPF going back to your accounts and the cash you've spent. Grants are already counted. Bars start at S$0.</p>
      </div>
    </div>

  </section>
</template>

<style scoped>
.verdict__hero { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--space-4); }
.verdict__lead {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: clamp(24px, 3vw, 40px);
  border-radius: var(--radius-lg);
  background: var(--path-bto);
  color: var(--on-primary);
}
.verdict__eyebrow {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: var(--space-2);
  margin: 0;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.8125rem; font-weight: 500;
  background: var(--accent-fill-3);
  color: var(--text-primary);
}
.verdict__eyebrow .verdict__dot { margin-right: 0; }
.verdict__headline { margin: 0; font-family: var(--font-heading); font-weight: 700; font-size: clamp(1.875rem, 3.6vw, 2.875rem); line-height: 1.08; letter-spacing: -0.03em; color: inherit; }
.verdict__amount { color: var(--path-resale-bar); } /* pink on indigo, large text: 4.3:1, above the 3:1 for large text */
.verdict__reason { margin: 0; opacity: 0.92; font-size: 1.0625rem; line-height: 1.5; }
.verdict__bars { display: flex; flex-direction: column; justify-content: center; padding: clamp(20px, 3vw, 36px); border-radius: var(--radius-lg); background: var(--bg-surface); border: 1px solid var(--border-subtle); } /* the border keeps it apart from the white page */
.verdict__bars-title { font-size: 0.9375rem; font-weight: 500; }
.verdict__bar { margin-bottom: var(--space-3); }
.verdict__bar-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); font-size: 0.9375rem; }
.verdict__bar-value { font-family: var(--font-heading); font-weight: 500; font-size: 1.25rem; letter-spacing: -0.015em; }
.verdict__track { height: 0.75rem; margin-top: var(--space-1); border-radius: var(--radius-pill); background: var(--accent-fill-3); overflow: hidden; }
.verdict__fill { height: 100%; border-radius: var(--radius-pill); }
.verdict__fill--bto { background: var(--path-bto); }
.verdict__fill--resale { background: var(--path-resale-bar); box-shadow: inset 0 0 0 1px var(--primary); }
.verdict__diff { font-size: 0.9375rem; }
.verdict__dot { display: inline-block; width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: var(--space-2); }
.verdict__dot--bto { background: var(--path-bto); }
.verdict__dot--resale { background: var(--path-resale-bar); box-shadow: 0 0 0 1px var(--primary); }
@media (max-width: 991.98px) {
  .verdict__hero { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 575.98px) {
  .verdict__lead { padding: var(--space-4); }
  .verdict__bars { padding: var(--space-4); }
}
@media print {
  .verdict__lead { background: none; color: inherit; border: 1px solid var(--text-primary); }
}
</style>
