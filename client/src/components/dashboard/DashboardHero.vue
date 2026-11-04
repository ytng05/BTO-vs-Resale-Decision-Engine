<script setup>
// Top of the dashboard, matching the Results page: a dark card with the answer (the amount in pink), the two flats,
// the ruleset date and the page's buttons; beside it a white card, "Net position in {year}" (D1), with both net
// positions as bars. Keeps the tested hooks: dashboard-verdict, -headline, -verdict-eyebrow, -verdict-blocked,
// -subtitle, -summary-{bto|resale}-net. The default slot holds the buttons.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Term from '../Term.vue';
import { getRuleset } from '../../api/client.js';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  headline: { type: String, required: true },
  call: { type: Object, default: null }, // verdict() from utils/resultsVerdict.js: winner, close (D42)
  horizon: { type: Number, default: null },
  flats: { type: Object, required: true }, // { bto: 'Tampines · 4-room · Standard', resale: 'Jurong East · 4-room' }
  rulesetVersion: { type: String, default: '' }, // '2026-08-24'
  blockedYear: { type: Number, default: null },
  // The net positions (cents) at the saved plan, before any What-if: drawn as faint "ghost" bars behind the
  // current ones, so you can see how far a slider moved each path. Null hides them.
  baseline: { type: Object, default: null }, // { a, b }
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
// The headline with its first S$ amount picked out, so it can be shown in pink (the text itself is unchanged).
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
// Whether the ruleset has been checked against its sources. Green dot only when it has; amber "not yet verified"
// when it hasn't; no dot while it's loading or if it can't be loaded (never claim a status we don't know).
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
const money = (cents) => formatMoney(Math.round(cents / 100 / 1000) * 1000);
// Numbers count up to their value when the page opens, and count to the new value when a What-if slider moves.
// People who turn off motion see the final number straight away.
const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function useCount(source) {
  const shown = ref(still ? source.value : 0);
  let frame = 0;
  const run = (from, to) => {
    cancelAnimationFrame(frame);
    if (still || typeof to !== 'number') { shown.value = to; return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 800);
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

// Bar widths: every bar (now and ghost) on the same scale, so they can be compared. Below S$0 shows as empty.
const rows = computed(() => {
  const a = props.outcomeA.netPositionCents;
  const b = props.outcomeB.netPositionCents;
  const ga = props.baseline?.a ?? null;
  const gb = props.baseline?.b ?? null;
  const max = Math.max(1, ...[a, b, ga, gb].filter((n) => typeof n === 'number'));
  const pct = (n) => (typeof n === 'number' ? Math.max(0, Math.min(100, (n / max) * 100)) : null);
  const moved = (now, before) => typeof before === 'number' && Math.abs(now - before) >= 100000; // at least S$1,000
  return [
    { key: 'bto', label: 'BTO', place: props.flats.bto, value: money(btoShown.value), width: pct(a), ghost: moved(a, ga) ? pct(ga) : null, was: moved(a, ga) ? money(ga) : '' },
    { key: 'resale', label: 'Resale', place: props.flats.resale, value: money(resaleShown.value), width: pct(b), ghost: moved(b, gb) ? pct(gb) : null, was: moved(b, gb) ? money(gb) : '' },
  ];
});

// Listing-style badges, as on property sites: the path ahead in the comparison year gets "★ Better by {year}" (net
// position is measured in that one year, D1); the other path gets
// what it's better at, if anything (keys sooner, or less cash up front). Nothing when it's too close to call.
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
  out[win] = { text: props.horizon ? `★ Better by ${props.horizon}` : '★ Comes out ahead', tone: 'win' };
  const o = { bto: props.outcomeA, resale: props.outcomeB };
  const kw = ym(o[win].timeline?.keyCollectionDate);
  const ko = ym(o[other].timeline?.keyCollectionDate);
  if (kw && ko && ko < kw) {
    out[other] = { text: `⚡ Keys ${monthsText(kw - ko)} sooner`, tone: 'plus' };
  } else if ((o[other].cashRequiredAtPurchaseCents ?? Infinity) < (o[win].cashRequiredAtPurchaseCents ?? -Infinity)) {
    out[other] = { text: '◆ Less cash up front', tone: 'plus' };
  }
  return out;
});

