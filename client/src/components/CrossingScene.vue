<!--
  CrossingScene (Calm home board, CalmHome.dc.html): two paths to a home. On the left a crane builds a BTO block
  floor by floor; on the right a removal van waits outside a mature resale block under a rain tree. A resident from
  each side walks to the middle and they meet where the paths cross. CSS animation only; everything holds still
  under prefers-reduced-motion, and the speech bubbles hide below 768px where they would be too small to read.
  Replaces HeroScene on the home page.
-->
<template>
  <div ref="frame" class="cs-frame" :class="{ 'cs-paused': paused }">
    <svg
      class="cs"
      data-cy="hero-scene"
      viewBox="0 0 1200 380"
      role="img"
      aria-label="Two paths to a home. On the left a crane builds a new BTO block floor by floor; on the right a removal van waits outside a mature resale block under a rain tree. A resident from each side walks towards the middle and they meet where the two paths cross."
    >
      <g class="cs-cloud"><rect x="0" y="40" width="96" height="26" rx="13" class="cs-white" /><rect x="24" y="26" width="48" height="28" rx="14" class="cs-white" /></g>
      <g class="cs-cloud2"><rect x="0" y="92" width="70" height="20" rx="10" class="cs-white" opacity=".8" /></g>
      <g class="cs-slate" opacity=".07"><rect x="20" y="170" width="70" height="140" /><rect x="420" y="150" width="60" height="160" /><rect x="480" y="190" width="80" height="120" /><rect x="640" y="160" width="70" height="150" /><rect x="710" y="200" width="60" height="110" /><rect x="1150" y="180" width="50" height="130" /></g>
      <g class="cs-white" opacity=".45"><rect x="55" y="170" width="35" height="140" /><rect x="450" y="150" width="30" height="160" /><rect x="675" y="160" width="35" height="150" /></g>

      <!-- BTO: a crane building a block -->
      <rect x="296" y="62" width="12" height="250" class="cs-pink" />
      <path d="M296 80 308 100 296 120 308 140 296 160 308 180 296 200 308 220 296 240 308 260 296 280 308 300" class="cs-line" stroke-width="1.2" fill="none" />
      <rect x="110" y="56" width="300" height="10" rx="3" class="cs-pink" />
      <rect x="350" y="66" width="46" height="18" rx="4" class="cs-slate" />
      <rect x="286" y="38" width="34" height="18" rx="5" class="cs-blush" />
      <g class="cs-hook"><line x1="200" y1="66" x2="200" y2="96" class="cs-line" stroke-width="1.6" /><path d="M195 96h10v5a5 5 0 0 1-10 0z" class="cs-slate" /><rect x="172" y="106" width="56" height="9" rx="3" class="cs-pink" /></g>
      <g v-for="(y, i) in [272, 242, 212]" :key="y" class="cs-fl" :class="`cs-fl${i}`">
        <rect x="140" :y="y" width="120" height="30" rx="4" class="cs-white cs-floor" />
        <g class="cs-blush"><rect v-for="x in [152, 178, 206, 232]" :key="x" :x="x" :y="y + 8" width="16" height="12" rx="3" /></g>
      </g>
      <g class="cs-fl cs-fl3"><rect x="136" y="204" width="128" height="8" rx="3" class="cs-pink" /></g>

      <!-- resale: a mature block, lights coming on -->
      <rect x="852" y="142" width="196" height="10" rx="4" class="cs-pinkdeep" />
      <rect x="860" y="150" width="180" height="150" rx="6" class="cs-white" />
      <g class="cs-peri">
        <template v-for="(row, r) in WINDOWS" :key="r">
          <rect
            v-for="(lit, c) in row"
            :key="c"
            :x="874 + c * 30"
            :y="164 + r * 26"
            width="18"
            height="13"
            rx="3"
            :class="{ 'cs-lit': lit !== null }"
            :style="lit !== null ? { animationDelay: `-${lit}s` } : undefined"
          />
        </template>
      </g>
      <rect x="860" y="270" width="180" height="5" class="cs-peri" />
      <rect x="870" y="275" width="162" height="34" class="cs-peri" opacity=".7" />
      <g class="cs-white"><rect x="864" y="275" width="8" height="34" /><rect x="924" y="275" width="8" height="34" /><rect x="984" y="275" width="8" height="34" /><rect x="1032" y="275" width="8" height="34" /></g>

      <!-- hills, ground, road -->
      <path d="M0 300Q300 262 600 290T1200 276V380H0Z" class="cs-blush" />
      <path d="M0 330Q600 304 1200 330V380H0Z" class="cs-white" />
      <rect x="0" y="352" width="1200" height="28" class="cs-road" />
      <line x1="0" y1="366" x2="1200" y2="366" class="cs-dash" stroke-width="2.5" stroke-dasharray="26 18" />

      <g class="cs-sway">
        <path d="M1110 330V250M1110 280l-24-22M1110 270l20-24" class="cs-line" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <ellipse cx="1110" cy="232" rx="72" ry="30" class="cs-pink" /><ellipse cx="1080" cy="242" rx="30" ry="12" class="cs-blush" /><ellipse cx="1140" cy="222" rx="22" ry="9" class="cs-blush" />
      </g>
      <g class="cs-blush"><rect v-for="x in [120, 152, 184, 216, 248]" :key="x" :x="x" y="300" width="14" height="30" /></g>

      <!-- removal van and a cat -->
      <rect x="740" y="318" width="76" height="40" rx="7" class="cs-pink" />
      <rect x="740" y="348" width="76" height="6" class="cs-pinkdeep" />
      <path d="M816 330h16q9 0 11 11v15h-27z" class="cs-white" />
      <path d="M820 334h10q6 0 7 7h-17z" class="cs-peri" />
      <circle cx="760" cy="358" r="8" class="cs-slate" /><circle cx="760" cy="358" r="3" class="cs-road" />
      <circle cx="828" cy="358" r="8" class="cs-slate" /><circle cx="828" cy="358" r="3" class="cs-road" />
      <g transform="translate(1048 330)"><path class="cs-tail cs-line" d="M7 -3q9-1 8-11" stroke-width="2" fill="none" stroke-linecap="round" /><path d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z" class="cs-slate" /></g>

      <!-- where the paths cross -->
      <g class="cs-meet" data-cy="hero-scene-meet"><circle class="cs-pulse cs-berry" cx="600" cy="318" r="9" /><circle cx="600" cy="318" r="9" class="cs-berry" /><circle cx="600" cy="318" r="3.5" class="cs-white" /></g>

      <!-- the BTO walker (ink top) and the resale walker (pink top) -->
      <g class="cs-goR"><g transform="translate(330 320) scale(1.2)">
        <line class="cs-leg cs-line" x1="-2" y1="-16" x2="-2" y2="0" stroke-width="2.6" stroke-linecap="round" />
        <line class="cs-leg cs-leg-b cs-line" x1="2" y1="-16" x2="2" y2="0" stroke-width="2.6" stroke-linecap="round" />
        <rect x="-7" y="-34" width="14" height="20" rx="5" class="cs-ink" />
        <circle cx="0" cy="-41" r="7" class="cs-white cs-line" stroke-width="1.2" />
        <path d="M-7 -42a7 7 0 0 1 14 0z" class="cs-slate" />
      </g></g>
      <g class="cs-goL"><g transform="translate(872 320) scale(1.2)">
        <line class="cs-leg cs-leg-b cs-line" x1="-2" y1="-14" x2="-2" y2="0" stroke-width="2.6" stroke-linecap="round" />
        <line class="cs-leg cs-line" x1="2" y1="-14" x2="2" y2="0" stroke-width="2.6" stroke-linecap="round" />
        <path d="M-8 -14 -5 -33h10l3 19z" class="cs-pink cs-line" stroke-width="1" />
        <circle cx="0" cy="-40" r="7" class="cs-white cs-line" stroke-width="1.2" />
        <circle cx="-6" cy="-44" r="3.4" class="cs-slate" />
      </g></g>

      <!-- speech bubbles -->
      <g class="cs-bubbles" font-size="15" font-weight="500" text-anchor="middle">
        <g class="cs-bob"><rect x="40" y="96" width="200" height="40" rx="20" class="cs-slate" opacity=".06" transform="translate(0 3)" /><rect x="40" y="96" width="200" height="40" rx="20" class="cs-white" /><path d="M150 134l8 12 6-12z" class="cs-white" /><text x="140" y="121" class="cs-ink">BTO · keys in years</text></g>
        <g class="cs-bob" style="animation-delay: -1.4s"><rect x="890" y="88" width="210" height="40" rx="20" class="cs-slate" opacity=".06" transform="translate(0 3)" /><rect x="890" y="88" width="210" height="40" rx="20" class="cs-white" /><path d="M940 126l-4 12 14-12z" class="cs-white" /><text x="995" y="113" class="cs-ink">Resale · keys in months</text></g>
        <g class="cs-bob" style="animation-delay: -0.7s"><rect x="480" y="232" width="240" height="40" rx="20" class="cs-slate" opacity=".06" transform="translate(0 3)" /><rect x="480" y="232" width="240" height="40" rx="20" class="cs-white" /><path d="M592 270l8 12 8-12z" class="cs-white" /><text x="600" y="257" class="cs-ink">Where do the paths cross?</text></g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

