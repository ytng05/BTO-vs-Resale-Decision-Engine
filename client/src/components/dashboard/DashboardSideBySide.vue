<script setup>
// Version E: "Side by side". The figures that decide the choice, rounded to S$1,000, each row saying in words which
// path it favours, in that path's colour. Net position is left out here: the verdict at the top already shows it.
// Each row's explanation sits behind a small (i), so the table stays short. Grants are never favoured: they're already inside each net position (D1).
// "Why does … end ahead?" opens the biggest lines of the gap (gapBreakdown, D34) and the total.
import { computed, ref } from 'vue';
import Term from '../Term.vue';
import { formatMoney } from '../../utils/format.js';
import { sideBySide } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  horizon: { type: Number, default: null },
  gap: { type: Object, default: null }, // gapBreakdown from /api/compare
});
const rows = computed(() => sideBySide(props.outcomeA, props.outcomeB, props.horizon).filter((r) => r.id !== 'net'));
// "BTO ahead by S$100,000" -> "BTO ahead by S$100k": shorter pills.
const short = (text) => String(text ?? '').replace(/S\$(\d{1,3}(?:,\d{3})+)/g, (m, n) => {
  const v = Number(n.replace(/,/g, ''));
  if (v >= 1000000) return `S$${Math.round(v / 100000) / 10}M`;
  if (v >= 1000) return `S$${Math.round(v / 1000)}k`;
  return m;
});
const gapCents = computed(() => props.outcomeA.netPositionCents - props.outcomeB.netPositionCents);
const leader = computed(() => (gapCents.value === 0 ? null : gapCents.value > 0 ? 'BTO' : 'resale'));
const showWhy = ref(false);
const drivers = computed(() => (props.gap?.lines ?? [])
  .filter((l) => Math.round(Math.abs(l.amountCents ?? 0) / 100) !== 0)
  .sort((x, y) => Math.abs(y.amountCents) - Math.abs(x.amountCents))
  .map((l) => ({ ...l, helps: l.amountCents > 0 ? 'bto' : 'resale', text: `Helps ${l.amountCents > 0 ? 'BTO' : 'resale'} by ${formatMoney(Math.abs(l.amountCents) / 100)}` })));
const topDrivers = computed(() => drivers.value.slice(0, 3));
</script>

<template>
  <section class="dash-panel" aria-labelledby="sbs-heading" data-cy="dashboard-side-by-side">
    <h2 id="sbs-heading" class="dash-panel__title">Side by side</h2>
    <div class="dash-sbs" role="table" aria-label="BTO and resale side by side">
      <div class="dash-sbs__row dash-sbs__row--head" role="row">
        <span role="columnheader"><span class="visually-hidden">Figure</span></span>
        <span role="columnheader" data-cy="dashboard-summary-bto"><span class="dash-head dash-head--bto">BTO</span></span>
        <span role="columnheader" data-cy="dashboard-summary-resale"><span class="dash-head dash-head--resale">Resale</span></span>
        <span role="columnheader" class="dash-sbs__ahead-head">Which is ahead</span>
      </div>
      <div v-for="r in rows" :key="r.id" class="dash-sbs__row" role="row" :data-cy="`dashboard-sbs-${r.id}`">
        <span role="rowheader" class="dash-sbs__label">
          <span class="dash-sbs__name">
            <Term v-if="r.id === 'net'" id="net-position">{{ r.label }}</Term><template v-else>{{ r.label }}</template>
            <span v-if="r.hint" class="dash-sbs__info" tabindex="0" :title="r.hint" :aria-label="r.hint">i</span>
          </span>
        </span>
        <span role="cell" class="dash-sbs__cell text-numeric" :class="{ 'is-bto': r.favours === 'a' }">{{ r.a }}</span>
        <span role="cell" class="dash-sbs__cell text-numeric" :class="{ 'is-resale': r.favours === 'b' }">{{ r.b }}</span>
        <span role="cell" class="dash-sbs__ahead">
          <span class="dash-chip" :class="r.favours === 'a' ? 'dash-chip--bto' : r.favours === 'b' ? 'dash-chip--resale' : 'dash-chip--none'" :title="r.diff">{{ short(r.diff) }}</span>
        </span>
      </div>
    </div>

    <template v-if="leader && drivers.length">
      <button
        type="button"
        class="dash-why-btn align-self-start"
        :aria-expanded="showWhy ? 'true' : 'false'"
        aria-controls="sbs-why"
        data-cy="dashboard-why-toggle"
        @click="showWhy = !showWhy"
      >{{ showWhy ? `Hide why ${leader} ends ahead` : `Why does ${leader} end ahead?` }}</button>
      <div v-if="showWhy" id="sbs-why" class="dash-why" data-cy="dashboard-why">
        <p class="mb-0 fw-semibold">The three biggest reasons</p>
        <div v-for="d in topDrivers" :key="d.id" class="dash-why__top" :data-cy="`dashboard-driver-${d.id}`">
          <span>{{ d.label }}</span><strong :class="`dash-why__amount--${d.helps}`">{{ d.text }}</strong>
        </div>
        <details class="dash-why__all">
          <summary>Every line ({{ drivers.length }})</summary>
          <div v-for="d in drivers" :key="d.id" class="dash-why__line"><span>{{ d.label }}</span><span class="text-numeric">{{ d.text }}</span></div>
        </details>
        <div class="dash-why__line dash-why__line--total">
          <span>Total gap</span><strong :class="`dash-why__amount--${gapCents > 0 ? 'bto' : 'resale'}`">{{ formatMoney(Math.abs(gapCents) / 100) }} in favour of {{ leader }}</strong>
        </div>
        <p class="small text-secondary mb-0">The lines add up exactly to the gap. Grants have no line: they're already inside each net position.</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dash-sbs { border-top: 1px solid var(--border-subtle); }
