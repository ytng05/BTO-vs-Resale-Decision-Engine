<script setup>
// The Dashboard's answer, as one compact card at the top. Replaces DashboardHero (redesign, 4 Nov 2026): the big
// two-card hero repeated the Results page; Results gives the answer, the Dashboard tests it. The card is tinted in the
// leading path's colour (BTO indigo, resale pink; neutral when it's too close to call), so a What-if that flips the
// answer also flips the colour. It scrolls with the page (a pinned version felt intrusive in testing); the What-if
// panel's own "Since your inputs" box shows the live change beside the sliders.
// Left: the headline (Results' wording, from verdict() in utils/resultsVerdict.js, D42), the amount in the leading
// path's colour. Middle: both net positions in the comparison year (D1) as bars, with a dashed "ghost" bar and
// "was S$…" once a slider has moved. Right: the page's buttons (default slot).
// Rounding (one rule, utils/format.js): the headline and these summary figures round to S$1,000.
// Keeps the tested hooks: dashboard-verdict, -headline, -verdict-eyebrow, -verdict-blocked, -subtitle, -flip,
// -ruleset-version, -summary-{bto|resale}-net, -badge-{bto|resale}.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Term from '../Term.vue';
import { getRuleset } from '../../api/client.js';
import { formatMoney, formatMoneyRounded } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  headline: { type: String, required: true },
  call: { type: Object, default: null }, // verdict() from utils/resultsVerdict.js: winner, close (D42)
  horizon: { type: Number, default: null },
  flats: { type: Object, required: true }, // { bto: 'Tampines · 4-room · Standard', resale: 'Jurong East · 4-room' }
  rulesetVersion: { type: String, default: '' }, // '2026-08-24'
  blockedYear: { type: Number, default: null },
  baseline: { type: Object, default: null }, // { a, b } net positions (cents) at the saved plan; null hides the ghosts
  updating: { type: Boolean, default: false }, // a What-if recalculation is running: the numbers dim
});

// A path is named as ahead only outside the "too close to call" line (D42), the same rule as the Results page.
const eyebrow = computed(() => {
  const c = props.call;
  if (!c || !c.winner) return 'Your answer';
  if (c.winner === 'level') return 'About the same';
  if (c.close) return 'Too close to call';
  return `${c.winner === 'bto' ? 'BTO' : 'Resale'} comes out ahead`;
});
// The amount and the card's tint take the leading path's colour (BTO indigo, resale berry); neutral when no path is
// called ahead.
const amountTone = computed(() => {
  const c = props.call;
  return c && !c.close && (c.winner === 'bto' || c.winner === 'resale') ? c.winner : 'none';
});

// The headline with its first S$ amount picked out (the text itself is unchanged).
const parts = computed(() => {
  const m = props.headline.match(/S\$[\d,.]+[kM]?/);
  if (!m) return { before: props.headline, amount: '', after: '' };
  const i = m.index;
  return { before: props.headline.slice(0, i), amount: m[0], after: props.headline.slice(i + m[0].length) };
});

