<script setup>
// Results, "Would the answer change?" (D33, D35, D40, D43). On the page: a strip with how sure the answer is in one
// line ("BTO stays ahead in all 54 futures we tested"), then the server's exact break-even sentence and BTO price
// sentence, always visible (D35, D40, D43), with the "break-even" term and the note that it is not a prediction of
// prices. "See how sure" opens a pop-up with the pictures only, so nothing is said twice:
//  - flat prices and incomes: the flip point as a line with "You" on it when the answer flips inside -2% to 8% a year
//    at the plan's income growth (priceFlip, as on the Dashboard's slider); otherwise a small map of every
//    combination tested, "You" outlined, each square read out on hover; "See every combination" opens the full,
//    keyboard-accessible heatmap on the page;
//  - the BTO price: HDB's range for the launch, the price used, and the price BTO stays ahead up to (D40).
// The pop-up is a dialog: focus moves into it, Esc or the backdrop closes it, focus returns to the button. It prints
// with the page. Hooks: results-breakeven, results-confidence-headline, results-breakeven-sentence,
// results-bto-price-breakeven, results-heatmap-open (on the page), results-confidence-open, -dialog, -close,
// -grid-open (the same jump, from inside the pop-up), results-flip-line.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import Term from './Term.vue';
import { formatMoney, formatPercent } from '../utils/format.js';
import { priceFlip } from '../utils/dashboardSummary.js';

const props = defineProps({
  result: { type: Object, required: true }, // the /api/compare response
  priceGrowth: { type: Number, default: null }, // the plan's annual flat price growth (fraction)
  incomeGrowth: { type: Number, default: null }, // the plan's annual income growth (fraction)
  horizonYear: { type: Number, default: null },
  moreOpen: { type: Boolean, default: false }, // the pop-up is open (printing opens it)
});
const emit = defineEmits(['open-grid', 'update:moreOpen']);

// ---- How sure: a count over every combination tested --------------------------------------------------------
const cells = computed(() => (props.result.grid ?? []).flat());
const counts = computed(() => ({
  a: cells.value.filter((c) => c.winner === 'A').length,
  b: cells.value.filter((c) => c.winner === 'B').length,
  all: cells.value.length,
}));
const headline = computed(() => {
  const { a, b, all } = counts.value;
  if (!all) return null;
  if (a === all) return { tone: 'bto', strong: `BTO stays ahead in all ${all} futures we tested`, rest: 'Whatever happens to flat prices and incomes in that range, the answer holds.' };
  if (b === all) return { tone: 'resale', strong: `Resale stays ahead in all ${all} futures we tested`, rest: 'Whatever happens to flat prices and incomes in that range, the answer holds.' };
  return { tone: 'mixed', strong: `BTO ahead in ${a} of ${all} futures we tested, resale in ${b}`, rest: 'So the answer depends on how fast flat prices grow. The line below shows where it flips.' };
});

// ---- Flat prices and incomes ---------------------------------------------------------------------------------
const FLIP_LO = -2;
const FLIP_HI = 8;
const flipLine = computed(() => {
  const f = priceFlip(props.result, props.incomeGrowth, FLIP_LO, FLIP_HI);
  if (!f) return null;
  const pos = (v) => Math.min(100, Math.max(0, ((v - FLIP_LO) / (FLIP_HI - FLIP_LO)) * 100));
  const you = Math.round((props.priceGrowth ?? 0) * 1000) / 10;
  const above = f.winnerAbove;
  const below = above === 'BTO' ? 'Resale' : 'BTO';
  return {
    at: pos(f.atPct), atPct: f.atPct, approx: f.approx, you, youPos: pos(you), above, below,
    aboveKey: above === 'BTO' ? 'bto' : 'resale', belowKey: below === 'BTO' ? 'bto' : 'resale',
    youSide: you > f.atPct ? above : below,
  };
});

