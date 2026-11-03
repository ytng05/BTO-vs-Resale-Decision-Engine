<!--
  IncomeScene.vue – illustration for the "What do you each earn a month?" screen of About you (Calm "Easier
  onboarding" board). Two payslips add up into one growing stack of coins, the couple standing beside it, and a
  bubble with the total.

  Props: total – the two monthly incomes added up, in dollars; the bubble shows only once both are filled in.
  CSS only. Decorative (one aria-label). Holds still under prefers-reduced-motion.
-->
<script setup>
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  total: { type: Number, default: null },
});

const bubble = computed(() => (typeof props.total === 'number' ? `${formatMoney(props.total)} a month together` : null));
const label = computed(() => `Two payslips adding up into one stack of coins, with the couple standing beside it${bubble.value ? `: ${bubble.value}` : ''}.`);
const COINS = [0, 1, 2, 3, 4, 5, 6];
</script>

<template>
  <svg class="income-scene" viewBox="0 0 480 600" preserveAspectRatio="xMidYMax slice" role="img" :aria-label="label" data-cy="income-scene">
    <g opacity=".07" style="fill: var(--text-secondary)"><rect x="0" y="200" width="70" height="300" /><rect x="110" y="150" width="70" height="350" /><rect x="124" y="130" width="24" height="20" /><rect x="250" y="190" width="60" height="310" /></g>
    <g opacity=".45" style="fill: var(--bg-surface)"><rect x="40" y="200" width="30" height="300" /><rect x="150" y="150" width="30" height="350" /></g>
    <path d="M0 470Q120 440 250 458T480 450V600H0Z" fill="var(--accent-fill-2)" />
    <path d="M-10 500Q140 474 300 492T490 488V600H-10Z" opacity=".45" style="fill: var(--accent-fill-1)" />
    <path d="M0 528Q160 514 300 522T480 518V600H0Z" style="fill: var(--bg-surface)" />
    <rect x="0" y="566" width="480" height="34" style="fill: var(--border)" />
    <line x1="0" y1="584" x2="480" y2="584" stroke-width="3" stroke-dasharray="30 22" style="stroke: var(--bg-surface)" />
    <!-- two payslips -->
    <g class="bob" style="animation-delay:-.8s"><g transform="rotate(-6 76 352)">
      <rect x="26" y="318" width="100" height="68" rx="8" stroke-width="1.5" style="fill: var(--bg-surface); stroke: var(--text-secondary)" />
      <path d="M26.75 326a7.25 7.25 0 0 1 7.25-7.25h84A7.25 7.25 0 0 1 125.25 326v8H26.75z" style="fill: var(--accent-fill-1)" />
      <path d="M38 348h40M38 360h28" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" style="stroke: var(--text-secondary)" />
      <text x="114" y="376" class="income-scene__small" text-anchor="end">Pay</text>
    </g></g>
    <g class="bob" style="animation-delay:-2s"><g transform="rotate(4 90 436)">
      <rect x="40" y="402" width="100" height="68" rx="8" stroke-width="1.5" style="fill: var(--bg-surface); stroke: var(--text-secondary)" />
      <path d="M40.75 410a7.25 7.25 0 0 1 7.25-7.25h84A7.25 7.25 0 0 1 139.25 410v8H40.75z" style="fill: var(--accent-fill-1)" />
      <path d="M52 432h40M52 444h28" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" style="stroke: var(--text-secondary)" />
      <text x="128" y="460" class="income-scene__small" text-anchor="end">Pay</text>
    </g></g>
    <path d="M138 356Q178 364 192 410M146 448Q172 460 192 466" stroke-width="2" stroke-dasharray="5 6" fill="none" stroke-linecap="round" style="stroke: var(--text-secondary)" />
    <circle cx="168" cy="404" r="13" style="fill: var(--text-primary)" /><path d="M162 404h12M168 398v12" stroke-width="2.4" stroke-linecap="round" style="stroke: var(--bg-surface)" />
    <!-- the stack of coins, building up -->
    <ellipse cx="244" cy="524" rx="62" ry="7" opacity=".12" style="fill: var(--text-secondary)" />
    <g v-for="c in COINS" :key="c" class="coin" :style="{ animationDelay: `${c * 0.56}s` }">
      <rect x="196" :y="500 - c * 18" width="96" height="18" rx="9" :style="{ fill: c % 2 ? 'var(--accent-fill-2)' : 'var(--accent-fill-1)' }" stroke-width="1.5" style="stroke: var(--text-secondary)" />
      <path :d="`M210 ${509 - c * 18}h68`" stroke-opacity=".25" stroke-width="1.5" style="stroke: var(--text-secondary)" />
    </g>
    <!-- the total, once both incomes are in -->
    <g v-if="bubble" class="bob" style="animation-delay:-.6s" data-cy="income-scene-total">
      <rect x="140" y="318" width="216" height="46" rx="23" opacity=".06" transform="translate(0 3)" style="fill: var(--text-secondary)" />
      <rect x="140" y="318" width="216" height="46" rx="23" style="fill: var(--bg-surface)" /><path d="M236 362l8 14 8-14z" style="fill: var(--bg-surface)" />
      <text x="248" y="348" class="income-scene__total" text-anchor="middle">{{ bubble }}</text>
    </g>
    <!-- the couple -->
    <g transform="translate(370 546) scale(1.9)">
      <line x1="-2" y1="-16" x2="-2" y2="0" stroke-width="2.6" stroke-linecap="round" style="stroke: var(--text-secondary)" /><line x1="2" y1="-16" x2="2" y2="0" stroke-width="2.6" stroke-linecap="round" style="stroke: var(--text-secondary)" />
      <rect x="-7" y="-34" width="14" height="20" rx="5" style="fill: var(--text-secondary)" /><circle cx="0" cy="-41" r="7" stroke-width="1.2" style="fill: var(--bg-surface); stroke: var(--text-secondary)" /><path d="M-7 -42a7 7 0 0 1 14 0z" style="fill: var(--text-secondary)" />
    </g>
    <g transform="translate(404 546) scale(1.9)">
      <line x1="-2" y1="-14" x2="-2" y2="0" stroke-width="2.6" stroke-linecap="round" style="stroke: var(--text-secondary)" /><line x1="2" y1="-14" x2="2" y2="0" stroke-width="2.6" stroke-linecap="round" style="stroke: var(--text-secondary)" />
      <path d="M-8 -14 -5 -33h10l3 19z" stroke-width="1" style="fill: var(--accent-fill-1); stroke: var(--text-secondary)" /><circle cx="0" cy="-40" r="7" stroke-width="1.2" style="fill: var(--bg-surface); stroke: var(--text-secondary)" /><circle cx="-6" cy="-44" r="3.4" style="fill: var(--text-secondary)" />
    </g>
  </svg>
</template>

<style scoped>
.income-scene { display: block; width: 100%; height: clamp(280px, 38vw, 520px); border-radius: 24px; }
.income-scene__small { font-family: inherit; font-size: 13px; font-weight: 600; fill: var(--text-primary); }
.income-scene__total { font-family: inherit; font-size: 16px; font-weight: 600; fill: var(--text-primary); }
.bob { animation: bob 3.2s ease-in-out infinite alternate; }
@keyframes bob { from { transform: translateY(0); } to { transform: translateY(-6px); } }
/* Each coin drops onto the stack in turn (delays set inline), then the stack clears and builds again. */
.coin { transform-box: fill-box; animation: coin 7s ease-out infinite both; }
@keyframes coin { 0% { opacity: 0; transform: translateY(-30px); } 6%, 90% { opacity: 1; transform: none; } 96%, 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .bob, .coin { animation: none; }
}
</style>
