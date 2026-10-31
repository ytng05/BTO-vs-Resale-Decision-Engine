<!--
  ResaleScene.vue – illustration for onboarding step 4 ("Resale flat"), in the same flat style as
  EstateScene.vue and AboutYouScene.vue. A mature estate: a removal van outside an older block with a
  void deck, a mover carrying boxes in, a buyer waving, a big rain tree, neighbourhood shops with a
  striped awning, birds crossing the afternoon sun and one window glowing where the new home is. Where the BTO step shows a crane (keys in years), this one shows a van (keys in months).

  Props (optional):
    lease      remaining-lease band label, e.g. "70 to 79" – shows a "<band> years left" bubble when set
    keysLabel  text for the top bubble (default "Keys in months")

  Usage, inside the left feature card on PlanView's resale step:
    <ResaleScene :lease="leaseLabel" />   (leaseLabel: the LEASE_BANDS label without " years")

  CSS only. Colours read the --color-* custom properties with hex fallbacks. Decorative: one aria-label.
  Holds still under prefers-reduced-motion. Design reference: canvas board "Calm · Onboarding step 4, resale flat".
-->
<script setup>
defineProps({
  lease: { type: String, default: null },
  keysLabel: { type: String, default: 'Keys in months' },
});
</script>

<template>
  <svg
    class="resale-scene"
    data-cy="resale-scene"
    viewBox="0 0 560 470"
    role="img"
    aria-label="A mature HDB estate: a removal van is parked outside an older block, a mover carries boxes to the void deck where a buyer waves, and one window glows where the new home is. Neighbourhood shops sit behind and birds fly past the afternoon sun."
  >
    <!-- sky and skyline -->
    <g class="rs-cloud"><rect class="rs-white" x="0" y="44" width="86" height="24" rx="12"/><rect class="rs-white" x="20" y="32" width="44" height="26" rx="13"/></g>
    <g class="rs-slate" opacity=".07"><rect x="0" y="210" width="50" height="200"/><rect x="290" y="180" width="60" height="230"/><rect x="350" y="230" width="50" height="180"/><rect x="420" y="190" width="60" height="220"/><rect x="500" y="220" width="60" height="190"/></g>
    <g class="rs-white" opacity=".45"><rect x="25" y="210" width="25" height="200"/><rect x="320" y="180" width="30" height="230"/><rect x="450" y="190" width="30" height="220"/></g>

    <!-- afternoon sun and birds -->
    <circle class="rs-blush rs-sunhalo" cx="300" cy="86" r="30"/>
    <circle class="rs-blush" cx="300" cy="86" r="30"/>
    <g class="rs-fly">
      <g class="rs-flapw"><path class="rs-line-slate" stroke-width="1.6" d="M0 120q6-7 12 0q6-7 12 0"/></g>
      <g class="rs-flapw" style="animation-delay:-.2s"><path class="rs-line-slate" stroke-width="1.4" d="M28 108q5-6 10 0q5-6 10 0"/></g>
    </g>

    <!-- neighbourhood centre with a striped awning -->
    <rect class="rs-white" x="296" y="300" width="176" height="86" rx="4"/>
    <rect class="rs-pinkdeep" x="344" y="308" width="80" height="10" rx="3"/>
    <rect class="rs-white" x="290" y="324" width="188" height="14"/>
    <line class="rs-line-pink" x1="290" y1="331" x2="478" y2="331" stroke-width="14" stroke-dasharray="12 12"/>
    <path class="rs-pink" opacity=".6" d="M290 338q6 6 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12 0"/>
    <g class="rs-peri"><rect x="304" y="350" width="32" height="30" rx="3"/><rect x="344" y="350" width="32" height="30" rx="3"/><rect x="384" y="350" width="32" height="30" rx="3"/><rect x="424" y="350" width="32" height="30" rx="3"/></g>

    <!-- mature block with void deck -->
    <rect class="rs-pinkdeep" x="44" y="190" width="232" height="12" rx="4"/>
    <rect class="rs-white" x="52" y="200" width="216" height="180" rx="6"/>
    <g class="rs-peri">
      <rect x="66" y="214" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-2s" x="102" y="214" width="20" height="14" rx="3"/><rect x="138" y="214" width="20" height="14" rx="3"/><rect x="174" y="214" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-8s" x="210" y="214" width="20" height="14" rx="3"/><rect x="246" y="214" width="14" height="14" rx="3"/>
      <rect class="rs-lit" style="animation-delay:-5s" x="66" y="242" width="20" height="14" rx="3"/><rect x="102" y="242" width="20" height="14" rx="3"/><rect x="138" y="242" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-1s" x="174" y="242" width="20" height="14" rx="3"/><rect x="210" y="242" width="20" height="14" rx="3"/><rect x="246" y="242" width="14" height="14" rx="3"/>
      <rect x="66" y="270" width="20" height="14" rx="3"/><rect x="102" y="270" width="20" height="14" rx="3"/><rect x="174" y="270" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-10s" x="210" y="270" width="20" height="14" rx="3"/><rect x="246" y="270" width="14" height="14" rx="3"/>
      <rect x="66" y="298" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-6s" x="102" y="298" width="20" height="14" rx="3"/><rect x="138" y="298" width="20" height="14" rx="3"/><rect x="174" y="298" width="20" height="14" rx="3"/><rect x="210" y="298" width="20" height="14" rx="3"/><rect x="246" y="298" width="14" height="14" rx="3"/>
      <rect x="66" y="326" width="20" height="14" rx="3"/><rect x="102" y="326" width="20" height="14" rx="3"/><rect x="138" y="326" width="20" height="14" rx="3"/><rect class="rs-lit" style="animation-delay:-3s" x="174" y="326" width="20" height="14" rx="3"/><rect x="210" y="326" width="20" height="14" rx="3"/><rect x="246" y="326" width="14" height="14" rx="3"/>
    </g>
    <rect class="rs-pink rs-halo" x="136" y="268" width="24" height="18" rx="4"/>
    <rect class="rs-pink rs-home" x="138" y="270" width="20" height="14" rx="3"/>
    <rect class="rs-peri" x="52" y="352" width="216" height="6"/>
    <rect class="rs-peri" x="70" y="358" width="188" height="58" opacity=".7"/>
    <g class="rs-white"><rect x="60" y="358" width="10" height="58"/><rect x="128" y="358" width="10" height="58"/><rect x="196" y="358" width="10" height="58"/><rect x="258" y="358" width="10" height="58"/></g>

    <!-- hills and the rain tree -->
    <path class="rs-blush" d="M276 384Q400 352 560 370V470H276Z"/>
    <path class="rs-pink" opacity=".45" d="M0 412Q200 390 380 404T560 400V470H0Z"/>
    <g class="rs-sway">
      <path class="rs-line-slate" stroke-width="2.4" d="M476 420V330M476 360l-26-24M476 350l22-26M476 372l-14-12"/>
      <ellipse class="rs-pink" cx="476" cy="310" rx="70" ry="30"/>
      <ellipse class="rs-blush" cx="446" cy="320" rx="30" ry="12"/>
      <ellipse class="rs-blush" cx="508" cy="298" rx="22" ry="9"/>
    </g>

    <!-- ground and road -->
    <path class="rs-white" d="M0 420Q280 406 560 418V470H0Z"/>
    <rect class="rs-border" x="0" y="448" width="560" height="22"/>
    <line class="rs-line-white" x1="0" y1="459" x2="560" y2="459" stroke-width="2.5" stroke-dasharray="22 16"/>

    <!-- removal van -->
    <rect class="rs-pink" x="300" y="370" width="84" height="46" rx="8"/>
    <rect class="rs-pinkdeep" x="300" y="404" width="84" height="8"/>
    <path class="rs-white" d="M384 386h18q10 0 12 12v18h-30z"/>
    <path class="rs-peri" d="M388 390h12q6 0 8 8h-20z"/>
    <rect class="rs-pinkdeep" x="296" y="370" width="6" height="40" rx="2"/>
    <circle class="rs-slate" cx="322" cy="418" r="9"/><circle class="rs-border" cx="322" cy="418" r="3.5"/>
    <circle class="rs-slate" cx="398" cy="418" r="9"/><circle class="rs-border" cx="398" cy="418" r="3.5"/>

    <!-- boxes and the cat -->
    <rect class="rs-blush rs-outline" x="214" y="398" width="28" height="22" rx="3" stroke-width="1"/>
    <rect class="rs-blush rs-outline" x="244" y="404" width="22" height="16" rx="3" stroke-width="1"/>
    <rect class="rs-blush rs-outline" x="219" y="380" width="20" height="18" rx="3" stroke-width="1"/>
    <path class="rs-line-pinkdeep" stroke-width="2" d="M228 398v22M255 404v16M229 380v18"/>
    <g transform="translate(250 404)">
      <path class="rs-line-slate rs-tail" stroke-width="2" d="M7 -3q9-1 8-11"/>
      <path class="rs-slate" d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z"/>
    </g>

    <!-- buyer waving at the void deck -->
    <g transform="translate(168 420) scale(1.25)">
      <path class="rs-line-slate" stroke-width="2.6" d="M-3 -14v14M3 -14v14"/>
      <path class="rs-pink rs-outline" stroke-width="1" d="M-8 -14 -5 -33h10l3 19z"/>
      <line class="rs-line-slate rs-wave" x1="6" y1="-28" x2="14" y2="-42" stroke-width="2.4"/>
      <circle class="rs-white rs-outline" cx="0" cy="-40" r="7" stroke-width="1.2"/>
      <circle class="rs-slate" cx="-6" cy="-44" r="3.4"/>
    </g>

    <!-- mover carrying a box from the van -->
    <g class="rs-carry"><g transform="translate(340 426) scale(1.2)">
      <line class="rs-line-slate rs-leg" x1="-2" y1="-16" x2="-2" y2="0" stroke-width="2.6"/>
      <line class="rs-line-slate rs-leg rs-leg--b" x1="2" y1="-16" x2="2" y2="0" stroke-width="2.6"/>
      <rect class="rs-slate" x="-7" y="-34" width="14" height="20" rx="5"/>
      <rect class="rs-blush rs-outline" x="-18" y="-34" width="18" height="14" rx="2" stroke-width="1"/>
      <circle class="rs-white rs-outline" cx="0" cy="-41" r="7" stroke-width="1.2"/>
      <path class="rs-slate" d="M-7 -42a7 7 0 0 1 14 0z"/>
    </g></g>

    <!-- bubbles -->
    <g class="rs-bob">
      <rect class="rs-slate" opacity=".06" x="380" y="37" width="160" height="36" rx="18"/>
      <rect class="rs-white" x="380" y="34" width="160" height="36" rx="18"/><path class="rs-white" d="M416 68l-4 12 14-12z"/>
      <text class="rs-text" x="460" y="57">{{ keysLabel }}</text>
    </g>
    <g v-if="lease" class="rs-bob" style="animation-delay:-1.6s">
      <rect class="rs-slate" opacity=".06" x="74" y="167" width="172" height="36" rx="18"/>
      <rect class="rs-white" x="74" y="164" width="172" height="36" rx="18"/><path class="rs-white" d="M140 198l6 12 8-12z"/>
      <text class="rs-text" x="160" y="187">{{ lease }} years left</text>
    </g>
  </svg>
