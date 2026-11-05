<script setup>
// Under the verdict: can today's savings pay the cash each path needs up front? A slim white card in the page's
// palette (review, 5 Nov 2026: no big green or amber box); only the round icon carries the status: a green ✓ when both
// are covered, an amber ! when either is short. "Try a later year" moves focus to the What-if panel.
// Everything is written out (no hover tooltips): how much each path's cash is covered, the exact amount short (a
// shortfall is never rounded), and the stated assumption that no more is saved before buying (D19).
// data-cy: CONVENTIONS "Dashboard".
import { computed } from 'vue';
import { cashCard } from '../../utils/dashboardSummary.js';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  cashSavings: { type: Number, default: null }, // dollars, from the saved plan
});
const emit = defineEmits(['jump-whatif']);
const card = computed(() => cashCard(props.outcomeA, props.outcomeB, props.cashSavings));
const title = computed(() => {
  if (!card.value) return 'Add your cash savings to see if they cover the cash up front';
  if (card.value.bothShort) return "Your savings don't cover the cash for either flat yet";
  if (card.value.anyShort) return `Your savings today don't cover the cash for the ${card.value.rows[0].shortCents > 0 ? 'BTO' : 'resale flat'}`;
  return 'Your savings today cover the cash for both flats';
});
const rows = computed(() => (card.value?.rows ?? []).map((r) => ({
  ...r,
  key: r.side === 'a' ? 'bto' : 'resale',
  label: r.side === 'a' ? 'BTO' : 'Resale',
  // Short: the exact amount (S$91,344 short, never rounded), with "S$20,000 of S$111,344 covered" under the bar, also
  // exact, so a small shortfall never sits above "S$111,000 of S$111,000 covered". Covered: "Covered, S$9,000 to spare".
  shortText: r.shortCents > 0 ? `${formatMoney(r.shortCents / 100)} short` : r.text,
  ofText: r.shortCents > 0 ? `${formatMoney(Math.max(0, r.needCents - r.shortCents) / 100)} of ${formatMoney(r.needCents / 100)} covered` : '',
  // No savings: an empty bar, not a 2% sliver; otherwise at least a sliver so a small amount still shows.
  barPct: r.coveredPct <= 0 ? 0 : Math.max(r.coveredPct, 2),
})));
// The stated assumption under the rows. "The loans are capped" only when a loan really is (affordability.withinLimit).
const capped = computed(() => [props.outcomeA, props.outcomeB].some((o) => o?.affordability && !o.affordability.withinLimit));
const assumption = computed(() => {
  if (!card.value?.anyShort) return '';
  return `${capped.value ? 'The loans are capped, so the rest is paid in cash. ' : ''}We don't assume you save more before you buy.`;
});
</script>

<template>
  <section class="dash-cash" :class="card?.anyShort ? 'dash-cash--short' : 'dash-cash--ok'" aria-labelledby="cash-card-title" data-cy="dashboard-cash-card">
    <span class="dash-cash__icon" aria-hidden="true">{{ card?.anyShort ? '!' : '✓' }}</span>
    <div class="dash-cash__main">
      <h2 id="cash-card-title" class="dash-cash__title">{{ title }}</h2>
      <!-- One compact line per path: name, a thin bar of how much is covered, and how much is short. -->
      <div class="dash-cash__rows">
        <div v-for="r in rows" :key="r.key" class="dash-cash__row" :data-cy="`dashboard-cash-card-${r.key}`">
          <strong :class="`dash-cash__name--${r.key}`">{{ r.label }}</strong>
          <span class="dash-cash__track" aria-hidden="true"><span class="dash-cash__fill" :class="`dash-cash__fill--${r.key}`" :style="{ width: `${r.barPct}%` }"></span></span>
          <span class="dash-cash__short">{{ r.shortText }}</span>
          <span v-if="r.ofText" class="dash-cash__of">{{ r.ofText }}</span>
        </div>
      </div>
      <p v-if="assumption" class="dash-cash__note mb-0" data-cy="dashboard-cash-card-assumption">{{ assumption }}</p>
    </div>
    <button v-if="card?.anyShort" type="button" class="dash-cash__btn" data-cy="dashboard-cash-card-whatif" @click="emit('jump-whatif')">Try a later year in What if ›</button>
  </section>
</template>

<style scoped>
.dash-cash {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-5);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
/* The icon alone says covered or short. */
.dash-cash__icon { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; }
.dash-cash--ok .dash-cash__icon { background: var(--success-fill); color: var(--success); }
.dash-cash--short .dash-cash__icon { background: var(--warning-fill); color: var(--warning); }
.dash-cash__main { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.dash-cash__title { margin: 0; font-size: 1.0625rem; font-weight: 600; }
.dash-cash__rows { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-6); }
.dash-cash__row { flex: 1 1 240px; display: grid; grid-template-columns: 3.75rem minmax(60px, 1fr) auto; gap: var(--space-3); align-items: center; font-size: 0.9375rem; }
.dash-cash__name--bto { color: var(--dash-bto, var(--path-bto)); }
.dash-cash__name--resale { color: var(--dash-resale, var(--path-resale)); }
.dash-cash__track { display: block; height: 8px; border-radius: var(--radius-pill); background: var(--indigo-tint-strong); overflow: hidden; }
.dash-cash__fill { display: block; height: 100%; border-radius: var(--radius-pill); transform-origin: left; animation: cash-grow 0.9s 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dash-cash { animation: cash-in 0.6s 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dash-cash--short .dash-cash__icon { animation: cash-nudge 0.6s 0.9s ease both; }
@keyframes cash-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes cash-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cash-nudge { 0%, 100% { transform: none; } 30% { transform: scale(1.18); } 60% { transform: rotate(-8deg); } }
@media (prefers-reduced-motion: reduce) { .dash-cash, .dash-cash__fill, .dash-cash__icon { animation: none !important; } }
.dash-cash__fill--bto { background: var(--dash-bto, var(--path-bto)); }
.dash-cash__fill--resale { background: var(--path-resale-bar); }
.dash-cash__short { font-weight: 500; white-space: nowrap; }
/* "S$20,000 of S$111,000 covered", under the bar, spanning the row. */
.dash-cash__of { grid-column: 2 / -1; margin-top: -6px; font-size: 0.8125rem; color: var(--text-secondary); }
.dash-cash__note { font-size: 0.8125rem; color: var(--text-secondary); }
.dash-cash__btn {
  flex: none;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--text-primary);
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  transition: background 0.2s ease;
}
.dash-cash__btn:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); }
.dash-cash__btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
</style>
