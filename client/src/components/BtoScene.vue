<!--
  BtoScene.vue – the "Your BTO" step illustration: a new HDB block rising floor by floor beside a crane, in an
  estate with an MRT train gliding past the skyline. Two future residents wave from the site hoarding, a
  neighbour strolls by and the cat sits on the hoarding. Two white "wish" bubbles float above.

  Usage:
    <BtoScene :move-in-by-year="2031" />

  CSS only (no script animation). Colours read the --color-* custom properties with hex fallbacks, like
  EstateScene.vue. Decorative: one aria-label on the SVG. Holds still under prefers-reduced-motion.
  Design reference: the "Calm · Plan your BTO — Step 3: Your BTO" board.
-->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  // The user's "must move in by" year, shown on the keys bubble; without one it keeps its example text.
  moveInByYear: { type: [Number, String], default: null },
});

const keysLabel = computed(() => `Keys by ${props.moveInByYear || 2031}`);
// One floor per row of windows, bottom to top; each floor drops in a beat after the one below (fl1 … fl6).
const FLOOR_YS = [324, 290, 256, 222, 188, 154];
// Which of the five windows on each floor light up, and when (seconds into the 14 s cycle).
const LIT = [{ 1: '-4s', 4: '-9s' }, { 0: '-2s', 3: '-7s' }, { 2: '-12s' }, { 1: '-5s', 4: '-10s' }, { 0: '-8s', 3: '-3s' }, { 2: '-6s' }];
const WINDOW_XS = [187, 219, 251, 283, 315];
</script>