// The small map: rows of income growth (highest at the top), columns of price growth, as the full heatmap draws them.
const near = (x, y) => Math.abs(x - y) < 1e-9;
const youCell = computed(() => {
  let best = null;
  cells.value.forEach((c) => {
    const d = Math.abs(c.annualPriceGrowth - (props.priceGrowth ?? 0)) + Math.abs(c.annualIncomeGrowth - (props.incomeGrowth ?? 0));
    if (!best || d < best.d) best = { c, d };
  });
  return best?.c ?? null;
});
const mapRows = computed(() => [...(props.result.grid ?? [])].reverse());
const priceAxis = computed(() => {
  const row = props.result.grid?.[0] ?? [];
  return row.length ? [row[0].annualPriceGrowth, row[row.length - 1].annualPriceGrowth] : null;
});
const incomeAxis = computed(() => {
  const g = props.result.grid ?? [];
  return g.length ? [g[0][0]?.annualIncomeGrowth, g[g.length - 1][0]?.annualIncomeGrowth] : null;
});
const describe = (c) => {
  const where = `Flat prices ${formatPercent(c.annualPriceGrowth)} a year, incomes ${formatPercent(c.annualIncomeGrowth)}`;
  if (c.winner === 'TIE') return `${where}: about level.`;
  return `${where}: ${c.winner === 'A' ? 'BTO' : 'resale'} ahead by ${formatMoney(Math.abs(c.marginCents) / 100)}.`;
};
const hovered = ref(null);
const mapLine = computed(() => {
  const c = hovered.value ?? youCell.value;
  if (!c) return '';
  const isYou = youCell.value && near(c.annualPriceGrowth, youCell.value.annualPriceGrowth) && near(c.annualIncomeGrowth, youCell.value.annualIncomeGrowth);
  return `${isYou ? 'Your plan. ' : ''}${describe(c)}`;
});

// ---- The BTO price (D40) -------------------------------------------------------------------------------------
const priceBar = computed(() => {
  const p = props.result.btoProjectA;
  const be = props.result.btoPriceBreakEven;
  const used = props.result.resolvedA?.purchasePriceCents;
  if (!p?.priceMinCents || !p?.priceMaxCents || typeof used !== 'number' || typeof be?.priceCents !== 'number') return null;
  const vals = [p.priceMinCents, p.priceMaxCents, used, be.priceCents];
  const lo = Math.min(...vals) * 0.85;
  const hi = Math.max(...vals) * 1.1;
  const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const k = (cents) => formatMoney(Math.round(cents / 100 / 1000) * 1000);
  return {
    flip: pos(be.priceCents), rangeL: pos(p.priceMinCents), rangeR: pos(p.priceMaxCents), used: pos(used),
    flipText: k(be.priceCents), rangeText: `${k(p.priceMinCents)}–${k(p.priceMaxCents)}`, usedText: formatMoney(used / 100),
    inRange: be.priceCents > p.priceMaxCents,
  };
});

