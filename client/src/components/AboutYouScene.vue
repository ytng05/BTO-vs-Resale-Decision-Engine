<!--
  AboutYouScene.vue – illustration for onboarding step 2 ("About you"), in the same flat style as
  EstateScene.vue and the step 3 crane scene. Two buyers stand together outside their HDB block;
  laundry flaps on bamboo poles, a kite flies and children play on a see-saw.

  Props (all optional, so it works as pure decoration first):
    buyers    1 or 2       – shows the second buyer and switches the bubble between "Just me" and "Two of us"
    moveBy    year or null – shows a "Keys by <year>" bubble when set

  Usage, inside the left feature card on PlanView step 2:
    <AboutYouScene :buyers="store.profile.applicants.length" :move-by="2030" />

  CSS only. Colours read the --color-* custom properties with hex fallbacks. Decorative: one aria-label.
  Holds still under prefers-reduced-motion. Design reference: canvas board "Calm · Onboarding step 2, about you".
-->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  buyers: { type: Number, default: 2 },
  moveBy: { type: [Number, String], default: null },
});

const household = computed(() => (props.buyers >= 2 ? 'Two of us' : 'Just me'));
</script>

<template>
  <svg
    class="about-scene"
    data-cy="about-you-scene"
    viewBox="0 0 560 470"
    role="img"
    :aria-label="`${household === 'Two of us' ? 'Two buyers stand together' : 'A buyer stands'} outside an HDB block, waving. Laundry flaps on bamboo poles, a kite flies and two children play on a see-saw.`"
  >
    <!-- sky and skyline -->
    <g class="ay-cloud"><rect class="ay-white" x="0" y="40" width="86" height="24" rx="12"/><rect class="ay-white" x="20" y="28" width="44" height="26" rx="13"/></g>
    <g class="ay-slate" opacity=".07"><rect x="10" y="200" width="50" height="210"/><rect x="60" y="240" width="40" height="170"/><rect x="170" y="170" width="60" height="240"/><rect x="300" y="190" width="50" height="220"/><rect x="350" y="230" width="70" height="180"/><rect x="470" y="180" width="50" height="230"/><rect x="520" y="230" width="40" height="180"/></g>
    <g class="ay-white" opacity=".45"><rect x="35" y="200" width="25" height="210"/><rect x="200" y="170" width="30" height="240"/><rect x="325" y="190" width="25" height="220"/><rect x="495" y="180" width="25" height="230"/></g>

    <!-- kite -->
    <line class="ay-line-slate" x1="330" y1="98" x2="438" y2="212" stroke-opacity=".5" stroke-width="1"/>
    <g class="ay-kite">
      <path class="ay-pink" d="M330 70l18 28-18 28-18-28z"/>
      <path class="ay-line-white" stroke-width="1.5" d="M330 70v56M312 98h36"/>
      <path class="ay-line-slate" stroke-width="1.2" d="M330 126q-8 14 4 26t-2 30"/>
      <g class="ay-blush"><rect x="326" y="138" width="9" height="5" rx="2"/><rect x="329" y="158" width="9" height="5" rx="2"/></g>
    </g>

    <!-- HDB blocks -->
    <rect class="ay-pink" x="26" y="228" width="128" height="10" rx="4"/>
    <rect class="ay-white" x="32" y="236" width="116" height="180" rx="8"/>
    <g class="ay-peri">
      <rect x="46" y="252" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-3s" x="80" y="252" width="18" height="14" rx="3"/><rect x="114" y="252" width="18" height="14" rx="3"/>
      <rect class="ay-lit" style="animation-delay:-7s" x="46" y="282" width="18" height="14" rx="3"/><rect x="80" y="282" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-1s" x="114" y="282" width="18" height="14" rx="3"/>
      <rect x="46" y="312" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-9s" x="80" y="312" width="18" height="14" rx="3"/><rect x="114" y="312" width="18" height="14" rx="3"/>
      <rect x="46" y="342" width="18" height="14" rx="3"/><rect x="80" y="342" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-5s" x="114" y="342" width="18" height="14" rx="3"/>
    </g>
    <!-- laundry poles out of the window -->
    <path class="ay-line-slate" stroke-width="1.6" d="M148 262h44M148 300h40"/>
    <path class="ay-white ay-flap" d="M154 262h12l3 4-3 2v12h-12v-12l-3-2z"/>
    <rect class="ay-pink ay-flap" style="animation-delay:-.7s" x="173" y="262" width="12" height="20" rx="2"/>
    <path class="ay-blush ay-flap" style="animation-delay:-1.2s" d="M156 300h10l3 18h-16z"/>
    <rect class="ay-white ay-flap" style="animation-delay:-.4s" x="174" y="300" width="6" height="10" rx="2"/>
    <rect class="ay-pinkdeep" x="434" y="202" width="122" height="10" rx="4"/>
    <rect class="ay-white" x="440" y="210" width="116" height="206" rx="8"/>
    <g class="ay-peri">
      <rect x="454" y="226" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-4s" x="488" y="226" width="18" height="14" rx="3"/><rect x="522" y="226" width="18" height="14" rx="3"/>
      <rect x="454" y="256" width="18" height="14" rx="3"/><rect x="488" y="256" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-8s" x="522" y="256" width="18" height="14" rx="3"/>
      <rect class="ay-lit" style="animation-delay:-2s" x="454" y="286" width="18" height="14" rx="3"/><rect x="488" y="286" width="18" height="14" rx="3"/><rect x="522" y="286" width="18" height="14" rx="3"/>
      <rect x="454" y="316" width="18" height="14" rx="3"/><rect class="ay-lit" style="animation-delay:-6s" x="488" y="316" width="18" height="14" rx="3"/><rect x="522" y="316" width="18" height="14" rx="3"/>
    </g>

    <!-- hills, trees, ground, road -->
    <path class="ay-blush" d="M0 382Q140 342 280 368T560 358V470H0Z"/>
    <path class="ay-pink" opacity=".45" d="M0 410Q200 382 380 402T560 398V470H0Z"/>
    <circle class="ay-pink" cx="182" cy="358" r="20"/><circle class="ay-blush" cx="176" cy="352" r="7"/>
    <path class="ay-line-slate" stroke-width="2" d="M182 410V358M182 380l-10-10M182 370l8-9"/>
    <circle class="ay-pink" cx="410" cy="364" r="16"/><circle class="ay-blush" cx="405" cy="359" r="6"/>
    <path class="ay-line-slate" stroke-width="2" d="M410 412V364M410 384l-8-8M410 376l7-8"/>
    <path class="ay-white" d="M0 420Q280 404 560 418V470H0Z"/>
    <rect class="ay-border" x="0" y="448" width="560" height="22"/>
    <line class="ay-line-white" x1="0" y1="459" x2="560" y2="459" stroke-width="2.5" stroke-dasharray="22 16"/>

    <!-- bubbles -->
    <g class="ay-bob">
      <rect class="ay-slate" opacity=".06" x="220" y="297" width="96" height="36" rx="18"/>
      <rect class="ay-white" x="220" y="294" width="96" height="36" rx="18"/><path class="ay-white" d="M264 328l6 12 8-12z"/>
      <text class="ay-text" x="268" y="317">{{ household }}</text>
    </g>
    <g v-if="moveBy" class="ay-bob" style="animation-delay:-1.4s">
      <rect class="ay-slate" opacity=".06" x="380" y="31" width="150" height="36" rx="18"/>
      <rect class="ay-white" x="380" y="28" width="150" height="36" rx="18"/><path class="ay-white" d="M412 62l-4 12 14-12z"/>
      <text class="ay-text" x="455" y="51">Keys by {{ moveBy }}</text>
    </g>

    <!-- buyers -->
    <g transform="translate(252 422) scale(1.3)">
      <g class="ay-lean">
        <path class="ay-line-slate" stroke-width="2.6" d="M-3 -16v16M3 -16v16"/>
        <rect class="ay-slate" x="-7" y="-34" width="14" height="20" rx="5"/>
        <line class="ay-line-slate ay-wave" x1="6" y1="-30" x2="14" y2="-44" stroke-width="2.4"/>
        <circle class="ay-white ay-outline" cx="0" cy="-41" r="7" stroke-width="1.2"/>
        <path class="ay-slate" d="M-7 -42a7 7 0 0 1 14 0z"/>
      </g>
    </g>
    <g v-if="buyers >= 2" transform="translate(290 422) scale(1.3)">
      <g class="ay-lean" style="animation-delay:-1.5s">
        <path class="ay-line-slate" stroke-width="2.6" d="M-3 -14v14M3 -14v14"/>
        <path class="ay-pink ay-outline" stroke-width="1" d="M-8 -14 -5 -33h10l3 19z"/>
        <line class="ay-line-slate" x1="-6" y1="-28" x2="-14" y2="-18" stroke-width="2.4"/>
        <circle class="ay-white ay-outline" cx="0" cy="-40" r="7" stroke-width="1.2"/>
        <circle class="ay-slate" cx="-6" cy="-44" r="3.4"/>
      </g>
    </g>

    <!-- see-saw at the playground -->
    <path class="ay-slate" d="M484 422l8-16 8 16z"/>
    <g class="ay-seesaw">
      <rect class="ay-pinkdeep" x="452" y="401" width="80" height="5" rx="2.5"/>
      <rect class="ay-blush ay-outline" x="454" y="386" width="10" height="15" rx="4" stroke-width=".8"/>
      <circle class="ay-white ay-outline" cx="459" cy="380" r="5" stroke-width="1"/><path class="ay-slate" d="M454 380a5 5 0 0 1 10 0z"/>
      <rect class="ay-pink ay-outline" x="520" y="386" width="10" height="15" rx="4" stroke-width=".8"/>
      <circle class="ay-white ay-outline" cx="525" cy="380" r="5" stroke-width="1"/><circle class="ay-slate" cx="521" cy="377" r="2.4"/>
    </g>

    <!-- cat and a passer-by -->
    <g transform="translate(432 422)">
      <path class="ay-line-slate ay-tail" stroke-width="2" d="M7 -3q9-1 8-11"/>
      <path class="ay-slate" d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z"/>
    </g>
    <g class="ay-stroll"><g transform="translate(0 444)">
      <line class="ay-line-slate ay-leg" x1="-2" y1="-14" x2="-2" y2="0" stroke-width="2.4"/>
      <line class="ay-line-slate ay-leg ay-leg--b" x1="2" y1="-14" x2="2" y2="0" stroke-width="2.4"/>
      <rect class="ay-blush ay-outline" x="-6" y="-30" width="12" height="17" rx="4" stroke-width="1"/>
      <circle class="ay-white ay-outline" cx="0" cy="-36" r="6" stroke-width="1.2"/>
      <path class="ay-slate" d="M-6 -37a6 6 0 0 1 12 0z"/>
    </g></g>
  </svg>