</template>

<style scoped>
.resale-scene { display: block; width: 100%; height: auto; border-radius: 20px; }

/* palette */
.rs-white    { fill: var(--color-white, #ffffff); }
.rs-peri     { fill: var(--color-periwinkle, #e9ecf6); }
.rs-blush    { fill: var(--color-blush, #fbd5e5); }
.rs-pink     { fill: var(--color-pink, #f5a3c7); }
.rs-pinkdeep { fill: var(--color-pink-deep, #f08ab6); }
.rs-slate    { fill: var(--color-slate, #5f6373); }
.rs-border   { fill: var(--border, #dfe2ea); }
.rs-outline  { stroke: var(--color-slate, #5f6373); }
.rs-line-slate, .rs-line-white, .rs-line-pink, .rs-line-pinkdeep { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.rs-line-pink     { stroke: var(--color-pink, #f5a3c7); stroke-linecap: butt; }
.rs-line-slate    { stroke: var(--color-slate, #5f6373); }
.rs-line-white    { stroke: var(--color-white, #ffffff); stroke-linecap: butt; }
.rs-line-pinkdeep { stroke: var(--color-pink-deep, #f08ab6); stroke-linecap: butt; }
.rs-text { font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif); font-size: 14px; font-weight: 500; fill: var(--color-ink, #1d1d24); text-anchor: middle; }

/* motion */
.rs-cloud { animation: rs-drift 30s linear infinite; }
.rs-sunhalo { transform-box: fill-box; transform-origin: center; animation: rs-sunhalo 4s ease-out infinite; }
.rs-fly { animation: rs-fly 20s linear infinite; }
.rs-flapw { transform-box: fill-box; transform-origin: 50% 100%; animation: rs-flapw .45s ease-in-out infinite alternate; }
.rs-lit { animation: rs-lit 12s ease-in-out infinite alternate; }
.rs-home { animation: rs-home 2.4s ease-in-out infinite; }
.rs-halo { transform-box: fill-box; transform-origin: center; animation: rs-halo 2.4s ease-out infinite; }
.rs-carry { animation: rs-carry 7s linear infinite; }
.rs-leg { transform-box: fill-box; transform-origin: 50% 0; animation: rs-swing .6s ease-in-out infinite alternate; }
.rs-leg--b { animation-direction: alternate-reverse; }
.rs-wave { transform-box: fill-box; transform-origin: 0 100%; animation: rs-wave 1.4s ease-in-out infinite; }
.rs-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: rs-sway 5s ease-in-out infinite alternate; }
.rs-tail { transform-box: fill-box; transform-origin: 0 100%; animation: rs-tail 2.4s ease-in-out infinite; }
.rs-bob { animation: rs-bob 3.2s ease-in-out infinite alternate; }

@keyframes rs-drift { from { transform: translateX(-140px); } to { transform: translateX(660px); } }
@keyframes rs-sunhalo { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes rs-fly { from { transform: translate(-60px, 20px); } to { transform: translate(600px, -10px); } }
@keyframes rs-flapw { from { transform: scaleY(1); } to { transform: scaleY(-.4); } }
@keyframes rs-lit { 0%, 40% { fill: var(--color-periwinkle, #e9ecf6); } 60%, 100% { fill: var(--color-pink, #f5a3c7); } }
@keyframes rs-home { 0%, 100% { fill: var(--color-pink, #f5a3c7); } 50% { fill: var(--color-pink-deep, #f08ab6); } }
@keyframes rs-halo { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes rs-carry { 0% { transform: translateX(0); opacity: 0; } 6% { opacity: 1; } 86% { opacity: 1; } 100% { transform: translateX(-120px); opacity: 0; } }
@keyframes rs-swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes rs-wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
@keyframes rs-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }
@keyframes rs-tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
@keyframes rs-bob { from { transform: translateY(0); } to { transform: translateY(-5px); } }

@media (prefers-reduced-motion: reduce) {
  .rs-cloud, .rs-sunhalo, .rs-fly, .rs-flapw, .rs-lit, .rs-home, .rs-halo, .rs-carry, .rs-leg, .rs-wave, .rs-sway, .rs-tail, .rs-bob { animation: none; }
  .rs-halo { opacity: 0; }
  .rs-carry { transform: translateX(-50px); }
}
</style>
