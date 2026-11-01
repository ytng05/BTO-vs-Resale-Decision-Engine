<!--
  EstateScene.vue – full-bleed Singapore estate illustration that sits behind a card of content.
  Flat vector in the Calm palette: layered skyline, MRT train on the viaduct, HDB blocks with
  windows lighting up, a bus pulling up, residents walking, a cyclist and the void-deck cat.
  Floating white "wish" bubbles echo the onboarding choices. Each carries an `is-on` class
  when its key is in `wishes`, as a hook only: bubbles stay white by design.

  Usage:
    <EstateScene :wishes="['parents', 'moveby']">
      <div class="card">…step 1 content…</div>
    </EstateScene>

  CSS only (no script animation). Colours read the --color-* custom properties with hex
  fallbacks, like HeroScene.vue. Decorative: one aria-label on the SVG. Holds still under
  prefers-reduced-motion. Design reference: the "Calm · Onboarding, transport-scene
  illustration" board on the canvas.
-->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Keys of the choices the user has ticked: parents, moveby, monthly, space, value.
  wishes: { type: Array, default: () => [] },
  // The user's "must move in by" year, shown on the moveby bubble; without one it keeps its example text.
  moveInByYear: { type: [Number, String], default: null },
});

// Bubble positions are in the SVG's 1240 × 860 coordinate space.
const baseBubbles = [
  { key: 'value',   label: 'Holds its value',       x: 40,   y: 52,  w: 150, tail: 'M150 92l14 14 2-14z',   delay: '0s' },
  { key: 'monthly', label: 'Under S$1,500 a month', x: 984,  y: 40,  w: 216, tail: 'M1020 80l-6 16 22-16z', delay: '-1.2s' },
  { key: 'parents', label: 'Near my parents',       x: 110,  y: 642, w: 160, tail: 'M228 682l12 16 4-16z',  delay: '-.6s' },
  { key: 'moveby',  label: 'Keys before 2030',      x: 660,  y: 682, w: 168, tail: 'M760 722l14 12-2-12z',  delay: '-2s' },
  { key: 'space',   label: 'A bit more space',      x: 1050, y: 628, w: 166, tail: 'M1110 668l-4 14 18-14z', delay: '-2.6s' },
];
const bubbles = computed(() =>
  baseBubbles.map((b) => (b.key === 'moveby' && props.moveInByYear ? { ...b, label: `Keys by ${props.moveInByYear}` } : b)),
);

const isOn = (key) => props.wishes.includes(key);
</script>