// UI.md (Illustrations): pause the loops while the scene is off-screen or the tab is in the background.
const frame = ref(null);
const offScreen = ref(false);
const hiddenTab = ref(false);
const paused = ref(false);
const sync = () => { paused.value = offScreen.value || hiddenTab.value; };
const onVisibility = () => { hiddenTab.value = document.hidden; sync(); };
let observer = null;
onMounted(() => {
  if ('IntersectionObserver' in window && frame.value) {
    observer = new IntersectionObserver(([e]) => { offScreen.value = !e.isIntersecting; sync(); });
    observer.observe(frame.value);
  }
  document.addEventListener('visibilitychange', onVisibility);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  document.removeEventListener('visibilitychange', onVisibility);
});

// The resale block's windows, row by row: null stays periwinkle, a number lights up pink on that animation delay (s).
const WINDOWS = [
  [null, 3, null, null, 8],
  [6, null, null, 1, null],
  [null, 10, null, null, null],
  [null, null, 4, null, 7],
];
</script>

<style scoped>
.cs-frame {
  background: var(--accent-fill-3);
  border: 1px solid var(--bg-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.cs { display: block; width: 100%; height: auto; font-family: var(--font-body); }

.cs-white { fill: var(--bg-surface); }
.cs-peri { fill: var(--accent-fill-3); }
.cs-blush { fill: var(--accent-fill-2); }
.cs-pink { fill: var(--accent-fill-1); }
.cs-pinkdeep { fill: var(--color-pink-deep, #f08ab6); }
.cs-berry { fill: var(--color-berry, #b23a78); }
.cs-slate { fill: var(--text-secondary); }
.cs-ink { fill: var(--text-primary); }
.cs-road { fill: var(--border); }
.cs-line { stroke: var(--text-secondary); }
.cs-dash { stroke: var(--bg-surface); }
.cs-floor { stroke: var(--accent-fill-3); stroke-width: 2; }
.cs-fl0 .cs-floor { stroke: none; }

.cs-cloud { animation: cs-drift 34s linear infinite; }
.cs-cloud2 { animation: cs-drift 46s linear -20s infinite; }
@keyframes cs-drift { from { transform: translateX(-160px); } to { transform: translateX(1320px); } }

/* The block goes up a floor at a time, holds, then starts again. */
.cs-fl { transform-box: fill-box; }
.cs-fl0 { animation: cs-fl0 12s ease-out infinite; }
.cs-fl1 { animation: cs-fl1 12s ease-out infinite; }
.cs-fl2 { animation: cs-fl2 12s ease-out infinite; }
.cs-fl3 { animation: cs-fl3 12s ease-out infinite; }
@keyframes cs-fl0 { 0%, 4% { opacity: 0; transform: translateY(-30px); } 9%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; } }
@keyframes cs-fl1 { 0%, 18% { opacity: 0; transform: translateY(-30px); } 23%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; } }
@keyframes cs-fl2 { 0%, 32% { opacity: 0; transform: translateY(-30px); } 37%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; } }
@keyframes cs-fl3 { 0%, 46% { opacity: 0; transform: translateY(-30px); } 51%, 90% { opacity: 1; transform: translateY(0); } 96%, 100% { opacity: 0; } }

.cs-hook { animation: cs-hook 1.68s ease-in-out infinite; }
@keyframes cs-hook { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(60px); } }

.cs-lit { animation: cs-lit 12s ease-in-out infinite alternate; }
@keyframes cs-lit { 0%, 40% { fill: var(--accent-fill-3); } 60%, 100% { fill: var(--accent-fill-1); } }

/* The two residents walk 250 units towards each other, meet, then fade and start again. */
.cs-goR { animation: cs-goR 12s ease-in-out infinite; }
@keyframes cs-goR { 0% { transform: translateX(0); opacity: 0; } 5% { opacity: 1; } 55%, 88% { transform: translateX(250px); opacity: 1; } 96%, 100% { transform: translateX(250px); opacity: 0; } }
.cs-goL { animation: cs-goL 12s ease-in-out infinite; }
@keyframes cs-goL { 0% { transform: translateX(0); opacity: 0; } 5% { opacity: 1; } 55%, 88% { transform: translateX(-250px); opacity: 1; } 96%, 100% { transform: translateX(-250px); opacity: 0; } }
.cs-leg { transform-box: fill-box; transform-origin: 50% 0; animation: cs-swing 0.6s ease-in-out infinite alternate; }
.cs-leg-b { animation-direction: alternate-reverse; }
@keyframes cs-swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }

.cs-meet { transform-box: fill-box; transform-origin: center; animation: cs-meet 12s ease-out infinite; }
@keyframes cs-meet { 0%, 52% { transform: scale(0); opacity: 0; } 58% { transform: scale(1.2); opacity: 1; } 62%, 90% { transform: scale(1); opacity: 1; } 96%, 100% { opacity: 0; } }
.cs-pulse { transform-box: fill-box; transform-origin: center; animation: cs-pulse 2s ease-out infinite; }
@keyframes cs-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }

.cs-bob { animation: cs-bob 3.2s ease-in-out infinite alternate; }
@keyframes cs-bob { from { transform: translateY(0); } to { transform: translateY(-5px); } }
.cs-tail { transform-box: fill-box; transform-origin: 0 100%; animation: cs-tail 2.4s ease-in-out infinite; }
@keyframes cs-tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
.cs-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: cs-sway 5s ease-in-out infinite alternate; }
@keyframes cs-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }

.cs-paused * { animation-play-state: paused !important; }

/* Still picture: the block built, the residents met, the lights as they are. */
@media (prefers-reduced-motion: reduce) {
  .cs-cloud, .cs-cloud2, .cs-fl0, .cs-fl1, .cs-fl2, .cs-fl3, .cs-hook, .cs-lit, .cs-goR, .cs-goL, .cs-leg,
  .cs-meet, .cs-pulse, .cs-bob, .cs-tail, .cs-sway { animation: none; }
  .cs-goR { transform: translateX(250px); }
  .cs-goL { transform: translateX(-250px); }
}
@media (max-width: 767px) { .cs-bubbles { display: none; } }
</style>