</template>

<style scoped>
.about-scene { display: block; width: 100%; height: auto; border-radius: 20px; }

/* palette */
.ay-white    { fill: var(--color-white, #ffffff); }
.ay-peri     { fill: var(--color-periwinkle, #e9ecf6); }
.ay-blush    { fill: var(--color-blush, #fbd5e5); }
.ay-pink     { fill: var(--color-pink, #f5a3c7); }
.ay-pinkdeep { fill: var(--color-pink-deep, #f08ab6); }
.ay-slate    { fill: var(--color-slate, #5f6373); }
.ay-border   { fill: var(--border, #dfe2ea); }
.ay-outline  { stroke: var(--color-slate, #5f6373); }
.ay-line-slate, .ay-line-white { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.ay-line-slate { stroke: var(--color-slate, #5f6373); }
.ay-line-white { stroke: var(--color-white, #ffffff); stroke-linecap: butt; }
.ay-text { font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif); font-size: 14px; font-weight: 500; fill: var(--color-ink, #1d1d24); text-anchor: middle; }

/* motion */
.ay-cloud { animation: ay-drift 30s linear infinite; }
.ay-kite { transform-box: fill-box; transform-origin: 50% 0; animation: ay-kite 4s ease-in-out infinite alternate; }
.ay-flap { transform-box: fill-box; transform-origin: 50% 0; animation: ay-flap 1.8s ease-in-out infinite alternate; }
.ay-seesaw { transform-box: view-box; transform-origin: 492px 404px; animation: ay-seesaw 2.6s ease-in-out infinite alternate; }
.ay-lit { animation: ay-lit 12s ease-in-out infinite alternate; }
.ay-wave { transform-box: fill-box; transform-origin: 0 100%; animation: ay-wave 1.4s ease-in-out infinite; }
.ay-lean { transform-box: fill-box; transform-origin: 50% 100%; animation: ay-lean 3s ease-in-out infinite alternate; }
.ay-stroll { animation: ay-stroll 24s linear -8s infinite; }
.ay-leg { transform-box: fill-box; transform-origin: 50% 0; animation: ay-swing .65s ease-in-out infinite alternate; }
.ay-leg--b { animation-direction: alternate-reverse; }
.ay-tail { transform-box: fill-box; transform-origin: 0 100%; animation: ay-tail 2.4s ease-in-out infinite; }
.ay-bob { animation: ay-bob 3.2s ease-in-out infinite alternate; }

@keyframes ay-drift { from { transform: translateX(-140px); } to { transform: translateX(660px); } }
@keyframes ay-kite { from { transform: translate(0, 0) rotate(-5deg); } to { transform: translate(6px, -8px) rotate(6deg); } }
@keyframes ay-flap { from { transform: rotate(-6deg); } to { transform: rotate(8deg); } }
@keyframes ay-seesaw { from { transform: rotate(-10deg); } to { transform: rotate(10deg); } }
@keyframes ay-lit { 0%, 40% { fill: var(--color-periwinkle, #e9ecf6); } 60%, 100% { fill: var(--color-pink, #f5a3c7); } }
@keyframes ay-wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
@keyframes ay-lean { from { transform: rotate(-2deg); } to { transform: rotate(3deg); } }
@keyframes ay-stroll { from { transform: translateX(600px); } to { transform: translateX(-60px); } }
@keyframes ay-swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes ay-tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
@keyframes ay-bob { from { transform: translateY(0); } to { transform: translateY(-5px); } }

@media (prefers-reduced-motion: reduce) {
  .ay-cloud, .ay-kite, .ay-flap, .ay-seesaw, .ay-lit, .ay-wave, .ay-lean, .ay-stroll, .ay-leg, .ay-tail, .ay-bob { animation: none; }
}
</style>
