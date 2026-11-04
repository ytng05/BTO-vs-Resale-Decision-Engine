<script setup>
// "At a glance": one coloured tile per thing that matters (money long-term, then each Side by side row), in the home
// page's tile colours. Each tile says in words which path is better, with both values underneath; hover a tile to
// read what it measures. Under the tiles, a closed "Why does … come out ahead?" bar opens the biggest lines of the
// gap (D34) as a left/right bar chart; "Show all" adds the smaller ones. Hidden when it's too close to call or level.
// Keeps the tested hooks: dashboard-side-by-side, dashboard-sbs-{id}, dashboard-why-toggle, dashboard-why.
import { computed, ref } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { sideBySide } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  horizon: { type: Number, default: null },
  call: { type: Object, default: null },
  gap: { type: Object, default: null }, // gapBreakdown from /api/compare
});

// "S$193,000" -> "S$193k" inside any text.
const short = (text) => String(text ?? '').replace(/S\$(\d{1,3}(?:,\d{3})+)/g, (m, n) => {
  const v = Number(n.replace(/,/g, ''));
  if (v >= 1000000) return `S$${Math.round(v / 100000) / 10}M`;
  if (v >= 1000) return `S$${Math.round(v / 1000)}k`;
  return m;
});

// 24×24 stroke icons, one per tile in order.
const ICONS = [
  'M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 14h1', // cash up front: wallet
  'M4 11l8-7 8 7v9H4zM10 20v-5h4v5', // spent on housing: house
  'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z', // grants: gift
  'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 11h9M18 11v3M21 11v2', // keys: key
];
const THEMES = ['pink', 'amber', 'green', 'indigo'];

const gapCents = computed(() => props.outcomeA.netPositionCents - props.outcomeB.netPositionCents);
// The leader comes from the same verdict as the top of the page (D42), not the raw gap: when it's too close to call
// or level, the section is hidden so it can't ask "Why does BTO come out ahead?" under "Too close to call".
const leader = computed(() => {
  const c = props.call;
  if (!c || c.close || !['bto', 'resale'].includes(c.winner)) return null;
  return c.winner === 'bto' ? 'BTO' : 'resale';
});

const tiles = computed(() => {
  const rows = sideBySide(props.outcomeA, props.outcomeB, props.horizon).filter((r) => r.id !== 'net');
  // Money long-term is left out: the cards at the top already show it.
  return rows.map((r, i) => ({ ...r, icon: ICONS[i % ICONS.length], theme: THEMES[i % THEMES.length] }));
});

const showWhy = ref(false);
const showAllLines = ref(false);
const TOP = 4;
const drivers = computed(() => (props.gap?.lines ?? [])
  .filter((l) => Math.round(Math.abs(l.amountCents ?? 0) / 100) !== 0)
  .sort((x, y) => Math.abs(y.amountCents) - Math.abs(x.amountCents))
  .map((l, i, all) => ({
    ...l,
    helps: l.amountCents > 0 ? 'bto' : 'resale',
    // Bar length, as a share of the biggest line (the list is sorted, so that's the first one).
    pct: Math.max(2, Math.round((Math.abs(l.amountCents) / Math.abs(all[0].amountCents)) * 100)),
    text: formatMoney(Math.abs(l.amountCents) / 100),
  })));
const shownDrivers = computed(() => (showAllLines.value ? drivers.value : drivers.value.slice(0, TOP)));
</script>

