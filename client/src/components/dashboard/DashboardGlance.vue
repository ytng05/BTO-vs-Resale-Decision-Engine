<script setup>
// "At a glance": one coloured tile per thing that matters (each Side by side row except net position, which the
// answer card shows), in the home page's tile colours. Each tile says in words which path is better, with both values
// underneath and, written out, what it measures. The grants tile names no side: grants are already inside net
// position (D1), so a bigger grant isn't a win on its own. Figures are rounded to S$1,000 (utils/format.js) and shown
// in full. The tiles are live: they move with every What-if slider.
// "Why … comes out ahead" moved to Results (5 Nov 2026), beside the answer it explains, so the pages don't repeat.
// Keeps the tested hooks: dashboard-side-by-side, dashboard-sbs-{id}.
import { computed } from 'vue';
import { sideBySide } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  horizon: { type: Number, default: null },
  call: { type: Object, default: null },
});


// 24×24 stroke icons, one per tile in order.
const ICONS = [
  'M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 14h1', // cash up front: wallet
  'M4 11l8-7 8 7v9H4zM10 20v-5h4v5', // spent on housing: house
  'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z', // grants: gift
  'M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 11h9M18 11v3M21 11v2', // keys: key
];
const THEMES = ['pink', 'amber', 'green', 'indigo'];

const tiles = computed(() => {
  const rows = sideBySide(props.outcomeA, props.outcomeB, props.horizon).filter((r) => r.id !== 'net');
  // Money long-term is left out: the cards at the top already show it.
  return rows.map((r, i) => ({
    ...r,
    // Grants are counted inside net position (D1): the tile says so instead of naming the path with more.
    ...(r.id === 'grants' ? { favours: null, diff: 'Already counted in net position' } : {}),
    icon: ICONS[i % ICONS.length],
    theme: THEMES[i % THEMES.length],
  }));
});

</script>

<template>
  <div class="glance-wrap">
  <section class="glance" aria-labelledby="glance-heading" data-cy="dashboard-side-by-side">
    <div class="section-head">
      <h2 id="glance-heading" class="section-head__title">At a glance</h2>
      <p class="section-head__sub">Who wins on each thing that matters.</p>
    </div>

    <ul class="glance__tiles">
      <li
        v-for="t in tiles"
        :key="t.id"
        class="glance-tile"
        :class="`glance-tile--${t.theme}`"
        :data-cy="`dashboard-sbs-${t.id}`"
      >
        <span class="glance-tile__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="t.icon" /></svg></span>
        <span class="glance-tile__label">{{ t.label }}</span>
        <strong class="glance-tile__winner" :class="t.favours === 'a' ? 'is-bto' : t.favours === 'b' ? 'is-resale' : ''">{{ t.diff }}</strong>
        <span class="glance-tile__vals">
          <span :class="{ 'is-bto': t.favours === 'a' }"><small>BTO</small> {{ t.a }}</span>
          <span :class="{ 'is-resale': t.favours === 'b' }"><small>Resale</small> {{ t.b }}</span>
        </span>
        <span class="glance-tile__hint">{{ t.hint }}</span>
      </li>
    </ul>

  </section>

  </div>
</template>

<style scoped>
.glance-wrap { display: flex; flex-direction: column; gap: clamp(40px, 5vw, 64px); }
.glance { display: flex; flex-direction: column; gap: var(--space-6); }
/* The heading uses the shared .section-head (_components.scss), left-aligned like every other section. */
/* What the tile measures, written out (it used to be a hover tooltip, which phones and screen readers miss). */
.glance-tile__hint { font-size: 0.8125rem; line-height: 1.4; color: var(--text-secondary); }

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
/* No hover lift: the tiles aren't buttons or links, so they shouldn't look clickable. */
.glance-tile--pink { --tile-bg: var(--accent-tint); --tile-well: var(--accent-fill-2); --tile-ink: var(--color-berry); }
.glance-tile--indigo { --tile-bg: var(--indigo-tint); --tile-well: var(--indigo-tint-strong); --tile-ink: var(--indigo); }
.glance-tile--green { --tile-bg: color-mix(in srgb, var(--success-fill) 50%, var(--bg-surface)); --tile-well: var(--success-fill); --tile-ink: var(--success); }
.glance-tile--amber { --tile-bg: color-mix(in srgb, var(--warning-fill) 50%, var(--bg-surface)); --tile-well: var(--warning-fill); --tile-ink: var(--warning); }
.glance-tile__icon { width: 40px; height: 40px; border-radius: 12px; background: var(--tile-well); display: grid; place-items: center; }
.glance-tile__icon svg { width: 20px; height: 20px; fill: none; stroke: var(--tile-ink); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.glance-tile__label { font-weight: 600; }
.glance-tile__winner { font-size: 1.0625rem; line-height: 1.3; color: var(--text-secondary); }
.glance-tile__vals { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-1) var(--space-2); margin-top: auto; padding-top: var(--space-2); border-top: 1px solid rgba(29, 29, 36, 0.06); font-size: 0.875rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.glance-tile__vals small { font-size: 0.75rem; }
.glance-tile__vals > span { white-space: nowrap; }
.glance-tile { min-width: 0; }
.glance-tile__winner { overflow-wrap: anywhere; text-wrap: balance; }
.is-bto { color: var(--dash-bto) !important; font-weight: 600; }
.is-resale { color: var(--dash-resale) !important; font-weight: 600; }

@keyframes glance-open { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
/* The bars grow out from the middle line when the reasons open. */
@keyframes glance-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
/* Diverging bars: resale's lines grow left from the middle, BTO's grow right (as on the Results page). */
/* The axis labels sit over the two halves of the chart column. */

@media (prefers-reduced-motion: reduce) {
  .glance-tile { transition: none; }
}
</style>