.dash-sbs__row { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.25fr); align-items: stretch; border-top: 1px solid var(--border-subtle); transition: background 0.15s ease; }
.dash-sbs__row:not(.dash-sbs__row--head):hover { background: var(--accent-tint); }
.dash-sbs__row--head { border-top: 0; }
.dash-sbs__row--head > * { padding-top: var(--space-2) !important; padding-bottom: var(--space-2) !important; font-size: 0.875rem; }
.dash-sbs__row > * { padding: var(--space-3) var(--space-3); display: flex; align-items: center; }
.dash-sbs__label { flex-direction: column; align-items: flex-start !important; justify-content: center; gap: 2px; }
/* The (i) sits right after the label's last word, even when the label wraps. */
.dash-sbs__name { font-weight: 500; }
.dash-sbs__info { vertical-align: 1px; margin-left: 6px; }
/* The (i): hover or focus it to read what the row means. */
.dash-sbs__info { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--border-strong, var(--border)); display: inline-grid; place-items: center; font-size: 0.6875rem; font-weight: 700; font-style: italic; color: var(--text-secondary); cursor: help; }
.dash-sbs__info:hover, .dash-sbs__info:focus-visible { border-color: var(--text-primary); color: var(--text-primary); outline: none; }
.dash-sbs__cell { font-size: 1.0625rem; }
.dash-sbs__cell.is-bto { color: var(--dash-bto); font-weight: 700; }
.dash-sbs__cell.is-resale { color: var(--dash-resale); font-weight: 700; }
.dash-sbs__ahead-head { color: var(--text-secondary); font-weight: 500; }
.dash-head { font-weight: 600; }
.dash-head--bto { color: var(--dash-bto); }
.dash-head--resale { color: var(--dash-resale); }
/* "Which is ahead": coloured text with a small arrow, no pill. */
.dash-chip { font-size: 0.9375rem; font-weight: 600; line-height: 1.35; }
.dash-chip--bto::before, .dash-chip--resale::before { content: "● "; font-size: 0.6em; vertical-align: 2px; }
.dash-why-btn { padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-surface); font-size: 0.9375rem; font-weight: 500; transition: background 0.2s ease, border-color 0.2s ease; }
.dash-why-btn:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); }
.dash-why-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.dash-chip--bto { color: var(--dash-bto); }
.dash-chip--resale { color: var(--dash-resale); }
.dash-chip--none { color: var(--text-secondary); font-weight: 500; }
.dash-why { display: flex; flex-direction: column; gap: var(--space-2); }
.dash-why__top { display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--bg-page); border: 1px solid var(--border-subtle); }
.dash-why__amount--bto { color: var(--dash-bto); }
.dash-why__amount--resale { color: var(--dash-resale); }
.dash-why__all summary { cursor: pointer; font-weight: 500; padding: var(--space-2) 0; }
.dash-why__line { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) 0; border-top: 1px solid var(--border-subtle); font-size: 0.9375rem; }
.dash-why__line--total { font-weight: 700; }
@media (max-width: 767.98px) {
  /* Phones: the label on its own line, then BTO | resale, then which is ahead. */
  .dash-sbs__row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .dash-sbs__label, .dash-sbs__ahead { grid-column: 1 / -1; }
  .dash-sbs__row--head > :first-child, .dash-sbs__ahead-head { display: none !important; }
  .dash-sbs__label { padding-bottom: 0 !important; }
  .dash-sbs__ahead { padding-top: 0 !important; }
  .dash-sbs__row > * { padding: var(--space-3); }
}
</style>