<template>
  <div class="glance-wrap">
  <section class="glance" aria-labelledby="glance-heading" data-cy="dashboard-side-by-side">
    <div class="glance__head">
      <h2 id="glance-heading" class="glance__title">At a glance</h2>
      <p class="glance__sub">Who wins on each thing that matters.</p>
    </div>

    <ul class="glance__tiles">
      <li
        v-for="t in tiles"
        :key="t.id"
        class="glance-tile"
        :class="`glance-tile--${t.theme}`"
        tabindex="0"
        :title="t.hint"
        :data-cy="`dashboard-sbs-${t.id}`"
      >
        <span class="glance-tile__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="t.icon" /></svg></span>
        <span class="glance-tile__label">{{ t.label }}</span>
        <strong class="glance-tile__winner" :class="t.favours === 'a' ? 'is-bto' : t.favours === 'b' ? 'is-resale' : ''">{{ short(t.diff) }}</strong>
        <span class="glance-tile__vals">
          <span :class="{ 'is-bto': t.favours === 'a' }"><small>BTO</small> {{ short(t.a) }}</span>
          <span :class="{ 'is-resale': t.favours === 'b' }"><small>Resale</small> {{ short(t.b) }}</span>
        </span>
        <span class="visually-hidden">{{ t.hint }}</span>
      </li>
    </ul>

  </section>

  <!-- "Why": closed until asked. The whole bar is the button, with a question mark and a chevron, so it reads as
       something to open. -->
  <section v-if="leader && drivers.length" class="glance-why" :class="{ 'is-open': showWhy }" aria-labelledby="why-heading">
    <button
      type="button"
      class="glance-why__toggle"
      :aria-expanded="showWhy ? 'true' : 'false'"
      aria-controls="glance-why-body"
      data-cy="dashboard-why-toggle"
      @click="showWhy = !showWhy"
    >
      <span class="glance-why__q" aria-hidden="true">?</span>
      <span class="glance-why__toggle-text">
        <span id="why-heading" class="glance-why__title">Why does {{ leader }} come out ahead?</span>
        <span class="glance-why__hint">{{ showWhy ? 'Hide the reasons' : 'See what pushes the answer each way' }}</span>
      </span>
      <svg class="glance-why__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>

    <div v-if="showWhy" id="glance-why-body" class="glance-why__body" data-cy="dashboard-why">
      <div class="glance-why__axis" aria-hidden="true"><span>Favours resale</span><span>Favours BTO</span></div>
      <div v-for="d in shownDrivers" :key="d.id" class="glance-why__row" :data-cy="`dashboard-driver-${d.id}`">
        <span class="glance-why__label">{{ d.label }}</span>
        <span class="glance-why__chart" aria-hidden="true">
          <span class="glance-why__half glance-why__half--resale"><i v-if="d.helps === 'resale'" :style="{ width: `${d.pct}%` }"></i></span>
          <span class="glance-why__half glance-why__half--bto"><i v-if="d.helps === 'bto'" :style="{ width: `${d.pct}%` }"></i></span>
        </span>
        <span class="glance-why__amount text-numeric" :class="`is-${d.helps}`">{{ d.text }}<span class="visually-hidden"> in favour of {{ d.helps === 'bto' ? 'BTO' : 'resale' }}</span></span>
      </div>
      <div class="glance-why__row glance-why__row--total">
        <span>Total gap</span>
        <strong class="text-numeric" :class="`is-${gapCents > 0 ? 'bto' : 'resale'}`">{{ formatMoney(Math.abs(gapCents) / 100) }} in favour of {{ leader }}</strong>
      </div>
      <div class="glance-why__foot">
        <button
          v-if="drivers.length > TOP"
          type="button"
          class="glance__why-btn"
          :aria-expanded="showAllLines ? 'true' : 'false'"
          data-cy="dashboard-why-all"
          @click="showAllLines = !showAllLines"
        >{{ showAllLines ? 'Show fewer' : `Show all ${drivers.length}` }}</button>
        <span class="small text-secondary">Grants are already inside each net position.</span>
      </div>
    </div>
  </section>
  </div>
</template>

<style scoped>
.glance-wrap { display: flex; flex-direction: column; gap: clamp(40px, 5vw, 64px); }
.glance { display: flex; flex-direction: column; gap: var(--space-6); }
.glance__head { text-align: center; }
.glance__title { margin: 0; font-family: var(--font-heading); font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 600; letter-spacing: -0.03em; }
.glance__sub { margin: var(--space-1) 0 0; color: var(--text-secondary); }