// ---- The pop-up -----------------------------------------------------------------------------------------------
const opener = ref(null);
const closeBtn = ref(null);
function open() { emit('update:moreOpen', true); }
function close() {
  emit('update:moreOpen', false);
  nextTick(() => opener.value?.focus());
}
function onKey(e) { if (e.key === 'Escape') close(); }
watch(() => props.moreOpen, (isOpen) => {
  document.body.classList.toggle('conf-modal-open', isOpen);
  if (isOpen) {
    window.addEventListener('keydown', onKey);
    nextTick(() => closeBtn.value?.focus());
  } else {
    window.removeEventListener('keydown', onKey);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.body.classList.remove('conf-modal-open');
});
// "See every combination": close the pop-up first, then the page opens the heatmap section.
function seeAll() {
  emit('update:moreOpen', false);
  emit('open-grid');
}

</script>

<template>
  <section class="conf" aria-labelledby="conf-title" data-cy="results-breakeven">
    <!-- The strip on the page -->
    <div class="conf__strip">
      <span class="conf__tick" :class="headline ? `is-${headline.tone}` : ''" aria-hidden="true">{{ headline && headline.tone === 'mixed' ? '≈' : '✓' }}</span>
      <div class="conf__strip-text">
        <h2 id="conf-title" class="conf__title">Would the answer change?</h2>
        <p v-if="headline" class="conf__headline" :class="`is-${headline.tone}`" data-cy="results-confidence-headline">
          <strong>{{ headline.strong }}.</strong>
        </p>
      </div>
      <button ref="opener" type="button" class="conf__open d-print-none" aria-haspopup="dialog" data-cy="results-confidence-open" @click="open">
        See how sure <span aria-hidden="true">→</span>
      </button>
      <!-- The exact sentences, always on the page (D35, D40, D43). -->
      <div class="conf__facts">
        <p v-if="result.breakEvenSentence" class="conf__sentence" data-cy="results-breakeven-sentence">{{ result.breakEvenSentence }}</p>
        <p v-if="result.btoPriceSentence" class="conf__sentence" data-cy="results-bto-price-breakeven">{{ result.btoPriceSentence }}</p>
        <p class="conf__note mb-0">
          The <Term id="break-even">break-even</Term> line is not a prediction of prices.
          <button type="button" class="conf__link conf__link--inline d-print-none" data-cy="results-heatmap-open" @click="seeAll">See every combination</button>
        </p>
      </div>
    </div>

    <!-- The pop-up. Teleported to <body> so it sits above everything; printed as part of the page. -->
    <Teleport to="body">
      <div v-show="moreOpen" class="conf-modal" data-cy="results-confidence-dialog-wrap" @click.self="close">
        <div class="conf-modal__box" role="dialog" aria-modal="true" aria-labelledby="conf-modal-title" data-cy="results-confidence-dialog">
          <div class="conf-modal__head">
            <div>
              <h2 id="conf-modal-title" class="conf-modal__title">How sure is this answer?</h2>
              <p v-if="headline" class="conf-modal__sub mb-0">{{ headline.strong }}. {{ headline.rest }}</p>
            </div>
            <button ref="closeBtn" type="button" class="conf-modal__close d-print-none" aria-label="Close" data-cy="results-confidence-close" @click="close">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
            </button>
          </div>

    <div class="conf__grid" :class="{ 'is-two': priceBar }">
      <!-- Flat prices and incomes -->
      <div class="conf__panel">
        <h3 class="conf__panel-title">If flat prices and incomes grow differently</h3>

        <div v-if="flipLine" class="flipline" data-cy="results-flip-line">
          <p class="flipline__lead">
            <strong>{{ flipLine.below }} ahead below {{ flipLine.approx ? 'about ' : '' }}{{ flipLine.atPct }}% flat price growth a year, {{ flipLine.above === 'BTO' ? 'BTO' : 'resale' }} above.</strong>
            Your plan assumes {{ flipLine.you }}%, so {{ flipLine.youSide === 'BTO' ? 'BTO' : 'resale' }} is ahead.
          </p>
          <div class="flipline__track" aria-hidden="true">
            <span class="flipline__zone" :class="`is-${flipLine.belowKey}`" :style="{ left: 0, width: `${flipLine.at}%` }">{{ flipLine.below }}</span>
            <span class="flipline__zone is-right" :class="`is-${flipLine.aboveKey}`" :style="{ left: `${flipLine.at}%`, right: 0 }">{{ flipLine.above }}</span>
            <span class="flipline__you" :style="{ left: `${flipLine.youPos}%` }">You {{ flipLine.you }}%</span>
          </div>
          <div class="conf__scale" aria-hidden="true"><span>{{ FLIP_LO }}%</span><span>{{ FLIP_HI }}% a year</span></div>
        </div>

        <!-- One square per future tested; hover one to read it. The full heatmap is the accessible version. -->
        <div v-else-if="cells.length" class="minimap">
          <div class="minimap__frame" @mouseleave="hovered = null">
            <span class="minimap__y" aria-hidden="true">Income growth ↑</span>
            <div class="minimap__cells" :style="{ gridTemplateColumns: `repeat(${mapRows[0].length}, 1fr)` }" aria-hidden="true">
              <template v-for="(row, r) in mapRows" :key="r">
                <span
                  v-for="(c, i) in row"
                  :key="`${r}-${i}`"
                  class="minimap__cell"
                  :class="[`is-${c.winner.toLowerCase()}`, { 'is-you': youCell === c, 'is-hover': hovered === c }]"
                  :style="{ animationDelay: `${(r + i) * 18}ms` }"
                  @mouseenter="hovered = c"
                ></span>
              </template>
            </div>
            <span class="minimap__x" aria-hidden="true">
              <span v-if="priceAxis">{{ formatPercent(priceAxis[0]) }}</span>
              <span>Flat price growth a year →</span>
              <span v-if="priceAxis">{{ formatPercent(priceAxis[1]) }}</span>
            </span>
          </div>
          <p class="minimap__line" aria-live="polite">{{ mapLine }}</p>
          <p v-if="incomeAxis" class="visually-hidden">Income growth from {{ formatPercent(incomeAxis[0]) }} to {{ formatPercent(incomeAxis[1]) }} a year.</p>
        </div>

        <button type="button" class="conf__link d-print-none" data-cy="results-confidence-grid-open" @click="seeAll">
          See every combination <span aria-hidden="true">→</span>
        </button>
      </div>

      <!-- The BTO price -->
      <div v-if="priceBar" class="conf__panel">
        <h3 class="conf__panel-title">If the BTO costs more than we estimated</h3>
        <p class="pricebar__lead">
          <strong>BTO stays ahead up to about {{ priceBar.flipText }}</strong>
          <template v-if="priceBar.inRange">, above the top of HDB's range ({{ priceBar.rangeText }}).</template>
          <template v-else>. HDB's range is {{ priceBar.rangeText }}.</template>
        </p>
        <div class="pricebar__track" aria-hidden="true">
          <span class="pricebar__zone is-bto" :style="{ width: `${priceBar.flip}%` }"></span>
          <span class="pricebar__zone is-resale" :style="{ left: `${priceBar.flip}%`, right: 0 }"></span>
          <span class="pricebar__range" :style="{ left: `${priceBar.rangeL}%`, width: `${priceBar.rangeR - priceBar.rangeL}%` }"><span>HDB's range</span></span>
          <span class="pricebar__used" :style="{ left: `${priceBar.used}%` }"><span>Price used {{ priceBar.usedText }}</span></span>
          <span class="pricebar__flip" :style="{ left: `${priceBar.flip}%` }"></span>
        </div>
        <div class="conf__scale" aria-hidden="true"><span>Cheaper</span><span>Dearer</span></div>
      </div>
    </div>


        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
/* The strip: one white card with a pink edge, the answer's confidence in a line, and the button. */
.conf__strip { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-5); padding: var(--space-4) var(--space-5); border: 1px solid var(--border-subtle); border-left: 5px solid var(--accent-fill-1); border-radius: var(--radius-md); background: var(--bg-surface); transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.conf__strip:hover { border-color: var(--accent-fill-1); box-shadow: 0 10px 28px rgba(240, 138, 182, 0.14); }
.conf__strip-text { flex: 1 1 320px; min-width: 0; }
.conf__title { margin: 0 0 2px; font-family: var(--font-heading); font-size: 1.125rem; font-weight: 600; }
.conf__headline { margin: 0; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.conf__headline.is-bto strong { color: var(--path-bto); }
.conf__headline.is-resale strong { color: var(--path-resale); }
.conf__headline.is-mixed strong { color: var(--text-primary); }
.conf__tick { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; font-size: 1.125rem; font-weight: 700; background: var(--accent-fill-2); color: var(--color-berry); }
.conf__tick.is-bto { background: var(--path-bto-fill); color: var(--path-bto); }
.conf__tick.is-resale { background: var(--path-resale-fill); color: var(--path-resale); }
.conf__open { flex: none; min-height: 44px; padding: 0 var(--space-5); border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg-surface); font-weight: 600; color: var(--text-primary); transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
.conf__open:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); }
.conf__open span { display: inline-block; transition: transform 0.2s ease; }
.conf__open:hover span { transform: translateX(3px); }
.conf__open:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