<template>
  <div class="estate" data-cy="estate-scene">
    <svg
      class="estate__art"
      viewBox="0 0 1240 860"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="A Singapore estate: an MRT train glides along the viaduct, a bus pulls up to a stop, residents walk under a covered walkway and a cyclist rides by. Speech bubbles float with home wishes."
    >
      <!-- far skyline -->
      <g class="es-slate" opacity=".07">
        <rect x="20" y="300" width="80" height="340"/><rect x="100" y="360" width="60" height="280"/><rect x="250" y="260" width="110" height="380"/><rect x="270" y="236" width="30" height="24"/><rect x="360" y="330" width="70" height="310"/>
        <rect x="480" y="220" width="70" height="420"/><rect x="550" y="290" width="100" height="350"/><rect x="700" y="240" width="90" height="400"/><rect x="790" y="320" width="60" height="320"/>
        <rect x="880" y="200" width="70" height="440"/><rect x="895" y="180" width="30" height="20"/><rect x="950" y="280" width="110" height="360"/><rect x="1100" y="250" width="80" height="390"/><rect x="1180" y="330" width="60" height="310"/>
      </g>
      <g class="es-white" opacity=".45">
        <rect x="60" y="300" width="40" height="340"/><rect x="305" y="260" width="55" height="380"/><rect x="515" y="220" width="35" height="420"/><rect x="745" y="240" width="45" height="400"/><rect x="915" y="200" width="35" height="440"/><rect x="1140" y="250" width="40" height="390"/>
      </g>
      <!-- mid skyline -->
      <g class="es-slate" opacity=".12">
        <rect x="150" y="420" width="90" height="220"/><rect x="430" y="400" width="120" height="240"/><rect x="640" y="380" width="70" height="260"/><rect x="820" y="430" width="120" height="210"/><rect x="1090" y="410" width="90" height="230"/>
      </g>
      <path class="es-line-white" stroke-opacity=".5" stroke-width="2" d="M150 450h90M150 480h90M150 510h90M430 430h120M430 460h120M430 490h120M820 460h120M820 490h120M820 520h120"/>

      <!-- viaduct columns -->
      <g class="es-slate" opacity=".14"><rect x="230" y="168" width="26" height="472"/><rect x="630" y="168" width="26" height="472"/><rect x="1030" y="168" width="26" height="472"/></g>

      <!-- MRT train -->
      <g class="es-train">
        <rect class="es-white" x="0" y="104" width="380" height="48" rx="10"/>
        <path class="es-white" d="M370 104h12q24 0 28 30v18h-40z"/>
        <rect class="es-ink" x="10" y="112" width="360" height="18" rx="4"/>
        <line class="es-line-white" x1="10" y1="121" x2="370" y2="121" stroke-width="18" stroke-dasharray="2 38" stroke-dashoffset="-38"/>
        <path class="es-ink" d="M376 112h8q14 2 18 20h-26z"/>
        <rect class="es-border" x="125" y="104" width="3" height="48"/><rect class="es-border" x="252" y="104" width="3" height="48"/>
        <rect class="es-pink" x="0" y="138" width="408" height="5"/>
      </g>
      <!-- viaduct deck and railing -->
      <line class="es-line-slate" x1="0" y1="141" x2="1240" y2="141" stroke-opacity=".45" stroke-width="2"/>
      <line class="es-line-slate" x1="0" y1="146" x2="1240" y2="146" stroke-opacity=".45" stroke-width="10" stroke-dasharray="3 13"/>
      <rect class="es-slate" x="0" y="152" width="1240" height="16" opacity=".22"/>
      <rect class="es-slate" x="0" y="168" width="1240" height="6" opacity=".1"/>

      <!-- HDB blocks -->
      <rect class="es-pink" x="52" y="372" width="166" height="10" rx="4"/>
      <rect class="es-white" x="60" y="380" width="150" height="260" rx="8"/>
      <g class="es-peri">
        <rect x="76" y="398" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-2s" x="108" y="398" width="18" height="14" rx="3"/><rect x="140" y="398" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-6s" x="172" y="398" width="18" height="14" rx="3"/>
        <rect class="es-lit" style="animation-delay:-4s" x="76" y="430" width="18" height="14" rx="3"/><rect x="108" y="430" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-9s" x="140" y="430" width="18" height="14" rx="3"/><rect x="172" y="430" width="18" height="14" rx="3"/>
        <rect x="76" y="462" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-1s" x="108" y="462" width="18" height="14" rx="3"/><rect x="140" y="462" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-11s" x="172" y="462" width="18" height="14" rx="3"/>
        <rect class="es-lit" style="animation-delay:-7s" x="76" y="494" width="18" height="14" rx="3"/><rect x="108" y="494" width="18" height="14" rx="3"/><rect x="140" y="494" width="18" height="14" rx="3"/><rect x="172" y="494" width="18" height="14" rx="3"/>
        <rect x="76" y="526" width="18" height="14" rx="3"/><rect x="108" y="526" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-3s" x="140" y="526" width="18" height="14" rx="3"/><rect x="172" y="526" width="18" height="14" rx="3"/>
      </g>
      <rect class="es-pinkdeep" x="1002" y="330" width="156" height="10" rx="4"/>
      <rect class="es-white" x="1010" y="338" width="140" height="302" rx="8"/>
      <g class="es-peri">
        <rect x="1026" y="356" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-5s" x="1058" y="356" width="18" height="14" rx="3"/><rect x="1090" y="356" width="18" height="14" rx="3"/><rect x="1122" y="356" width="18" height="14" rx="3"/>
        <rect class="es-lit" style="animation-delay:-8s" x="1026" y="388" width="18" height="14" rx="3"/><rect x="1058" y="388" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-2s" x="1090" y="388" width="18" height="14" rx="3"/><rect x="1122" y="388" width="18" height="14" rx="3"/>
        <rect x="1026" y="420" width="18" height="14" rx="3"/><rect x="1058" y="420" width="18" height="14" rx="3"/><rect x="1090" y="420" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-10s" x="1122" y="420" width="18" height="14" rx="3"/>
        <rect class="es-lit" style="animation-delay:-6s" x="1026" y="452" width="18" height="14" rx="3"/><rect x="1058" y="452" width="18" height="14" rx="3"/><rect x="1090" y="452" width="18" height="14" rx="3"/><rect x="1122" y="452" width="18" height="14" rx="3"/>
        <rect x="1026" y="484" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-12s" x="1058" y="484" width="18" height="14" rx="3"/><rect x="1090" y="484" width="18" height="14" rx="3"/><rect x="1122" y="484" width="18" height="14" rx="3"/>
        <rect x="1026" y="516" width="18" height="14" rx="3"/><rect x="1058" y="516" width="18" height="14" rx="3"/><rect class="es-lit" style="animation-delay:-4s" x="1090" y="516" width="18" height="14" rx="3"/><rect x="1122" y="516" width="18" height="14" rx="3"/>
      </g>

      <!-- hills -->
      <path class="es-blush" d="M0 640Q160 572 340 612T700 600T1000 590T1240 612V860H0Z"/>
      <path class="es-pink" opacity=".45" d="M-20 704Q240 636 520 678T1000 662T1260 684V860H-20Z"/>

      <!-- trees -->
      <circle class="es-pink" cx="430" cy="664" r="24"/><circle class="es-blush" cx="422" cy="656" r="9"/>
      <path class="es-line-ink" stroke-width="2" d="M430 724V664M430 692l-12-12M430 680l10-12"/>
      <circle class="es-pink" cx="508" cy="650" r="32"/><circle class="es-blush" cx="498" cy="640" r="12"/>
      <path class="es-line-ink" stroke-width="2" d="M508 730V650M508 686l-16-16M508 672l14-16M492 670l-8-10"/>
      <circle class="es-pink" cx="940" cy="668" r="22"/><circle class="es-blush" cx="933" cy="661" r="8"/>
      <path class="es-line-ink" stroke-width="2" d="M940 726V668M940 694l-11-11M940 682l9-11"/>

      <!-- ground, footpath, road -->
      <path class="es-white" d="M0 762Q300 734 620 754T1240 746V860H0Z"/>
      <rect class="es-border" x="0" y="822" width="1240" height="38"/>
      <line class="es-line-white" x1="0" y1="842" x2="1240" y2="842" stroke-width="2" stroke-dasharray="30 22"/>

      <!-- covered walkway -->
      <rect class="es-pinkdeep" x="620" y="734" width="300" height="10" rx="4"/>
      <path class="es-line-ink" stroke-width="2" d="M636 744V800M716 744V800M796 744V800M876 744V800M904 744V800"/>

      <!-- bus shelter with a waiting resident -->
      <rect class="es-pinkdeep" x="1080" y="690" width="152" height="12" rx="4"/>
      <path class="es-line-ink" stroke-width="2" d="M1092 702V800M1222 702V800"/>
      <rect class="es-blush" x="1152" y="704" width="64" height="72" rx="4"/>
      <path class="es-line-pink" stroke-width="2" d="M1152 722h64M1152 740h64M1152 758h64"/>
      <rect class="es-ink" x="1100" y="772" width="48" height="6" rx="3"/>
      <g transform="translate(1124 800)">
        <rect class="es-ink" x="-4" y="-16" width="3.5" height="16" rx="1.75"/><rect class="es-ink" x="1" y="-16" width="3.5" height="16" rx="1.75"/>
        <path class="es-pinkdeep es-outline" stroke-width="1" d="M-8 -14 -5 -33h10l3 19z"/>
        <circle class="es-white es-outline" stroke-width="1.2" cx="0" cy="-40" r="7"/>
        <circle class="es-ink" cx="-6" cy="-44" r="3.4"/>
      </g>

      <!-- cat -->
      <g transform="translate(990 800)">
        <path class="es-line-ink es-tail" stroke-width="2" d="M7 -3q9-1 8-11"/>
        <path class="es-ink" d="M-6 0q-2-10 3-14l-1-6 3 3h3l2-3v7q5 4 4 13z"/>
      </g>

      <!-- strolling residents -->
      <g class="es-stroll">
        <g transform="translate(0 800)">
          <line class="es-line-ink es-leg" stroke-width="2.6" x1="-2" y1="-16" x2="-2" y2="0"/>
          <line class="es-line-ink es-leg es-leg--b" stroke-width="2.6" x1="2" y1="-16" x2="2" y2="0"/>
          <rect class="es-ink" x="-7" y="-34" width="14" height="20" rx="5"/>
          <circle class="es-white es-outline" stroke-width="1.2" cx="0" cy="-41" r="7"/>
          <path class="es-ink" d="M-7 -42a7 7 0 0 1 14 0z"/>
        </g>
        <g transform="translate(22 800)">
          <line class="es-line-ink es-leg es-leg--b" stroke-width="2.6" x1="-2" y1="-14" x2="-2" y2="0"/>
          <line class="es-line-ink es-leg" stroke-width="2.6" x1="2" y1="-14" x2="2" y2="0"/>
          <path class="es-pink es-outline" stroke-width="1" d="M-8 -14 -5 -33h10l3 19z"/>
          <circle class="es-white es-outline" stroke-width="1.2" cx="0" cy="-40" r="7"/>
          <circle class="es-ink" cx="-6" cy="-44" r="3.4"/>
        </g>
      </g>
      <g class="es-stroll es-stroll--late">
        <g transform="translate(0 800)">
          <line class="es-line-ink es-leg" stroke-width="2.6" x1="-2" y1="-16" x2="-2" y2="0"/>
          <line class="es-line-ink es-leg es-leg--b" stroke-width="2.6" x1="2" y1="-16" x2="2" y2="0"/>
          <rect class="es-blush es-outline" stroke-width="1" x="-7" y="-34" width="14" height="20" rx="5"/>
          <circle class="es-white es-outline" stroke-width="1.2" cx="0" cy="-41" r="7"/>
          <path class="es-ink" d="M-7 -42a7 7 0 0 1 14 0z"/>
        </g>
      </g>

      <!-- cyclist -->
      <g class="es-ride">
        <g transform="translate(0 800)">
          <g class="es-spin"><circle class="es-line-ink" stroke-width="2" cx="-14" cy="-10" r="10"/><path class="es-line-ink" stroke-width="1.2" d="M-24 -10h20M-14 -20v20"/></g>
          <g class="es-spin"><circle class="es-line-ink" stroke-width="2" cx="16" cy="-10" r="10"/><path class="es-line-ink" stroke-width="1.2" d="M6 -10h20M16 -20v20"/></g>
          <path class="es-line-pinkdeep" stroke-width="2.6" d="M-14 -10h12l10-13H-5zM-2 -10l-4-16M8 -23l8 13M8 -23l1-6"/>
          <path class="es-line-ink" stroke-width="2.6" d="M-5 -27l7 10-3 8"/>
          <path class="es-ink" d="M-8 -28l4-16 8 2-3 15z"/>
          <line class="es-line-ink" stroke-width="2.4" x1="2" y1="-40" x2="9" y2="-29"/>
          <circle class="es-white es-outline" stroke-width="1.2" cx="2" cy="-49" r="6"/>
          <path class="es-pink" d="M-4 -50a6 6 0 0 1 12 0l3 1H-4z"/>
        </g>
      </g>

      <!-- bus -->
      <g class="es-bus">
        <rect class="es-pink" x="0" y="712" width="330" height="106" rx="16"/>
        <rect class="es-pinkdeep" x="0" y="796" width="330" height="14"/>
        <rect class="es-white" x="16" y="724" width="276" height="50" rx="6"/>
        <rect class="es-white" x="300" y="724" width="22" height="56" rx="6"/>
        <g class="es-pink"><rect x="84" y="724" width="6" height="50"/><rect x="154" y="724" width="6" height="50"/><rect x="224" y="724" width="6" height="50"/></g>
        <rect class="es-ink" x="33" y="756" width="14" height="18" rx="5"/><circle class="es-white es-outline" stroke-width="1.2" cx="40" cy="748" r="7"/><path class="es-ink" d="M33 747a7 7 0 0 1 14 0z"/>
        <rect class="es-blush es-outline" stroke-width="1" x="111" y="756" width="14" height="18" rx="5"/><circle class="es-white es-outline" stroke-width="1.2" cx="118" cy="748" r="7"/><circle class="es-ink" cx="112" cy="744" r="3.4"/>
        <rect class="es-pinkdeep" x="255" y="756" width="14" height="18" rx="5"/><circle class="es-white es-outline" stroke-width="1.2" cx="262" cy="748" r="7"/><path class="es-ink" d="M255 747a7 7 0 0 1 14 0z"/>
        <circle class="es-ink" cx="70" cy="820" r="18"/><circle class="es-border" cx="70" cy="820" r="7"/>
        <circle class="es-ink" cx="262" cy="820" r="18"/><circle class="es-border" cx="262" cy="820" r="7"/>
      </g>

      <!-- wish bubbles -->
      <g
        v-for="b in bubbles"
        :key="b.key"
        class="es-bubble"
        :class="{ 'is-on': isOn(b.key) }"
        :style="{ animationDelay: b.delay }"
        :data-cy="`estate-wish-${b.key}`"
      >
        <rect class="es-ink" opacity=".06" :x="b.x" :y="b.y + 3" :width="b.w" height="42" rx="21"/>
        <rect class="es-bubble__fill" :x="b.x" :y="b.y" :width="b.w" height="42" rx="21"/>
        <path class="es-bubble__fill" :d="b.tail"/>
        <text class="es-bubble__text" :x="b.x + b.w / 2" :y="b.y + 26">{{ b.label }}</text>
      </g>
    </svg>

    <div class="estate__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.estate {
  position: relative;
  overflow: hidden;
  min-height: 920px;
  box-sizing: border-box;
  padding: 180px clamp(16px, 4vw, 48px) 0;
  border-radius: 36px;
  background: var(--color-periwinkle, #e9ecf6);
}
.estate__art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.estate__content { position: relative; max-width: 820px; margin: 0 auto; }