/* Tiles: as many per row as fit (5 on a laptop, 2 on a tablet, 1 on a phone). */
.glance__tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
.glance-tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: var(--tile-bg);
  cursor: default;
  transition: translate 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, border-color 0.25s ease;
}
.glance-tile:hover, .glance-tile:focus-visible { translate: 0 -6px; border-color: var(--tile-well); box-shadow: 0 14px 30px rgba(60, 64, 90, 0.12); outline: none; }
.glance-tile--pink { --tile-bg: var(--accent-tint); --tile-well: var(--accent-fill-2); --tile-ink: var(--color-berry); }
.glance-tile--indigo { --tile-bg: var(--indigo-tint); --tile-well: var(--indigo-tint-strong); --tile-ink: var(--indigo); }
.glance-tile--green { --tile-bg: color-mix(in srgb, var(--success-fill) 50%, var(--bg-surface)); --tile-well: var(--success-fill); --tile-ink: var(--success); }
.glance-tile--amber { --tile-bg: color-mix(in srgb, var(--warning-fill) 50%, var(--bg-surface)); --tile-well: var(--warning-fill); --tile-ink: var(--warning); }
.glance-tile__icon { width: 40px; height: 40px; border-radius: 12px; background: var(--tile-well); display: grid; place-items: center; }
.glance-tile__icon svg { width: 20px; height: 20px; fill: none; stroke: var(--tile-ink); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.glance-tile__label { font-weight: 600; }
.glance-tile__winner { font-size: 1.0625rem; line-height: 1.3; color: var(--text-secondary); }
.glance-tile__vals { display: flex; justify-content: space-between; gap: var(--space-2); margin-top: auto; padding-top: var(--space-2); border-top: 1px solid rgba(29, 29, 36, 0.06); font-size: 0.875rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.glance-tile__vals small { font-size: 0.75rem; }
.is-bto { color: var(--dash-bto) !important; font-weight: 600; }
.is-resale { color: var(--dash-resale) !important; font-weight: 600; }

.glance__why-btn { padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-surface); font-weight: 500; transition: background 0.2s ease, border-color 0.2s ease; }
.glance__why-btn:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); }
.glance__why-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.glance-why { border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); background: var(--bg-surface); overflow: hidden; transition: border-color 0.25s ease, box-shadow 0.25s ease; }
.glance-why:hover, .glance-why.is-open { border-color: var(--accent-fill-1); box-shadow: 0 14px 34px rgba(240, 138, 182, 0.16); }
.glance-why__toggle { width: 100%; display: flex; align-items: center; gap: var(--space-4); padding: var(--space-5) clamp(20px, 3vw, 32px); border: 0; background: transparent; color: inherit; text-align: left; transition: background 0.2s ease; }
.glance-why__toggle:hover { background: var(--accent-tint); }
.glance-why__toggle:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -4px; }
.glance-why__q { flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--accent-fill-2); color: var(--color-berry); display: grid; place-items: center; font-size: 1.25rem; font-weight: 700; }
.glance-why__toggle-text { flex: 1; display: flex; flex-direction: column; }
.glance-why__hint { font-size: 0.9375rem; color: var(--text-secondary); }
.glance-why__chev { flex: none; width: 24px; height: 24px; fill: none; stroke: var(--text-primary); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.3s ease; }
.glance-why.is-open .glance-why__chev { transform: rotate(180deg); }
.glance-why__body { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 clamp(20px, 3vw, 32px) clamp(20px, 3vw, 32px); animation: glance-open 0.3s ease both; }
@keyframes glance-open { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
/* The bars grow out from the middle line when the reasons open. */
.glance-why__half i { animation: glance-grow 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.glance-why__half--resale i { transform-origin: right; }
.glance-why__half--bto i { transform-origin: left; }
@keyframes glance-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.glance-why__title { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 600; }
.glance-why__foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); margin-top: var(--space-3); }
.glance-why__lead { color: var(--text-secondary); }
/* Diverging bars: resale's lines grow left from the middle, BTO's grow right (as on the Results page). */
.glance-why__row { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 2fr) minmax(0, 0.9fr); gap: var(--space-3); align-items: center; }
/* The axis labels sit over the two halves of the chart column. */
.glance-why__axis { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr); gap: 0 var(--space-3); font-size: 0.75rem; color: var(--text-secondary); }
.glance-why__axis span:first-child { grid-column: 2; text-align: right; display: block; padding-right: var(--space-2); }
.glance-why__axis span:last-child { grid-column: 3; padding-left: var(--space-2); }
.glance-why__row { padding: var(--space-2) 0; border-top: 1px solid var(--border-subtle); font-size: 0.9375rem; }
.glance-why__chart { display: grid; grid-template-columns: 1fr 1fr; height: 14px; }
.glance-why__half { display: flex; }
.glance-why__half--resale { justify-content: flex-end; border-right: 1.5px solid var(--text-primary); }
.glance-why__half i { display: block; height: 100%; }
.glance-why__half--resale i { background: var(--color-pink-deep); border-radius: 4px 0 0 4px; }
.glance-why__half--bto i { background: var(--text-primary); border-radius: 0 4px 4px 0; }
.glance-why__amount { text-align: right; }
.glance-why__row--total { font-weight: 700; border-top: 2px solid var(--text-primary); }
.glance-why__row--total strong { grid-column: 2 / 4; text-align: right; }
.glance-why__row--total { padding-top: var(--space-3); }
@media (max-width: 575.98px) {
  .glance-why__row { grid-template-columns: minmax(0, 1fr) auto; }
  .glance-why__chart { grid-column: 1 / -1; grid-row: 2; }
  .glance-why__axis { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .glance-why__body, .glance-why__half i { animation: none; }
  .glance-why__chev { transition: none; }
  .glance-tile { transition: none; }
  .glance-tile:hover, .glance-tile:focus-visible { translate: none; }
}
</style>