<template>
  <svg
    class="bto-scene"
    viewBox="0 0 560 470"
    role="img"
    aria-label="A new HDB block rising floor by floor beside a crane, in a Singapore estate with an MRT train gliding past the skyline. Two future residents wave from the site hoarding while a neighbour strolls by."
    data-cy="bto-scene"
  >
    <defs><clipPath id="bto-scene-below-jib"><rect x="0" y="72" width="560" height="400" /></clipPath></defs>

    <!-- far skyline -->
    <g class="bs-slate" opacity=".07">
      <rect x="10" y="150" width="50" height="250" /><rect x="60" y="200" width="40" height="200" /><rect x="112" y="120" width="60" height="280" /><rect x="124" y="104" width="20" height="16" />
      <rect x="372" y="140" width="56" height="260" /><rect x="428" y="186" width="60" height="214" /><rect x="496" y="128" width="56" height="272" /><rect x="508" y="112" width="18" height="16" />
    </g>
    <g class="bs-white" opacity=".45">
      <rect x="35" y="150" width="25" height="250" /><rect x="146" y="120" width="26" height="280" /><rect x="402" y="140" width="26" height="260" /><rect x="526" y="128" width="26" height="272" />
    </g>
    <!-- mid skyline -->
    <g class="bs-slate" opacity=".12"><rect x="92" y="282" width="70" height="118" /><rect x="360" y="262" width="84" height="138" /><rect x="468" y="292" width="92" height="108" /></g>
    <path class="bs-line-white" stroke-opacity=".5" stroke-width="3" d="M92 302h70M92 326h70M360 284h84M360 308h84M360 332h84M468 312h92M468 336h92" />

    <!-- viaduct + MRT -->
    <g class="bs-slate" opacity=".14"><rect x="72" y="226" width="14" height="174" /><rect x="470" y="226" width="14" height="174" /></g>
    <g class="bs-train">
      <rect class="bs-white" x="0" y="190" width="200" height="26" rx="6" />
      <path class="bs-white" d="M194 190h6q14 0 16 16v10h-22z" />
      <rect class="bs-slate" x="6" y="195" width="188" height="10" rx="3" />
      <line class="bs-line-white" x1="6" y1="200" x2="194" y2="200" stroke-width="10" stroke-dasharray="2 22" stroke-dashoffset="-22" />
      <path class="bs-slate" d="M198 195h4q8 1 10 10h-14z" />
      <rect class="bs-border" x="99" y="190" width="2" height="26" />
      <rect class="bs-pink" x="0" y="209" width="214" height="3" />
    </g>
    <line class="bs-line-slate" x1="0" y1="214" x2="560" y2="214" stroke-opacity=".45" stroke-width="1.5" />
    <rect class="bs-slate" x="0" y="216" width="560" height="10" opacity=".22" />

    <!-- hills -->
    <path class="bs-blush" d="M0 382Q120 350 250 370T520 362T560 368V470H0Z" />
    <path class="bs-pink" d="M-10 404Q140 380 300 398T570 394V470H-10Z" opacity=".45" />

    <!-- neighbouring HDB block -->
    <rect class="bs-pink" x="12" y="236" width="106" height="9" rx="4" />
    <rect class="bs-white" x="18" y="243" width="94" height="160" rx="8" />
    <g class="bs-peri">
      <rect x="28" y="258" width="18" height="14" rx="3" /><rect class="bs-lit" style="animation-delay:-3s" x="56" y="258" width="18" height="14" rx="3" /><rect x="84" y="258" width="18" height="14" rx="3" />
      <rect class="bs-lit" style="animation-delay:-8s" x="28" y="288" width="18" height="14" rx="3" /><rect x="56" y="288" width="18" height="14" rx="3" /><rect class="bs-lit" style="animation-delay:-1s" x="84" y="288" width="18" height="14" rx="3" />
      <rect x="28" y="318" width="18" height="14" rx="3" /><rect x="56" y="318" width="18" height="14" rx="3" /><rect class="bs-lit" style="animation-delay:-11s" x="84" y="318" width="18" height="14" rx="3" />
      <rect x="28" y="348" width="18" height="14" rx="3" /><rect class="bs-lit" style="animation-delay:-6s" x="56" y="348" width="18" height="14" rx="3" /><rect x="84" y="348" width="18" height="14" rx="3" />
    </g>

    <!-- crane -->
    <rect class="bs-pink" x="424" y="20" width="8" height="20" rx="2" />
    <path class="bs-line-slate" d="M428 22 160 60M428 22 520 60" stroke-opacity=".5" stroke-width="1.5" />
    <rect class="bs-pink" x="420" y="66" width="16" height="336" />
    <path class="bs-line-slate" d="M420 84 436 110 420 136 436 162 420 188 436 214 420 240 436 266 420 292 436 318 420 344 436 370 420 396" stroke-opacity=".5" stroke-width="1.5" stroke-linejoin="round" />
    <rect class="bs-slate" x="408" y="398" width="40" height="8" rx="3" />
    <rect class="bs-pink" x="150" y="60" width="380" height="12" rx="3" />
    <rect class="bs-slate" x="472" y="72" width="46" height="24" rx="5" />
    <rect class="bs-blush" x="400" y="38" width="56" height="24" rx="6" />
    <rect class="bs-white" x="408" y="44" width="18" height="10" rx="3" />
    <rect class="bs-slate" x="250" y="66" width="22" height="10" rx="3" />
    <g clip-path="url(#bto-scene-below-jib)">
      <g class="bs-hook">
        <line class="bs-line-slate" x1="261" y1="-200" x2="261" y2="104" stroke-width="2" />
        <path class="bs-slate" d="M255 104h12v6a6 6 0 0 1-12 0z" />
        <rect class="bs-pinkdeep" x="226" y="116" width="70" height="10" rx="3" />
      </g>
    </g>

    <!-- new block, floor by floor: void deck, six floors, roof -->
    <g class="bs-floor bs-floor--0">
      <rect class="bs-white" x="170" y="366" width="180" height="26" opacity=".55" />
      <rect class="bs-white" x="170" y="358" width="180" height="9" rx="3" />
      <path class="bs-line-slate bs-round" d="M180 367V392M224 367V392M296 367V392M340 367V392" stroke-width="2" />
      <rect class="bs-slate" x="246" y="384" width="28" height="5" rx="2.5" />
    </g>
    <g v-for="(y, i) in FLOOR_YS" :key="y" class="bs-floor" :class="`bs-floor--${i + 1}`">
      <rect class="bs-white bs-floor__slab" x="170" :y="y" width="180" height="34" rx="5" stroke-width="2" />
      <g class="bs-peri">
        <rect
          v-for="(x, w) in WINDOW_XS" :key="x"
          :class="{ 'bs-lit': LIT[i][w] }" :style="LIT[i][w] ? { animationDelay: LIT[i][w] } : null"
          :x="x" :y="y + 10" width="18" height="14" rx="3"
        />
      </g>
    </g>
    <g class="bs-floor bs-floor--7">
      <rect class="bs-pinkdeep" x="164" y="146" width="192" height="10" rx="4" />
      <rect class="bs-white" x="236" y="128" width="48" height="20" rx="6" />
    </g>

    <!-- trees -->
    <circle class="bs-pink" cx="132" cy="374" r="20" /><circle class="bs-blush" cx="125" cy="367" r="7" />
    <path class="bs-line-slate bs-round" d="M132 420V374M132 398l-10-10M132 388l8-10" stroke-width="2" />
    <circle class="bs-pink" cx="536" cy="362" r="24" /><circle class="bs-blush" cx="528" cy="354" r="9" />
    <path class="bs-line-slate bs-round" d="M536 420V362M536 392l-12-12M536 378l10-12" stroke-width="2" />

    <!-- ground, footpath, road -->
    <path class="bs-white" d="M0 408Q160 394 300 402T560 398V470H0Z" />
    <rect class="bs-border" x="0" y="440" width="560" height="30" />
    <line class="bs-line-white" x1="0" y1="456" x2="560" y2="456" stroke-width="3" stroke-dasharray="30 22" />

    <!-- site hoarding -->
    <path class="bs-line-slate bs-round" d="M150 404V438M370 404V438" stroke-width="2" />
    <rect class="bs-blush" x="146" y="406" width="228" height="28" rx="4" />
    <path class="bs-line-pink" d="M146 416h228M146 425h228" stroke-width="2" />

    <!-- cat on the hoarding -->
    <g transform="translate(350 406)">
      <path class="bs-line-slate bs-round bs-tail" d="M7 -3q9-1 8-11" stroke-width="2" />
      <path class="bs-slate" d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z" />
    </g>

    <!-- future residents, waving -->
    <g transform="translate(472 438)">
      <path class="bs-line-slate bs-round" d="M-2 -16V0M2 -16V0" stroke-width="2.6" />
      <rect class="bs-slate" x="-7" y="-34" width="14" height="20" rx="5" />
      <circle class="bs-white bs-outline" cx="0" cy="-41" r="7" stroke-width="1.2" />
      <path class="bs-slate" d="M-7 -42a7 7 0 0 1 14 0z" />
      <line class="bs-line-slate bs-round bs-wave" x1="6" y1="-30" x2="15" y2="-46" stroke-width="2.6" />
    </g>
    <g transform="translate(496 438)">
      <path class="bs-line-slate bs-round" d="M-2 -14V0M2 -14V0" stroke-width="2.6" />
      <path class="bs-pink bs-outline" d="M-8 -14 -5 -33h10l3 19z" stroke-width="1" />
      <circle class="bs-white bs-outline" cx="0" cy="-40" r="7" stroke-width="1.2" />
      <circle class="bs-slate" cx="-6" cy="-44" r="3.4" />
    </g>

    <!-- neighbour strolling by -->
    <g class="bs-stroll">
      <g transform="translate(0 438)">
        <line class="bs-line-slate bs-round bs-leg" x1="-2" y1="-16" x2="-2" y2="0" stroke-width="2.6" />
        <line class="bs-line-slate bs-round bs-leg bs-leg--b" x1="2" y1="-16" x2="2" y2="0" stroke-width="2.6" />
        <rect class="bs-blush bs-outline" x="-7" y="-34" width="14" height="20" rx="5" stroke-width="1" />
        <circle class="bs-white bs-outline" cx="0" cy="-41" r="7" stroke-width="1.2" />
        <path class="bs-slate" d="M-7 -42a7 7 0 0 1 14 0z" />
      </g>
    </g>

    <!-- wish bubbles -->
    <g class="bs-bubble">
      <rect class="bs-slate" x="20" y="166" width="148" height="40" rx="20" opacity=".06" transform="translate(0 3)" />
      <rect class="bs-white" x="20" y="166" width="148" height="40" rx="20" />
      <path class="bs-white" d="M118 204l12 14 2-14z" />
      <text class="bs-bubble__text" x="94" y="191">Near my parents</text>
    </g>
    <g class="bs-bubble" style="animation-delay:-1.4s">
      <rect class="bs-slate" x="436" y="314" width="120" height="40" rx="20" opacity=".06" transform="translate(0 3)" />
      <rect class="bs-white" x="436" y="314" width="120" height="40" rx="20" />
      <path class="bs-white" d="M474 352l4 14 14-14z" />
      <text class="bs-bubble__text" x="496" y="339" data-cy="bto-scene-keys">{{ keysLabel }}</text>
    </g>
  </svg>