const rulesetDate = computed(() => {
  const d = props.rulesetVersion ? new Date(`${props.rulesetVersion}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : props.rulesetVersion;
});
// Green dot only when the ruleset has been checked against its sources; amber "not yet verified" when it hasn't;
// no dot while it's loading or if it can't be loaded (never claim a status we don't know).
const rulesetStatus = ref(null);
onMounted(async () => {
  try {
    rulesetStatus.value = (await getRuleset())?.status ?? null;
  } catch {
    rulesetStatus.value = null;
  }
});
const verified = computed(() => rulesetStatus.value === 'VERIFIED');
const unverified = computed(() => rulesetStatus.value !== null && !verified.value);

// Numbers count to their new value when the page opens and when a slider moves. Reduced motion: straight to it.
const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function useCount(source) {
  const shown = ref(still ? source.value : 0);
  let frame = 0;
  const run = (from, to) => {
    cancelAnimationFrame(frame);
    if (still || typeof to !== 'number') { shown.value = to; return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 700);
      shown.value = from + (to - from) * (1 - (1 - t) ** 3); // ease-out
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  onMounted(() => run(0, source.value));
  watch(source, (to) => run(shown.value, to));
  onBeforeUnmount(() => cancelAnimationFrame(frame));
  return shown;
}
const amountDollars = computed(() => Number(String(parts.value.amount).replace(/[^\d.]/g, '')) || 0);
const amountShown = useCount(amountDollars);
const amountText = computed(() => (parts.value.amount ? formatMoney(Math.round(amountShown.value / 1000) * 1000) : ''));
const btoShown = useCount(computed(() => props.outcomeA.netPositionCents));
const resaleShown = useCount(computed(() => props.outcomeB.netPositionCents));

// Listing-style badges: the path ahead gets "Ahead in {year}"; the other path what it's better at (keys sooner, or
// less cash up front), if anything. Nothing when it's too close to call. Plain text only.
const ym = (d) => { const m = String(d ?? '').match(/^(\d{4})-(\d{2})/); return m ? Number(m[1]) * 12 + Number(m[2]) : null; };
const monthsText = (n) => {
  const y = Math.floor(n / 12); const m = n % 12;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};
const badges = computed(() => {
  const out = { bto: null, resale: null };
  const c = props.call;
  if (!c || c.close || !['bto', 'resale'].includes(c.winner)) return out;
  const win = c.winner;
  const other = win === 'bto' ? 'resale' : 'bto';
  out[win] = { text: props.horizon ? `Ahead in ${props.horizon}` : 'Comes out ahead', tone: 'win' };
  const o = { bto: props.outcomeA, resale: props.outcomeB };
  const kw = ym(o[win].timeline?.keyCollectionDate);
  const ko = ym(o[other].timeline?.keyCollectionDate);
  if (kw && ko && ko < kw) out[other] = { text: `Keys ${monthsText(kw - ko)} sooner`, tone: 'plus' };
  else if ((o[other].cashRequiredAtPurchaseCents ?? Infinity) < (o[win].cashRequiredAtPurchaseCents ?? -Infinity)) {
    out[other] = { text: 'Less cash up front', tone: 'plus' };
  }
  return out;
});

// Bars: now and ghost on one scale from S$0, so they can be compared. Below S$0 shows as an empty track.
const rows = computed(() => {
  const a = props.outcomeA.netPositionCents;
  const b = props.outcomeB.netPositionCents;
  const ga = props.baseline?.a ?? null;
  const gb = props.baseline?.b ?? null;
  const max = Math.max(1, ...[a, b, ga, gb].filter((n) => typeof n === 'number'));
  const pct = (n) => (typeof n === 'number' ? Math.max(0, Math.min(100, (n / max) * 100)) : null);
  const moved = (now, before) => typeof before === 'number' && Math.abs(now - before) >= 100000; // at least S$1,000
  return [
    { key: 'bto', label: 'BTO', place: props.flats.bto, value: formatMoneyRounded(btoShown.value), final: formatMoneyRounded(a), width: pct(a), ghost: moved(a, ga) ? pct(ga) : null, was: moved(a, ga) ? formatMoneyRounded(ga) : '' },
    { key: 'resale', label: 'Resale', place: props.flats.resale, value: formatMoneyRounded(resaleShown.value), final: formatMoneyRounded(b), width: pct(b), ghost: moved(b, gb) ? pct(gb) : null, was: moved(b, gb) ? formatMoneyRounded(gb) : '' },
  ];
});

// When a What-if change makes the other path come out ahead (or the two end level), say so for a few seconds.
// "Too close to call" is a stop on the way, not a result, so BTO -> too close -> resale still counts as a flip.
const flipped = ref('');
let flipTimer = 0;
const settled = (c) => {
  if (!c?.winner) return null;
  if (c.winner === 'level') return 'level';
  return c.close ? null : c.winner;
};
let lastSettled = settled(props.call);
watch(() => [props.call?.winner, props.call?.close], () => {
  const now = settled(props.call);
  if (!now) return;
  if (lastSettled && now !== lastSettled) {
    flipped.value = now === 'level' ? 'Now the two paths end level' : `Now ${now === 'bto' ? 'BTO' : 'resale'} comes out ahead`;
    clearTimeout(flipTimer);
    flipTimer = setTimeout(() => { flipped.value = ''; }, 4000);
  }
  lastSettled = now;
});
onBeforeUnmount(() => clearTimeout(flipTimer));
</script>

<template>
  <section
    class="dash-verdict-bar"
    :class="[`dash-verdict-bar--${amountTone}`, { 'is-updating': updating, 'is-flipped': flipped }]"
    aria-labelledby="dashboard-heading"
    data-cy="dashboard-verdict"
  >
    <div class="vbar__answer">
      <p class="vbar__meta mb-0">
        <span class="vbar__ruleset" data-cy="dashboard-ruleset-version">
          <span v-if="verified || unverified" class="vbar__dot" :class="{ 'is-warn': unverified }" aria-hidden="true"></span>Ruleset as of {{ rulesetDate }}<template v-if="unverified"> · not yet verified</template>
        </span>
        <span v-if="call?.close || call?.winner === 'level'" class="vbar__eyebrow" data-cy="dashboard-verdict-eyebrow">{{ eyebrow }}</span>
      </p>
      <!-- The final headline is in the DOM from the start (visually hidden) for screen readers and tests; the counting
           copy is aria-hidden, so nobody reads a number on its way up from S$0. -->
      <h1 id="dashboard-heading" class="vbar__headline" data-cy="dashboard-headline"><span class="visually-hidden">{{ headline }}</span><span aria-hidden="true">{{ parts.before }}<span class="vbar__amount" :class="`vbar__amount--${amountTone}`">{{ amountText }}</span>{{ parts.after }}</span></h1>
      <p class="visually-hidden" data-cy="dashboard-subtitle">BTO {{ flats.bto }} <span aria-hidden="true">·</span><span class="visually-hidden">versus</span> Resale {{ flats.resale }}</p>
      <p class="vbar__flip mb-0" role="status" aria-live="polite" data-cy="dashboard-flip"><span v-if="flipped">{{ flipped }}</span></p>
      <a v-if="blockedYear" href="#dashboard-critical" class="vbar__blocked" data-cy="dashboard-verdict-blocked">
        <span aria-hidden="true">⚠</span> You couldn't buy this BTO in {{ blockedYear }}: your income is above the new-flat ceiling. See below.
      </a>
    </div>

    <div class="vbar__paths" :aria-busy="updating ? 'true' : 'false'">
      <p class="vbar__paths-title mb-0"><Term id="net-position">Net position</Term><template v-if="horizon"> in {{ horizon }}</template></p>
      <div v-for="r in rows" :key="r.key" class="vbar__row">
        <div class="vbar__row-head">
          <span class="vbar__name">
            <span class="vbar__key" :class="`vbar__key--${r.key}`" aria-hidden="true"></span>
            <span class="vbar__label">{{ r.label }}</span>
            <span class="vbar__place" :data-cy="`dashboard-summary-${r.key}-place`">{{ r.place }}</span>
          </span>
          <strong class="vbar__value text-numeric" :data-cy="`dashboard-summary-${r.key}-net`"><span class="visually-hidden">{{ r.final }}</span><span aria-hidden="true">{{ r.value }}</span></strong>
        </div>
        <span class="vbar__track" aria-hidden="true">
          <span v-if="r.ghost !== null" class="vbar__ghost" :style="{ width: `${r.ghost}%` }"></span>
          <span class="vbar__fill" :class="`vbar__fill--${r.key}`" :style="{ width: `${r.width}%` }"></span>
        </span>
        <span class="vbar__foot">
          <span v-if="badges[r.key]" class="vbar__badge" :class="`vbar__badge--${badges[r.key].tone}`" :data-cy="`dashboard-badge-${r.key}`">{{ badges[r.key].text }}</span>
          <span v-if="r.was" class="vbar__was">was {{ r.was }}</span>
        </span>
      </div>
    </div>

    <div class="vbar__actions"><slot /></div>
  </section>
</template>

<style scoped>
/* One card, tinted in the leading path's colour, with a thicker top edge in that colour (the same idea as the
   path cards on Results). Neutral mist when no path is called ahead. Text stays ink, so contrast never changes. */
.dash-verdict-bar {
  --vbar-tint: var(--bg-page);
  --vbar-edge: var(--border-strong);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--vbar-tint);
  border: 1px solid var(--border-subtle);
  border-top: 6px solid var(--vbar-edge);
  transition: background-color 0.4s ease, border-color 0.4s ease;
}
.dash-verdict-bar--bto { --vbar-tint: var(--path-bto-tint); --vbar-edge: var(--path-bto); border-color: var(--path-bto-fill); }
.dash-verdict-bar--resale { --vbar-tint: var(--path-resale-tint); --vbar-edge: var(--path-resale-bar); border-color: var(--path-resale-fill); }
@media (min-width: 992px) {
  .dash-verdict-bar {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-6);
    padding: var(--space-5) var(--space-6);
  }
  .vbar__actions { grid-column: 1 / -1; }
}
@media (min-width: 1200px) {
  .dash-verdict-bar { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto; }
  .vbar__actions { grid-column: auto; flex-direction: column; align-items: stretch; }
}

/* The answer */
.vbar__answer { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.vbar__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); font-size: 0.8125rem; color: var(--text-secondary); }
.vbar__ruleset { display: inline-flex; align-items: center; gap: var(--space-2); }
.vbar__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
.vbar__dot.is-warn { background: var(--warning); }
.vbar__eyebrow { padding: 2px var(--space-3); border-radius: var(--radius-pill); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; }
.vbar__headline {
  margin: 0;
  font-family: var(--font-heading);
  font-size: clamp(1.375rem, 2.2vw, 1.875rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  transition: opacity 0.2s ease;
}
.vbar__amount { display: inline-block; }
.vbar__amount--bto { color: var(--path-bto); }
.vbar__amount--resale { color: var(--path-resale); }
.vbar__blocked { align-self: flex-start; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--danger-fill); color: var(--danger-strong); font-size: 0.875rem; font-weight: 600; text-decoration: none; }

/* Both net positions */
.vbar__paths { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.vbar__paths-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
.vbar__row { display: flex; flex-direction: column; gap: 6px; }
.vbar__row-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); min-width: 0; }
.vbar__name { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); min-width: 0; font-size: 0.875rem; }
.vbar__label { font-weight: 600; }
/* The flat. When it doesn't fit beside BTO or Resale it moves to its own line below, and wraps there if it must:
   cut short with …, phones at 320–412px showed only the town ("Tampines ·…"), not the flat type. */
.vbar__place { min-width: 0; overflow-wrap: anywhere; color: var(--text-secondary); }
.vbar__key { flex: none; align-self: center; width: 8px; height: 8px; border-radius: 50%; }
.vbar__key--bto, .vbar__fill--bto { background: var(--path-bto); }
.vbar__key--resale, .vbar__fill--resale { background: var(--path-resale-bar); }
.vbar__value { flex: none; font-family: var(--font-heading); font-size: 1.125rem; letter-spacing: -0.01em; transition: opacity 0.2s ease; }
/* White tracks, so the bars read on the tinted card. */
.vbar__track { position: relative; display: block; height: 8px; border-radius: var(--radius-pill); background: var(--bg-surface); overflow: hidden; }
.vbar__fill { position: relative; display: block; height: 100%; border-radius: var(--radius-pill); transition: width var(--duration-base) var(--ease-out); }
/* Ghost: where the path was at your saved inputs, a dashed outline behind today's bar. */
.vbar__ghost { position: absolute; inset: 0 auto 0 0; border: 1.5px dashed var(--text-secondary); border-radius: var(--radius-pill); transition: width var(--duration-base) var(--ease-out); }
.vbar__foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); min-height: 0; }
.vbar__foot:empty { display: none; }
.vbar__badge { padding: 1px var(--space-2); border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 600; }
.vbar__badge--win { background: var(--path-bto); color: var(--on-primary); }
.vbar__row:last-child .vbar__badge--win { background: var(--path-resale); }
/* The other path's strength: white pill, in that path's text colour, so it shows on either tint. */
.vbar__badge--plus { background: var(--bg-surface); color: var(--path-resale); border: 1px solid var(--path-resale-fill); }
.vbar__row:first-of-type .vbar__badge--plus { color: var(--path-bto); border-color: var(--path-bto-fill); }
.vbar__was { font-size: 0.8125rem; color: var(--text-secondary); }

/* The page's buttons */
.vbar__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }

/* While a What-if recalculates, the numbers dim a little. */
.is-updating .vbar__headline, .is-updating .vbar__value { opacity: 0.55; }
/* The flip alert: a pill that pops in, and the card's outline pulses once. */
.vbar__flip span { display: inline-block; padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); background: var(--accent-fill-2); color: var(--text-primary); font-size: 0.875rem; font-weight: 600; animation: vbar-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.dash-verdict-bar.is-flipped { animation: vbar-flash 0.9s ease; }
@keyframes vbar-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: none; } }
@keyframes vbar-flash { 0%, 100% { box-shadow: none; } 40% { box-shadow: 0 0 0 4px var(--accent-fill-1); } }
@media (prefers-reduced-motion: reduce) {
  .dash-verdict-bar, .vbar__fill, .vbar__ghost, .vbar__flip span, .dash-verdict-bar.is-flipped { transition: none; animation: none; }
}
</style>
