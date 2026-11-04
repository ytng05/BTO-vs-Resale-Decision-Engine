<script setup>
// Top of the dashboard, matching the Results page: a dark card with the answer (the amount in pink), the two flats,
// the ruleset date and the page's buttons; beside it a white card, "What you'd walk away with", with both net
// positions as bars. Keeps the tested hooks: dashboard-verdict, -headline, -verdict-eyebrow, -verdict-blocked,
// -subtitle, -summary-{bto|resale}-net. The default slot holds the buttons.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Term from '../Term.vue';
import { formatMoney } from '../../utils/format.js';
import { bars } from '../../utils/dashboardSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  headline: { type: String, required: true },
  call: { type: Object, default: null }, // verdict() from utils/resultsVerdict.js: winner, close (D42)
  horizon: { type: Number, default: null },
  flats: { type: Object, required: true }, // { bto: 'Tampines · 4-room · Standard', resale: 'Jurong East · 4-room' }
  rulesetVersion: { type: String, default: '' }, // '2026-08-24'
  blockedYear: { type: Number, default: null },
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

const rows = computed(() => {
  const w = bars(props.outcomeA.netPositionCents, props.outcomeB.netPositionCents);
  return [
    { key: 'bto', label: 'BTO', place: props.flats.bto, value: money(btoShown.value), width: w.a },
    { key: 'resale', label: 'Resale', place: props.flats.resale, value: money(resaleShown.value), width: w.b },
  ];
});
</script>

<template>
  <div class="dash-hero">
    <section class="dash-hero__answer" aria-labelledby="dashboard-heading" data-cy="dashboard-verdict">
      <div class="dash-hero__top">
        <span class="dash-hero__ruleset" data-cy="dashboard-ruleset-version">
          <span class="dash-hero__dot" aria-hidden="true"></span>Ruleset as of {{ rulesetDate }}
        </span>
        <span v-if="call?.close || call?.winner === 'level'" class="dash-hero__eyebrow" data-cy="dashboard-verdict-eyebrow">{{ eyebrow }}</span>
      </div>
      <h1 id="dashboard-heading" class="dash-hero__headline" data-cy="dashboard-headline">{{ parts.before }}<span class="dash-hero__amount">{{ amountText }}</span>{{ parts.after }}</h1>
      <p class="visually-hidden" data-cy="dashboard-subtitle">BTO {{ flats.bto }} <span aria-hidden="true">·</span><span class="visually-hidden">versus</span> Resale {{ flats.resale }}</p>
      <a v-if="blockedYear" href="#dashboard-critical" class="dash-hero__blocked" data-cy="dashboard-verdict-blocked">
        <span aria-hidden="true">⚠</span> You couldn't buy this BTO in {{ blockedYear }}: your income is above the new-flat ceiling. See below.
      </a>
      <div class="dash-hero__actions"><slot /></div>
    </section>

    <section class="dash-hero__walk" aria-labelledby="walk-heading">
      <h2 id="walk-heading" class="dash-hero__walk-title">What you'd walk away with<template v-if="horizon"> in {{ horizon }}</template></h2>
      <div v-for="r in rows" :key="r.key" class="dash-hero__row">
        <div class="dash-hero__row-head">
          <span><span class="dash-hero__key" :class="`dash-hero__key--${r.key}`" aria-hidden="true"></span>{{ r.label }} · {{ r.place }}</span>
          <strong class="text-numeric" :data-cy="`dashboard-summary-${r.key}-net`">{{ r.value }}</strong>
        </div>
        <span class="dash-hero__track" aria-hidden="true"><span class="dash-hero__fill" :class="`dash-hero__fill--${r.key}`" :style="{ width: `${r.width}%` }"></span></span>
      </div>
      <p class="dash-hero__note mb-0">
        <Term id="net-position">Net position</Term>: the flat's value, minus the loan left and the cash spent.
      </p>
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
@media (prefers-reduced-motion: reduce) { .dash-hero__fill, .dash-hero__answer, .dash-hero__walk, .dash-hero__amount { transition: none; animation: none; } }
</style>