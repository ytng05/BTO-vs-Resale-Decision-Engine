<script setup>
// Version E, top left: the verdict in BTO's indigo. Who ends ahead, by how much (rounded to S$1,000), and both
// net positions as bars from S$0. The leading path is always named in words, never by colour alone.
import { computed } from 'vue';
import Term from '../Term.vue';
import { formatMoney } from '../../utils/format.js';
import { bars } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  headline: { type: String, required: true },
  call: { type: Object, default: null }, // verdict() from utils/resultsVerdict.js: winner, close (D42)
  horizon: { type: Number, default: null },
  // The application year when HDB wouldn't sell this BTO (new-flat income ceiling, D36): the card then says so and
  // points to the banner below, so "BTO comes out ahead" is never read on its own.
  blockedYear: { type: Number, default: null },
});
const a = computed(() => props.outcomeA.netPositionCents);
const b = computed(() => props.outcomeB.netPositionCents);
// A path is named as ahead only outside the "too close to call" line (D42), the same rule as the Results page.
const eyebrow = computed(() => {
  const c = props.call;
  if (!c || !c.winner) return '';
  if (c.winner === 'level') return 'About the same';
  if (c.close) return 'Too close to call';
  return `${c.winner === 'bto' ? 'BTO' : 'Resale'} comes out ahead`;
});
const k = (cents) => formatMoney(Math.round(cents / 100 / 1000) * 1000);
const rows = computed(() => {
  const w = bars(a.value, b.value);
  return [
    { key: 'bto', label: 'BTO', value: k(a.value), width: w.a },
    { key: 'resale', label: 'Resale', value: k(b.value), width: w.b },
  ];
});
</script>

<template>
  <section class="dash-verdict" aria-labelledby="dashboard-heading" data-cy="dashboard-verdict">
    <p v-if="eyebrow" class="dash-verdict__eyebrow" data-cy="dashboard-verdict-eyebrow">{{ eyebrow }}</p>
    <h1 id="dashboard-heading" class="dash-verdict__headline" data-cy="dashboard-headline">{{ headline }}</h1>
    <a v-if="blockedYear" href="#dashboard-critical" class="dash-verdict__blocked" data-cy="dashboard-verdict-blocked">
      <span aria-hidden="true">⚠</span> You couldn't buy this BTO in {{ blockedYear }}: your income is above the new-flat ceiling. See below.
    </a>
    <div class="dash-verdict__panel">
      <p class="dash-verdict__panel-title mb-0">
        <Term id="net-position">Net position</Term><template v-if="horizon"> in {{ horizon }}</template>
      </p>
      <div v-for="r in rows" :key="r.key" class="dash-verdict__bar">
        <span>{{ r.label }}</span>
        <span class="dash-verdict__track" aria-hidden="true"><span class="dash-verdict__fill" :class="`dash-verdict__fill--${r.key}`" :style="{ width: `${r.width}%` }"></span></span>
        <strong class="text-numeric" :data-cy="`dashboard-summary-${r.key}-net`">{{ r.value }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash-verdict {
  display: flex; flex-direction: column; gap: var(--space-4); height: 100%;
  padding: clamp(24px, 3.5vw, 40px); border-radius: var(--radius-lg);
  background: var(--dash-bto); color: var(--on-primary);
}
.dash-verdict__eyebrow { margin: 0; font-weight: 600; }
.dash-verdict__headline {
  margin: 0; color: var(--on-primary); font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(1.75rem, 3.4vw, 2.75rem); line-height: 1.08; letter-spacing: -0.03em;
}
.dash-verdict__blocked { align-self: flex-start; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--bg-surface); color: var(--danger-strong); font-size: 0.875rem; font-weight: 600; text-decoration: none; }
.dash-verdict__blocked:hover { text-decoration: underline; color: var(--danger-strong); }
.dash-verdict__panel { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.1); }
.dash-verdict__panel-title { opacity: 0.92; font-size: 0.9375rem; }
.dash-verdict__panel-title :deep(button) { color: inherit; text-decoration-color: rgba(255, 255, 255, 0.7); }
.dash-verdict__bar { display: grid; grid-template-columns: 5rem minmax(0, 1fr) auto; gap: var(--space-3); align-items: center; }
.dash-verdict__track { display: block; height: 12px; border-radius: var(--radius-pill); background: rgba(255, 255, 255, 0.2); overflow: hidden; }
.dash-verdict__fill { display: block; height: 100%; border-radius: var(--radius-pill); transition: width var(--duration-base) var(--ease-out); }
.dash-verdict__fill--bto { background: var(--on-primary); }
.dash-verdict__fill--resale { background: var(--accent-fill-1); }
.dash-verdict strong { min-width: 6.5rem; text-align: right; }
@media (prefers-reduced-motion: reduce) { .dash-verdict__fill { transition: none; } }
</style>
