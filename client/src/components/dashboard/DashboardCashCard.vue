<script setup>
// Version E, top right: can today's savings pay the cash each path needs up front? Amber when either path is short,
// green when both are covered. "Try a later year" moves focus to the What-if panel. data-cy: CONVENTIONS "Dashboard".
import { computed } from 'vue';
import { cashCard } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  cashSavings: { type: Number, default: null }, // dollars, from the saved plan
});
const emit = defineEmits(['jump-whatif']);
const card = computed(() => cashCard(props.outcomeA, props.outcomeB, props.cashSavings));
const title = computed(() => {
  if (!card.value) return 'Add your cash savings to see if they cover the cash up front';
  if (card.value.bothShort) return "Your savings today don't cover the cash for either flat";
  if (card.value.anyShort) return `Your savings today don't cover the cash for the ${card.value.rows[0].shortCents > 0 ? 'BTO' : 'resale flat'}`;
  return 'Your savings today cover the cash for both flats';
});
const rows = computed(() => (card.value?.rows ?? []).map((r) => ({ ...r, key: r.side === 'a' ? 'bto' : 'resale', label: r.side === 'a' ? 'BTO' : 'Resale' })));
</script>

<template>
  <section class="dash-cash" :class="card?.anyShort ? 'dash-cash--short' : 'dash-cash--ok'" aria-labelledby="cash-card-title" data-cy="dashboard-cash-card">
    <h2 id="cash-card-title" class="dash-cash__title">
      <span aria-hidden="true">{{ card?.anyShort ? '⚠' : '✓' }}</span> {{ title }}
    </h2>
    <p v-if="card?.anyShort" class="text-secondary mb-0">The loans are capped, so the rest is paid in cash. We don't assume you save more before you buy.</p>
    <div v-for="r in rows" :key="r.key" class="dash-cash__row" :data-cy="`dashboard-cash-card-${r.key}`">
      <div class="dash-cash__head"><strong :class="`dash-cash__name--${r.key}`">{{ r.label }}</strong><span>{{ r.shortText }}</span></div>
      <span class="dash-cash__track" aria-hidden="true"><span class="dash-cash__fill" :class="`dash-cash__fill--${r.key}`" :style="{ width: `${r.coveredPct}%` }"></span></span>
      <span class="small text-secondary">{{ r.text }}</span>
    </div>
    <button v-if="card?.anyShort" type="button" class="btn btn-link p-0 align-self-start fw-semibold" data-cy="dashboard-cash-card-whatif" @click="emit('jump-whatif')">Try a later year in What if ›</button>
  </section>
</template>

<style scoped>
.dash-cash { display: flex; flex-direction: column; gap: var(--space-3); height: 100%; padding: clamp(24px, 3vw, 36px); border-radius: var(--radius-lg); }
.dash-cash--short { background: var(--warning-fill); border: 1.5px solid var(--warning-border); }
.dash-cash--ok { background: var(--success-fill); border: 1.5px solid var(--success-border); }
.dash-cash__title { margin: 0; font-size: clamp(1.25rem, 2vw, 1.5rem); font-weight: 600; letter-spacing: -0.01em; }
.dash-cash__row { display: flex; flex-direction: column; gap: var(--space-1); }
.dash-cash__head { display: flex; justify-content: space-between; gap: var(--space-3); }
.dash-cash__name--bto { color: var(--dash-bto); }
.dash-cash__name--resale { color: var(--dash-resale); }
.dash-cash__track { display: block; height: 12px; border-radius: var(--radius-pill); background: rgba(29, 29, 36, 0.08); overflow: hidden; }
.dash-cash__fill { display: block; height: 100%; border-radius: var(--radius-pill); }
.dash-cash__fill--bto { background: var(--dash-bto); }
.dash-cash__fill--resale { background: var(--accent-fill-1); }
</style>