/* The pop-up */
.conf-modal { position: fixed; inset: 0; z-index: 1060; display: grid; place-items: center; padding: var(--space-4); background: rgba(29, 29, 36, 0.4); animation: conf-fade 0.2s ease both; }
.conf-modal__box { width: min(960px, 100%); max-height: calc(100vh - 2 * var(--space-4)); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-5); padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-lg); background: var(--bg-surface); box-shadow: var(--shadow-lg); animation: conf-rise 0.28s var(--ease-out) backwards; }
.conf-modal__head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }
.conf-modal__title { margin: 0 0 var(--space-1); font-family: var(--font-heading); font-size: clamp(1.25rem, 2vw, 1.5rem); font-weight: 700; letter-spacing: -0.02em; }
.conf-modal__sub { color: var(--text-secondary); line-height: 1.5; }
.conf-modal__close { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 50%; background: var(--bg-surface); color: var(--text-primary); transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
.conf-modal__close:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); }
.conf-modal__close:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.conf__facts { flex-basis: 100%; padding-top: var(--space-3); border-top: 1px solid var(--border-subtle); }
@keyframes conf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes conf-rise { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }
/* Printed with the page, as a normal section (no backdrop). */
@media print {
  .conf-modal { position: static; display: block !important; padding: 0; background: none; animation: none; }
  .conf-modal__box { width: auto; max-height: none; overflow: visible; box-shadow: none; padding: 0; animation: none; }
}
.conf__headline.is-bto strong { color: var(--path-bto); }
.conf__headline.is-resale strong { color: var(--path-resale); }

