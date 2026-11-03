<!--
  AgesScene.vue – illustration for the "How old are you both?" screen of About you (Calm "Easier onboarding" board).
  Two future residents under a covered walkway next to their HDB block, each with a tag showing their age, and a
  calendar marked "Today".

  Props: ages – [buyer 1, buyer 2]; a tag shows only once that age is filled in.
  CSS only. Decorative (one aria-label). Holds still under prefers-reduced-motion.
-->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  ages: { type: Array, default: () => [] },
});

const tag = (i) => (Number.isInteger(props.ages[i]) ? String(props.ages[i]) : null);
const label = computed(() => {
  const shown = [tag(0), tag(1)].filter(Boolean);
  return `Two future residents under a covered walkway next to their HDB block${shown.length ? `, with tags showing ages ${shown.join(' and ')}` : ''}.`;
});
</script>

<template>
  <svg class="ages-scene" viewBox="0 0 480 600" preserveAspectRatio="xMidYMax slice" role="img" :aria-label="label" data-cy="ages-scene">
    <g fill="#5f6373" opacity=".07"><rect x="0" y="200" width="70" height="300" /><rect x="110" y="150" width="70" height="350" /><rect x="124" y="130" width="24" height="20" /><rect x="250" y="190" width="60" height="310" /></g>
    <g fill="#ffffff" opacity=".45"><rect x="40" y="200" width="30" height="300" /><rect x="150" y="150" width="30" height="350" /></g>
    <path d="M0 470Q120 440 250 458T480 450V600H0Z" fill="var(--color-blush, #fbd5e5)" />
    <path d="M-10 500Q140 474 300 492T490 488V600H-10Z" fill="#f5a3c7" opacity=".45" />
    <rect x="326" y="226" width="118" height="10" rx="4" fill="#f5a3c7" /><rect x="334" y="234" width="102" height="246" rx="8" fill="#ffffff" />
    <g fill="var(--color-periwinkle, #e9ecf6)">
      <rect class="lit" x="348" y="252" width="18" height="14" rx="3" /><rect x="378" y="252" width="18" height="14" rx="3" /><rect x="408" y="252" width="18" height="14" rx="3" />
      <rect x="348" y="282" width="18" height="14" rx="3" /><rect x="378" y="282" width="18" height="14" rx="3" /><rect class="lit" style="animation-delay:-11s" x="408" y="282" width="18" height="14" rx="3" />
      <rect x="348" y="312" width="18" height="14" rx="3" /><rect class="lit" style="animation-delay:-1s" x="378" y="312" width="18" height="14" rx="3" /><rect x="408" y="312" width="18" height="14" rx="3" />
      <rect class="lit" style="animation-delay:-3s" x="348" y="342" width="18" height="14" rx="3" /><rect x="378" y="342" width="18" height="14" rx="3" /><rect x="408" y="342" width="18" height="14" rx="3" />
      <rect x="348" y="372" width="18" height="14" rx="3" /><rect x="378" y="372" width="18" height="14" rx="3" /><rect class="lit" style="animation-delay:-2s" x="408" y="372" width="18" height="14" rx="3" />
      <rect x="348" y="402" width="18" height="14" rx="3" /><rect class="lit" style="animation-delay:-4s" x="378" y="402" width="18" height="14" rx="3" /><rect x="408" y="402" width="18" height="14" rx="3" />
      <rect class="lit" style="animation-delay:-6s" x="348" y="432" width="18" height="14" rx="3" /><rect x="378" y="432" width="18" height="14" rx="3" /><rect x="408" y="432" width="18" height="14" rx="3" />
    </g>
    <!-- calendar: today -->
    <g class="bob" style="animation-delay:-1s">
      <rect x="44" y="160" width="96" height="88" rx="12" fill="#ffffff" stroke="#5f6373" stroke-width="1.5" />
      <path d="M44.75 172a11.25 11.25 0 0 1 11.25-11.25h72A11.25 11.25 0 0 1 139.25 172v10H44.75z" fill="#f5a3c7" />
      <path d="M68 152v16M116 152v16" stroke="#5f6373" stroke-width="3" stroke-linecap="round" />
      <g fill="var(--color-periwinkle, #e9ecf6)"><rect x="58" y="206" width="14" height="10" rx="3" /><rect x="85" y="206" width="14" height="10" rx="3" /><rect x="112" y="206" width="14" height="10" rx="3" /><rect x="58" y="224" width="14" height="10" rx="3" /><rect x="112" y="224" width="14" height="10" rx="3" /></g>
      <circle cx="92" cy="229" r="9" fill="none" stroke="#f08ab6" stroke-width="2.5" /><rect x="85" y="224" width="14" height="10" rx="3" fill="#f08ab6" />
      <text x="92" y="198" class="ages-scene__small" text-anchor="middle">TODAY</text>
    </g>
    <circle cx="300" cy="470" r="26" fill="#f5a3c7" /><circle cx="291" cy="461" r="10" fill="var(--color-blush, #fbd5e5)" />
    <path d="M300 528V470M300 500l-13-13M300 486l11-13" stroke="#5f6373" stroke-width="2" stroke-linecap="round" fill="none" />
    <path d="M0 528Q160 514 300 522T480 518V600H0Z" fill="#ffffff" />
    <rect x="0" y="566" width="480" height="34" fill="#dfe2ea" />
    <line x1="0" y1="584" x2="480" y2="584" stroke="#ffffff" stroke-width="3" stroke-dasharray="30 22" />
    <!-- covered walkway and the two buyers -->
    <rect x="40" y="404" width="230" height="11" rx="4" fill="#f08ab6" />
    <path d="M56 415V540M128 415V540M196 415V540M256 415V540" stroke="#5f6373" stroke-width="2.2" stroke-linecap="round" />
    <g transform="translate(150 546) scale(2.5)">
      <line x1="-2" y1="-16" x2="-2" y2="0" stroke="#5f6373" stroke-width="2.6" stroke-linecap="round" /><line x1="2" y1="-16" x2="2" y2="0" stroke="#5f6373" stroke-width="2.6" stroke-linecap="round" />
      <rect x="-7" y="-34" width="14" height="20" rx="5" fill="#5f6373" /><circle cx="0" cy="-41" r="7" fill="#ffffff" stroke="#5f6373" stroke-width="1.2" /><path d="M-7 -42a7 7 0 0 1 14 0z" fill="#5f6373" />
      <line class="wave" x1="6" y1="-30" x2="15" y2="-46" stroke="#5f6373" stroke-width="2.6" stroke-linecap="round" />
    </g>
    <g transform="translate(236 546) scale(2.5)">
      <line x1="-2" y1="-14" x2="-2" y2="0" stroke="#5f6373" stroke-width="2.6" stroke-linecap="round" /><line x1="2" y1="-14" x2="2" y2="0" stroke="#5f6373" stroke-width="2.6" stroke-linecap="round" />
      <path d="M-8 -14 -5 -33h10l3 19z" fill="#f5a3c7" stroke="#5f6373" stroke-width="1" /><circle cx="0" cy="-40" r="7" fill="#ffffff" stroke="#5f6373" stroke-width="1.2" /><circle cx="-6" cy="-44" r="3.4" fill="#5f6373" />
    </g>
    <!-- age tags, once filled in -->
    <g v-if="tag(0)" class="bob" data-cy="ages-scene-tag-1">
      <rect x="100" y="334" width="72" height="46" rx="23" fill="#5f6373" opacity=".06" transform="translate(0 3)" />
      <rect x="100" y="334" width="72" height="46" rx="23" fill="#ffffff" /><path d="M128 378l8 14 10-14z" fill="#ffffff" />
      <text x="136" y="364" class="ages-scene__tag" text-anchor="middle">{{ tag(0) }}</text>
    </g>
    <g v-if="tag(1)" class="bob" style="animation-delay:-1.4s" data-cy="ages-scene-tag-2">
      <rect x="206" y="318" width="72" height="46" rx="23" fill="#5f6373" opacity=".06" transform="translate(0 3)" />
      <rect x="206" y="318" width="72" height="46" rx="23" fill="#ffffff" /><path d="M226 362l4 14 12-14z" fill="#ffffff" />
      <text x="242" y="348" class="ages-scene__tag" text-anchor="middle">{{ tag(1) }}</text>
    </g>
    <g transform="translate(410 540)"><path class="tail" d="M7 -3q9-1 8-11" stroke="#5f6373" stroke-width="2" fill="none" stroke-linecap="round" /><path d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z" fill="#5f6373" /></g>
  </svg>
</template>

<style scoped>
.ages-scene { display: block; width: 100%; height: clamp(280px, 38vw, 520px); border-radius: 24px; }
.ages-scene__tag { font-family: inherit; font-size: 22px; font-weight: 600; fill: var(--text-primary, #1d1d24); }
.ages-scene__small { font-family: inherit; font-size: 11px; font-weight: 600; fill: #5f6373; }
.bob { animation: bob 3.2s ease-in-out infinite alternate; }
@keyframes bob { from { transform: translateY(0); } to { transform: translateY(-6px); } }
.lit { animation: lit 14s ease-in-out infinite alternate; }
@keyframes lit { 0%, 40% { fill: #e9ecf6; } 60%, 100% { fill: #f5a3c7; } }
.tail { transform-box: fill-box; transform-origin: 0 100%; animation: tail 2.4s ease-in-out infinite; }
@keyframes tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
.wave { transform-box: fill-box; transform-origin: 10% 90%; animation: wave 1.6s ease-in-out infinite; }
@keyframes wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-28deg); } }
@media (prefers-reduced-motion: reduce) {
  .bob, .lit, .tail, .wave { animation: none; }
}
</style>
