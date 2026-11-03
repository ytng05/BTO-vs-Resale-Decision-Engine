<script setup>
// Version E: "Side by side". The figures that decide the choice, rounded to S$1,000, each row saying in words which
// path it favours, in that path's colour. Grants are never favoured: they're already inside each net position (D1).
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
const rows = computed(() => sideBySide(props.outcomeA, props.outcomeB, props.horizon));
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
    <div>
      <h2 id="sbs-heading" class="dash-panel__title">Side by side</h2>
      <p class="text-secondary mb-0">Each row says which path it favours, in that path's colour.</p>
    </div>
    <div class="dash-sbs" role="table" aria-label="BTO and resale side by side">
      <div class="dash-sbs__row dash-sbs__row--head" role="row">
        <span role="columnheader"><span class="visually-hidden">Figure</span></span>
        <span role="columnheader" data-cy="dashboard-summary-bto"><span class="dash-chip dash-chip--bto">BTO</span></span>
        <span role="columnheader" data-cy="dashboard-summary-resale"><span class="dash-chip dash-chip--resale">Resale</span></span>
        <span role="columnheader" class="dash-sbs__ahead-head">Which is ahead</span>
      </div>
      <div v-for="r in rows" :key="r.id" class="dash-sbs__row" role="row" :data-cy="`dashboard-sbs-${r.id}`">
        <span role="rowheader" class="dash-sbs__label">
          <strong><Term v-if="r.id === 'net'" id="net-position">{{ r.label }}</Term><template v-else>{{ r.label }}</template></strong>
          <small class="text-secondary">{{ r.hint }}</small>
        </span>
        <span role="cell" class="dash-sbs__cell text-numeric" :class="{ 'is-bto': r.favours === 'a' }">{{ r.a }}</span>
        <span role="cell" class="dash-sbs__cell text-numeric" :class="{ 'is-resale': r.favours === 'b' }">{{ r.b }}</span>
        <span role="cell" class="dash-sbs__ahead">
          <span class="dash-chip" :class="r.favours === 'a' ? 'dash-chip--bto' : r.favours === 'b' ? 'dash-chip--resale' : 'dash-chip--none'">{{ r.diff }}</span>
        </span>
      </div>
    </div>

    <template v-if="leader && drivers.length">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm align-self-start"
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
.dash-sbs { border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
.dash-sbs__row { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.35fr); align-items: stretch; border-top: 1px solid var(--border-subtle); }
.dash-sbs__row--head { border-top: 0; background: var(--bg-page); }
.dash-sbs__row > * { padding: var(--space-4) var(--space-4); display: flex; align-items: center; }
.dash-sbs__label { flex-direction: column; align-items: flex-start !important; justify-content: center; gap: 2px; }
.dash-sbs__label strong { font-weight: 600; }
.dash-sbs__cell { font-size: 1.0625rem; }
.dash-sbs__cell.is-bto { background: var(--dash-bto-pale); color: var(--dash-bto); font-weight: 700; }
.dash-sbs__cell.is-resale { background: var(--dash-resale-pale); color: var(--dash-resale); font-weight: 700; }
.dash-sbs__ahead-head { color: var(--text-secondary); font-weight: 600; }
.dash-chip { display: inline-block; padding: 0.25rem 0.75rem; border-radius: var(--radius-pill); font-size: 0.875rem; font-weight: 600; }
.dash-chip--bto { background: var(--dash-bto-tint); color: var(--dash-bto); }
.dash-chip--resale { background: var(--dash-resale-tint); color: var(--dash-resale); }
.dash-chip--none { background: var(--bg-page); color: var(--text-secondary); }
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