// When a What-if change makes the other path come out ahead (or the two end level), say so for a few seconds.
// Watches winner and close together: "too close to call" is a stop on the way, not a result, so going
// BTO -> too close -> resale still counts as a flip. Level always counts.
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
  if (!now) return; // too close to call: keep the last clear answer to compare with
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
  <div class="dash-hero">
    <section class="dash-hero__answer" :class="{ 'is-updating': updating, 'is-flipped': flipped }" aria-labelledby="dashboard-heading" data-cy="dashboard-verdict">
      <div class="dash-hero__top">
        <span class="dash-hero__ruleset" data-cy="dashboard-ruleset-version">
          <span v-if="verified || unverified" class="dash-hero__dot" :class="{ 'is-warn': unverified }" aria-hidden="true"></span>Ruleset as of {{ rulesetDate }}<template v-if="unverified"> · not yet verified</template>
        </span>
        <span v-if="call?.close || call?.winner === 'level'" class="dash-hero__eyebrow" data-cy="dashboard-verdict-eyebrow">{{ eyebrow }}</span>
      </div>
      <p class="dash-hero__flip mb-0" role="status" aria-live="polite" data-cy="dashboard-flip"><span v-if="flipped">⇄ {{ flipped }}</span></p>
      <h1 id="dashboard-heading" class="dash-hero__headline" data-cy="dashboard-headline">{{ parts.before }}<span class="dash-hero__amount">{{ amountText }}</span>{{ parts.after }}</h1>
      <p class="visually-hidden" data-cy="dashboard-subtitle">BTO {{ flats.bto }} <span aria-hidden="true">·</span><span class="visually-hidden">versus</span> Resale {{ flats.resale }}</p>
      <a v-if="blockedYear" href="#dashboard-critical" class="dash-hero__blocked" data-cy="dashboard-verdict-blocked">
        <span aria-hidden="true">⚠</span> You couldn't buy this BTO in {{ blockedYear }}: your income is above the new-flat ceiling. See below.
      </a>
      <div class="dash-hero__actions"><slot /></div>
    </section>

    <section class="dash-hero__walk" :class="{ 'is-updating': updating }" aria-labelledby="walk-heading">
      <!-- Same wording as Results (D1): net position without selling the flat, not "walk away with". -->
      <div>
        <h2 id="walk-heading" class="dash-hero__walk-title"><Term id="net-position">Net position</Term><template v-if="horizon"> in {{ horizon }}</template></h2>
        <p class="dash-hero__walk-sub mb-0">What this path leaves you with, after costs</p>
      </div>
      <div v-for="r in rows" :key="r.key" class="dash-hero__row">
        <div class="dash-hero__row-head">
          <span class="dash-hero__name">
            <span><span class="dash-hero__key" :class="`dash-hero__key--${r.key}`" aria-hidden="true"></span>{{ r.label }} · {{ r.place }}</span>
            <span v-if="badges[r.key]" class="dash-hero__badge" :class="`dash-hero__badge--${badges[r.key].tone}`" :data-cy="`dashboard-badge-${r.key}`">{{ badges[r.key].text }}</span>
          </span>
          <strong class="text-numeric" :data-cy="`dashboard-summary-${r.key}-net`">{{ r.value }}</strong>
        </div>
        <span class="dash-hero__track" aria-hidden="true">
          <span v-if="r.ghost !== null" class="dash-hero__ghost" :style="{ width: `${r.ghost}%` }"></span>
          <span class="dash-hero__fill" :class="`dash-hero__fill--${r.key}`" :style="{ width: `${r.width}%` }"></span>
        </span>
        <span v-if="r.was" class="dash-hero__was">Was {{ r.was }} with your inputs</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Two cards side by side on large screens (dark answer, white numbers), stacked below that. */
.dash-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
@media (min-width: 992px) { .dash-hero { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); } }

.dash-hero__answer {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: clamp(24px, 3.5vw, 40px); border-radius: var(--radius-lg);
  background: var(--text-primary); color: var(--on-primary);
}
.dash-hero__top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
.dash-hero__ruleset { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); background: rgba(255, 255, 255, 0.1); font-size: 0.8125rem; }
.dash-hero__dot { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, var(--success) 55%, var(--bg-surface)); }
.dash-hero__dot.is-warn { background: var(--warning-fill); }
.dash-hero__eyebrow { font-size: 0.875rem; color: rgba(255, 255, 255, 0.75); }
.dash-hero__headline { margin: var(--space-2) 0 0; color: var(--on-primary); font-family: var(--font-heading); font-size: clamp(1.75rem, 3.2vw, 2.5rem); font-weight: 600; line-height: 1.1; letter-spacing: -0.03em; }
.dash-hero__amount { color: var(--accent-fill-1); }
.dash-hero__flats { color: rgba(255, 255, 255, 0.75); font-size: 0.9375rem; }
.dash-hero__blocked { align-self: flex-start; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: var(--bg-surface); color: var(--danger); font-size: 0.875rem; font-weight: 600; text-decoration: none; }
.dash-hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin-top: auto; padding-top: var(--space-3); }