.conf__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
@media (min-width: 992px) { .conf__grid.is-two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.conf__panel { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); background: var(--indigo-tint); transition: box-shadow 0.2s ease, transform 0.2s ease; }
.conf__panel:hover { box-shadow: 0 10px 26px rgba(60, 64, 90, 0.08); }
.conf__panel-title { margin: 0; font-size: 0.9375rem; font-weight: 600; color: var(--text-secondary); }
.conf__scale { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); }
.conf__link { align-self: flex-start; margin-top: auto; padding: 0; border: 0; background: none; font-weight: 600; color: var(--text-primary); text-decoration: underline; text-underline-offset: 3px; transition: color 0.15s ease; }
.conf__link:hover { color: var(--color-berry); }
.conf__link--inline { margin-left: var(--space-2); font-size: inherit; }
.conf__link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }

/* Flip line */
.flipline__lead, .pricebar__lead { margin: 0; line-height: 1.5; }
.flipline__track, .pricebar__track { position: relative; height: 30px; margin-top: var(--space-6); border-radius: var(--radius-pill); background: var(--bg-surface); }
.flipline__zone { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; padding: 0 var(--space-3); font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; border-radius: var(--radius-pill) 0 0 var(--radius-pill); animation: conf-grow 0.7s var(--ease-out) both; transform-origin: left; }
.flipline__zone.is-right { justify-content: flex-end; border-radius: 0 var(--radius-pill) var(--radius-pill) 0; border-left: 2px solid var(--text-primary); transform-origin: right; }
.flipline__zone.is-bto { background: var(--path-bto-fill); color: var(--path-bto); }
.flipline__zone.is-resale { background: var(--path-resale-fill); color: var(--path-resale); }
.flipline__you { position: absolute; bottom: calc(100% + 6px); transform: translateX(-50%); padding: 2px var(--space-2); border-radius: var(--radius-pill); background: var(--text-primary); color: var(--on-primary); font-size: 0.75rem; font-weight: 600; white-space: nowrap; animation: conf-drop 0.5s 0.5s var(--ease-out) both; }
.flipline__you::after { content: ""; position: absolute; left: 50%; top: 100%; width: 2px; height: 36px; background: var(--text-primary); transform: translateX(-50%); }