/* palette */
.es-white    { fill: var(--color-white, #ffffff); }
.es-peri     { fill: var(--color-periwinkle, #e9ecf6); }
.es-blush    { fill: var(--color-blush, #fbd5e5); }
.es-pink     { fill: var(--color-pink, #f5a3c7); }
.es-pinkdeep { fill: var(--color-pink-deep, #f08ab6); }
.es-ink      { fill: var(--color-slate, #5f6373); }
.es-slate    { fill: var(--color-slate, #5f6373); }
.es-border   { fill: var(--border, #dfe2ea); }
.es-outline  { stroke: var(--color-slate, #5f6373); }
.es-line-ink, .es-line-white, .es-line-slate, .es-line-pink, .es-line-pinkdeep { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.es-line-ink      { stroke: var(--color-slate, #5f6373); }
.es-line-white    { stroke: var(--color-white, #ffffff); stroke-linecap: butt; }
.es-line-slate    { stroke: var(--color-slate, #5f6373); stroke-linecap: butt; }
.es-line-pink     { stroke: var(--color-pink, #f5a3c7); }
.es-line-pinkdeep { stroke: var(--color-pink-deep, #f08ab6); }

/* wish bubbles */
.es-bubble { animation: es-bob 3.2s ease-in-out infinite alternate; }
.es-bubble__fill { fill: var(--color-white, #ffffff); }
.es-bubble__text { font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif); font-size: 15px; font-weight: 500; fill: var(--color-ink, #1d1d24); text-anchor: middle; }

/* motion */
.es-train { animation: es-train 16s linear infinite; }
.es-bus { animation: es-bus 22s ease-in-out infinite; }
.es-ride { animation: es-cross 15s linear -5s infinite; }
.es-stroll { animation: es-cross 30s linear infinite; }
.es-stroll--late { animation-delay: -14s; }
.es-leg { transform-box: fill-box; transform-origin: 50% 0; animation: es-swing .65s ease-in-out infinite alternate; }
.es-leg--b { animation-direction: alternate-reverse; }
.es-spin { transform-box: fill-box; transform-origin: center; animation: es-spin .8s linear infinite; }
.es-tail { transform-box: fill-box; transform-origin: 0 100%; animation: es-tail 2.4s ease-in-out infinite; }
.es-lit { animation: es-lit 14s ease-in-out infinite alternate; }

@keyframes es-bob { from { transform: translateY(0); } to { transform: translateY(-6px); } }
@keyframes es-train { from { transform: translateX(-440px); } to { transform: translateX(1260px); } }
@keyframes es-bus { 0% { transform: translateX(-380px); } 18%, 62% { transform: translateX(36px); } 100% { transform: translateX(1300px); } }
@keyframes es-cross { from { transform: translateX(-60px); } to { transform: translateX(1300px); } }
@keyframes es-swing { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes es-spin { to { transform: rotate(360deg); } }
@keyframes es-tail { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-26deg); } }
@keyframes es-lit { 0%, 40% { fill: var(--color-periwinkle, #e9ecf6); } 60%, 100% { fill: var(--color-pink, #f5a3c7); } }

@media (prefers-reduced-motion: reduce) {
  .es-bubble, .es-train, .es-bus, .es-ride, .es-stroll, .es-leg, .es-spin, .es-tail, .es-lit { animation: none; }
  .es-bus { transform: translateX(36px); }
}

@media (max-width: 767px) {
  .estate { padding-top: 120px; min-height: 0; padding-bottom: 260px; }
}
</style>