.dash-hero__walk {
  display: flex; flex-direction: column; justify-content: center; gap: var(--space-4);
  padding: clamp(24px, 3.5vw, 40px); border-radius: var(--radius-lg);
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
}
.dash-hero__walk-title { margin: 0; font-size: 1rem; font-weight: 600; }
.dash-hero__walk-sub { font-size: 0.875rem; color: var(--text-secondary); }
.dash-hero__row { display: flex; flex-direction: column; gap: var(--space-2); margin: 0 calc(var(--space-3) * -1); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); transition: background 0.2s ease; }
/* Point at a path: its row turns pale pink and its bar gets thicker. */
.dash-hero__row:hover { background: var(--accent-tint); }
.dash-hero__track { transition: height 0.2s ease; }
.dash-hero__row:hover .dash-hero__track { height: 16px; }
.dash-hero__answer, .dash-hero__walk { transition: translate 0.35s ease, box-shadow 0.3s ease; }
.dash-hero__answer:hover, .dash-hero__walk:hover { translate: 0 -3px; box-shadow: 0 18px 40px rgba(29, 29, 36, 0.12); }
.dash-hero__row-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); font-size: 0.9375rem; }
.dash-hero__row-head strong { font-size: 1.375rem; letter-spacing: -0.01em; }
.dash-hero__key { display: inline-block; width: 8px; height: 8px; margin-right: var(--space-2); border-radius: 50%; vertical-align: 1px; }
.dash-hero__key--bto, .dash-hero__fill--bto { background: var(--text-primary); }
.dash-hero__key--resale, .dash-hero__fill--resale { background: var(--color-pink-deep); }
.dash-hero__track { display: block; height: 12px; border-radius: var(--radius-pill); background: var(--bg-page); overflow: hidden; }
.dash-hero__fill { display: block; height: 100%; border-radius: var(--radius-pill); transform-origin: left; transition: width var(--duration-base) var(--ease-out); animation: hero-grow 1s 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dash-hero__row + .dash-hero__row .dash-hero__fill { animation-delay: 0.5s; }
/* On load: the two cards rise in one after the other, then the bars grow. */
.dash-hero__answer, .dash-hero__walk { animation: hero-rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.dash-hero__walk { animation-delay: 0.12s; }
.dash-hero__amount { display: inline-block; animation: hero-pop 0.6s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes hero-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes hero-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hero-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: none; } }
.dash-hero__note { font-size: 0.8125rem; color: var(--text-secondary); }
/* Ghost bar: where the path was at your saved inputs, as a dashed outline behind today's bar. */
.dash-hero__track { position: relative; }
.dash-hero__ghost { position: absolute; inset: 0 auto 0 0; border: 1.5px dashed var(--text-secondary); border-radius: var(--radius-pill); transition: width var(--duration-base) var(--ease-out); }
.dash-hero__fill { position: relative; }
.dash-hero__was { font-size: 0.8125rem; color: var(--text-secondary); }
.dash-hero__name { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); }
.dash-hero__badge { padding: 2px var(--space-3); border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 600; animation: hero-pop 0.5s 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.dash-hero__badge--win { background: var(--text-primary); color: var(--on-primary); }
.dash-hero__badge--plus { background: var(--accent-fill-2); color: var(--color-berry); }
/* While a What-if recalculates, the numbers dim a little. */
.dash-hero__headline, .dash-hero__row strong { transition: opacity 0.2s ease; }
.is-updating .dash-hero__headline, .is-updating .dash-hero__row strong { opacity: 0.55; }
/* The flip alert: a pink pill that pops in, and the dark card pulses once. */
.dash-hero__flip { min-height: 0; }
.dash-hero__flip span { display: inline-block; padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); background: var(--accent-fill-1); color: var(--text-primary); font-size: 0.875rem; font-weight: 600; animation: hero-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.dash-hero__answer.is-flipped { animation: hero-flash 0.9s ease; }
@keyframes hero-flash { 0%, 100% { box-shadow: none; } 40% { box-shadow: 0 0 0 6px var(--accent-fill-1); } }
@media (prefers-reduced-motion: reduce) { .dash-hero__fill, .dash-hero__ghost, .dash-hero__answer, .dash-hero__walk, .dash-hero__amount, .dash-hero__flip span { transition: none; animation: none; } }
</style>