</template>

<style scoped>
.bto-scene { display: block; width: 100%; height: auto; }

/* palette */
.bs-white    { fill: var(--color-white, #ffffff); }
.bs-peri     { fill: var(--color-periwinkle, #e9ecf6); }
.bs-blush    { fill: var(--color-blush, #fbd5e5); }
.bs-pink     { fill: var(--color-pink, #f5a3c7); }
.bs-pinkdeep { fill: var(--color-pink-deep, #f08ab6); }
.bs-slate    { fill: var(--color-slate, #5f6373); }
.bs-border   { fill: var(--border, #dfe2ea); }
.bs-outline  { stroke: var(--color-slate, #5f6373); }
.bs-floor__slab { stroke: var(--color-periwinkle, #e9ecf6); }
.bs-line-white, .bs-line-slate, .bs-line-pink { fill: none; }
.bs-line-white { stroke: var(--color-white, #ffffff); }
.bs-line-slate { stroke: var(--color-slate, #5f6373); }
.bs-line-pink  { stroke: var(--color-pink, #f5a3c7); }
.bs-round { stroke-linecap: round; }

.bs-bubble__text { font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif); font-size: 15px; font-weight: 500; fill: var(--color-ink, #1d1d24); text-anchor: middle; }

/* motion: the block goes up a floor at a time over 14 s, holds, then clears and starts again */
.bs-floor { transform-box: fill-box; animation: 14s ease-out infinite; }
.bs-floor--0 { animation-name: bs-fl0; }
.bs-floor--1 { animation-name: bs-fl1; }
.bs-floor--2 { animation-name: bs-fl2; }
.bs-floor--3 { animation-name: bs-fl3; }
.bs-floor--4 { animation-name: bs-fl4; }
.bs-floor--5 { animation-name: bs-fl5; }
.bs-floor--6 { animation-name: bs-fl6; }
.bs-floor--7 { animation-name: bs-fl7; }
.bs-hook { animation: bs-hook 3.2s ease-in-out infinite alternate; }
.bs-bubble { animation: bs-bob 3.2s ease-in-out infinite alternate; }
.bs-train { animation: bs-train 18s linear infinite; }
.bs-stroll { animation: bs-stroll 26s linear -6s infinite; }
.bs-leg { transform-box: fill-box; transform-origin: 50% 0; animation: bs-swing .65s ease-in-out infinite alternate; }
.bs-leg--b { animation-direction: alternate-reverse; }
.bs-lit { animation: bs-lit 14s ease-in-out infinite alternate; }
.bs-tail { transform-box: fill-box; transform-origin: 0 100%; animation: bs-tail 2.4s ease-in-out infinite; }
.bs-wave { transform-box: fill-box; transform-origin: 10% 90%; animation: bs-wave 1.6s ease-in-out infinite; }

@keyframes bs-fl0 { 0%, 4%  { opacity: 0; transform: translateY(-28px); } 9%, 90%  { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl1 { 0%, 13% { opacity: 0; transform: translateY(-28px); } 18%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl2 { 0%, 22% { opacity: 0; transform: translateY(-28px); } 27%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl3 { 0%, 31% { opacity: 0; transform: translateY(-28px); } 36%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl4 { 0%, 40% { opacity: 0; transform: translateY(-28px); } 45%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl5 { 0%, 49% { opacity: 0; transform: translateY(-28px); } 54%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl6 { 0%, 58% { opacity: 0; transform: translateY(-28px); } 63%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-fl7 { 0%, 67% { opacity: 0; transform: translateY(-28px); } 72%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; transform: translateY(0); } }
@keyframes bs-hook { from { transform: translateY(0); } to { transform: translateY(34px); } }
@keyframes bs-bob { from { transform: translateY(0); } to { transform: translateY(-6px); } }
@keyframes bs-train { from { transform: translateX(-240px); } to { transform: translateX(640px); } }
@keyframes bs-stroll { from { transform: translateX(-40px); } to { transform: translateX(600px); } }
@keyframes bs-swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes bs-lit { 0%, 40% { fill: var(--color-periwinkle, #e9ecf6); } 60%, 100% { fill: var(--color-pink, #f5a3c7); } }
@keyframes bs-tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
@keyframes bs-wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-28deg); } }

/* Held still, the block shows finished. */
@media (prefers-reduced-motion: reduce) {
  .bs-floor, .bs-hook, .bs-bubble, .bs-train, .bs-stroll, .bs-leg, .bs-lit, .bs-tail, .bs-wave { animation: none; }
}
</style>