/* Mini map */
.minimap__frame { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: var(--space-2); align-items: center; }
.minimap__y { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 0.75rem; color: var(--text-secondary); }
.minimap__cells { display: grid; gap: 3px; max-width: 420px; }
.minimap__cell { aspect-ratio: 1.6; border-radius: 4px; background: var(--border); cursor: crosshair; transition: transform 0.15s ease, box-shadow 0.15s ease; animation: conf-pop 0.35s var(--ease-out) both; }
.minimap__cell.is-a { background: var(--path-bto); }
.minimap__cell.is-b { background: var(--path-resale-bar); }
.minimap__cell.is-tie { background: var(--border); }
.minimap__cell.is-you { box-shadow: 0 0 0 2px var(--indigo-tint), 0 0 0 4px var(--accent-fill-1); }
.minimap__cell.is-hover, .minimap__cell:hover { transform: scale(1.18); box-shadow: 0 0 0 2px var(--indigo-tint), 0 0 0 4px var(--color-berry); position: relative; z-index: 1; }
.minimap__x { grid-column: 2; display: flex; justify-content: space-between; gap: var(--space-2); max-width: 420px; font-size: 0.75rem; color: var(--text-secondary); }
.minimap__line { min-height: 1.5em; margin: 0; font-size: 0.875rem; font-weight: 500; }

/* BTO price bar: green-to-pink idea in the path colours, HDB's range as a bracket, the price used as a pin. */
.pricebar__zone { position: absolute; top: 0; bottom: 0; left: 0; animation: conf-grow 0.7s var(--ease-out) both; transform-origin: left; }
.pricebar__zone.is-bto { background: var(--path-bto-fill); border-radius: var(--radius-pill) 0 0 var(--radius-pill); }
.pricebar__zone.is-resale { background: var(--path-resale-fill); border-radius: 0 var(--radius-pill) var(--radius-pill) 0; transform-origin: right; }
.pricebar__range { position: absolute; top: 6px; bottom: 6px; border: 2px solid var(--path-bto); border-radius: var(--radius-pill); }
.pricebar__range span { position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%); font-size: 0.75rem; font-weight: 600; color: var(--path-bto); white-space: nowrap; }
.pricebar__used { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--text-primary); transform: translateX(-50%); }
.pricebar__used span { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); padding: 2px var(--space-2); border-radius: var(--radius-pill); background: var(--text-primary); color: var(--on-primary); font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.pricebar__flip { position: absolute; top: -6px; bottom: -6px; width: 3px; border-radius: 2px; background: var(--color-berry); transform: translateX(-50%); }
.pricebar__track + .conf__scale { margin-top: var(--space-5); }

.conf__sentence { margin: 0 0 var(--space-2); font-size: 0.9375rem; line-height: 1.55; max-width: 90ch; }
.conf__note { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }

@keyframes conf-grow { from { transform: scaleX(0); } to { transform: none; } }
@keyframes conf-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
@keyframes conf-drop { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translateX(-50%); } }
@keyframes conf-open { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .flipline__zone, .flipline__you, .minimap__cell, .pricebar__zone, .conf-modal, .conf-modal__box { animation: none; }
  .minimap__cell, .conf__panel, .conf__strip, .conf__open, .conf__open span, .conf-modal__close { transition: none; }
}
</style>

<style>
/* While the pop-up is open, the page behind it doesn't scroll. */
body.conf-modal-open { overflow: hidden; }
</style>
