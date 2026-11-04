<script setup>
// Top of the dashboard: the verdict. Who ends ahead, by how much (rounded to S$1,000), and both net positions as bars
// from S$0. A light indigo card (not a solid block), so it leads the page without overpowering it. The leading path
// is always named in words, never by colour alone.
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
    <div class="dash-verdict__text">
      <p v-if="eyebrow" class="dash-verdict__eyebrow" data-cy="dashboard-verdict-eyebrow">{{ eyebrow }}</p>
      <h1 id="dashboard-heading" class="dash-verdict__headline" data-cy="dashboard-headline">{{ headline }}</h1>
      <a v-if="blockedYear" href="#dashboard-critical" class="dash-verdict__blocked" data-cy="dashboard-verdict-blocked">
        <span aria-hidden="true">⚠</span> You couldn't buy this BTO in {{ blockedYear }}: your income is above the new-flat ceiling. See below.
      </a>
    </div>
    <div class="dash-verdict__panel">
      <p class="dash-verdict__panel-title mb-0">
        <Term id="net-position">Net position</Term><template v-if="horizon"> in {{ horizon }}</template>
      </p>
      <div v-for="r in rows" :key="r.key" class="dash-verdict__bar">
        <span :class="`dash-verdict__label--${r.key}`">{{ r.label }}</span>
        <span class="dash-verdict__track" aria-hidden="true"><span class="dash-verdict__fill" :class="`dash-verdict__fill--${r.key}`" :style="{ width: `${r.width}%` }"></span></span>
        <strong class="text-numeric" :data-cy="`dashboard-summary-${r.key}-net`">{{ r.value }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Laptop: headline on the left, the two bars on the right. Smaller screens: stacked. */
.dash-verdict {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-5);
  align-items: center;
  padding: clamp(24px, 3.5vw, 40px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--dash-bto-tint);
  background: var(--dash-bto-pale);
}
@media (min-width: 992px) { .dash-verdict { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: var(--space-8); } }
.dash-verdict__text { display: flex; flex-direction: column; gap: var(--space-3); }
.dash-verdict__eyebrow { margin: 0; font-size: 0.9375rem; font-weight: 600; color: var(--dash-bto); }
.dash-verdict__headline {
  margin: 0; color: var(--dash-bto); font-family: var(--font-heading); font-weight: 600;
  font-size: clamp(1.75rem, 3.2vw, 2.5rem); line-height: 1.1; letter-spacing: -0.03em;
}
.dash-verdict__blocked { align-self: flex-start; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--danger-fill); color: var(--danger-strong, var(--danger)); font-size: 0.875rem; font-weight: 600; text-decoration: none; }
.dash-verdict__blocked:hover { text-decoration: underline; }
.dash-verdict__panel { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); background: var(--bg-surface); }
.dash-verdict__panel-title { font-size: 0.9375rem; color: var(--text-secondary); }
.dash-verdict__bar { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) auto; gap: var(--space-3); align-items: center; }
.dash-verdict__label--bto { color: var(--dash-bto); font-weight: 600; }
.dash-verdict__label--resale { color: var(--dash-resale); font-weight: 600; }
.dash-verdict__track { display: block; height: 12px; border-radius: var(--radius-pill); background: var(--bg-page); overflow: hidden; }
.dash-verdict__fill { display: block; height: 100%; border-radius: var(--radius-pill); transition: width var(--duration-base) var(--ease-out); }
.dash-verdict__fill--bto { background: var(--dash-bto); }
.dash-verdict__fill--resale { background: var(--color-pink-deep); }
.dash-verdict strong { min-width: 6.5rem; text-align: right; font-size: 1.125rem; }
@media (prefers-reduced-motion: reduce) { .dash-verdict__fill { transition: none; } }
</style>