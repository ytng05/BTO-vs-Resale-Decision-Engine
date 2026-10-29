<!--
  HeroScene.vue – ambient HDB estate illustration for the home page hero.
  Residents walk, cycle and scoot along the ground line; limbs and wheels animate in CSS,
  positions in a requestAnimationFrame loop that pauses off-screen and in background tabs.
  Colours come from the CSS custom properties in styles/_tokens.scss (UI.md §2); decorative
  only, so it carries one aria-label. Respects prefers-reduced-motion (UI.md §9).
  Usage: <HeroScene /> inside a full-width container above or below the hero copy.
-->
<template>
  <svg ref="root" class="hero-scene" data-cy="hero-scene" viewBox="0 0 1200 400" role="img" aria-label="An HDB estate: slab blocks, a void deck and a rain tree, with residents walking, cycling and scooting past">
    <defs>
      <pattern id="hs-win-b" width="22" height="18" patternUnits="userSpaceOnUse"><rect class="hs-win-back" x="6" y="5" width="10" height="7" rx="1"/></pattern>
      <pattern id="hs-win-f" width="24" height="20" patternUnits="userSpaceOnUse"><rect class="hs-win-front" x="7" y="6" width="10" height="8" rx="1"/></pattern>
    </defs>

    <!-- back blocks -->
    <g>
      <rect class="hs-sky" x="40" y="128" width="230" height="260"/>
      <rect fill="url(#hs-win-b)" x="48" y="140" width="214" height="200"/>
      <rect class="hs-venus" x="36" y="122" width="238" height="8" rx="2"/>

      <rect class="hs-sky" x="316" y="64" width="116" height="320"/>
      <rect fill="url(#hs-win-b)" x="322" y="76" width="104" height="270"/>
      <rect class="hs-venus" x="312" y="58" width="124" height="8" rx="2"/>
      <rect class="hs-venus" x="352" y="40" width="44" height="18" rx="3"/>

      <rect class="hs-sky" x="770" y="150" width="250" height="240"/>
      <rect fill="url(#hs-win-b)" x="778" y="162" width="234" height="180"/>
      <rect class="hs-venus" x="766" y="144" width="258" height="8" rx="2"/>

      <rect class="hs-sky" x="1062" y="96" width="170" height="290"/>
      <rect fill="url(#hs-win-b)" x="1068" y="108" width="160" height="240"/>
      <rect class="hs-venus" x="1058" y="90" width="178" height="8" rx="2"/>
    </g>

    <!-- front block with a void deck -->
    <g>
      <rect class="hs-venus" x="468" y="176" width="262" height="120"/>
      <rect fill="url(#hs-win-f)" x="476" y="186" width="246" height="100"/>
      <rect class="hs-uni" x="464" y="170" width="270" height="8" rx="2"/>
      <rect class="hs-uni" x="468" y="292" width="262" height="6"/>
      <rect class="hs-venus" x="476" y="298" width="12" height="80"/>
      <rect class="hs-venus" x="560" y="298" width="12" height="80"/>
      <rect class="hs-venus" x="644" y="298" width="12" height="80"/>
      <rect class="hs-venus" x="710" y="298" width="12" height="80"/>
      <rect class="hs-uni" x="524" y="316" width="14" height="20" rx="2"/>
      <rect class="hs-uni" x="520" y="312" width="22" height="5" rx="2"/>
    </g>

    <!-- rain tree -->
    <g>
      <path class="hs-galaxy" d="M968 380 L972 300 Q958 270 930 258 L936 254 Q962 262 976 286 Q984 256 1010 244 L1014 249 Q992 262 986 296 L990 380 Z"/>
      <ellipse class="hs-uni" cx="972" cy="240" rx="118" ry="34"/>
      <ellipse class="hs-uni" cx="912" cy="252" rx="62" ry="22"/>
      <ellipse class="hs-uni" cx="1040" cy="250" rx="64" ry="22"/>
      <ellipse class="hs-planet" cx="990" cy="228" rx="70" ry="18"/>
      <ellipse class="hs-uni" cx="960" cy="222" rx="54" ry="16"/>
    </g>

    <!-- ground (path drawn by the script to match the walking line) -->
    <path id="hs-ground" class="hs-venus" d="M0 344 H1200 V400 H0 Z"/>

    <!-- void-deck cat -->
    <g id="hs-cat" data-x="600">
      <path class="hs-ink hs-anim hs-tail" stroke-width="2.5" d="M7 -3 Q16 -4 15 -14"/>
      <path class="hs-galaxy" d="M-6 0 Q-8 -10 -3 -14 L-4 -20 L-1 -17 L2 -17 L4 -20 L4 -13 Q9 -9 8 0 Z"/>
    </g>

    <!-- residents -->
    <g id="hs-aunty" class="hs-fig hs-fig--slow">
      <g class="hs-flip">
        <g class="hs-bob hs-anim">
          <line class="hs-ink hs-anim hs-leg" stroke-width="3.5" x1="-1.5" y1="-17" x2="-1.5" y2="0"/>
          <line class="hs-ink hs-anim hs-leg hs-leg--b" stroke-width="3.5" x1="1.5" y1="-17" x2="1.5" y2="0"/>
          <rect class="hs-planet" x="-6" y="-33" width="12" height="18" rx="3"/>
          <line class="hs-ink" stroke-width="2.5" x1="3" y1="-28" x2="12" y2="-21"/>
          <circle class="hs-white" cx="0" cy="-39" r="5"/>
          <path class="hs-galaxy" d="M-5 -39 A5 5 0 0 1 5 -40 L2 -41 Q-1 -43 -5 -39 Z"/>
          <circle class="hs-galaxy" cx="-4.5" cy="-43" r="2.6"/>
          <circle cx="0" cy="-39" r="5" class="hs-ink" stroke-width="1.2"/>
        </g>
        <line class="hs-ink" stroke-width="2" x1="12" y1="-21" x2="15" y2="-4"/>
        <rect class="hs-uni" x="13" y="-17" width="11" height="13" rx="2"/>
        <circle class="hs-galaxy" cx="18" cy="-2" r="2.5"/>
      </g>
    </g>

    <g id="hs-worker" class="hs-fig">
      <g class="hs-flip">
        <g class="hs-bob hs-anim">
          <line class="hs-ink hs-anim hs-leg" stroke-width="3.5" x1="-1.5" y1="-19" x2="-1.5" y2="0"/>
          <line class="hs-ink hs-anim hs-leg hs-leg--b" stroke-width="3.5" x1="1.5" y1="-19" x2="1.5" y2="0"/>
          <rect class="hs-white" x="-5.5" y="-37" width="11" height="19" rx="3"/>
          <rect class="hs-ink" stroke-width="1.2" x="-5.5" y="-37" width="11" height="19" rx="3"/>
          <path class="hs-blue" stroke-width="1.4" d="M-2 -37 L0 -27 L2 -37"/>
          <rect class="hs-planet" x="-1.5" y="-28" width="3" height="4" rx=".5"/>
          <line class="hs-ink hs-anim hs-leg hs-leg--b" stroke-width="2.4" x1="0" y1="-34" x2="0" y2="-21"/>
          <circle class="hs-white" cx="0" cy="-43" r="5"/>
          <path class="hs-galaxy" d="M-5 -43 A5 5 0 0 1 5 -44 L5 -46 Q0 -50 -5 -45 Z"/>
          <circle cx="0" cy="-43" r="5" class="hs-ink" stroke-width="1.2"/>
        </g>
      </g>
    </g>

    <g id="hs-kid" class="hs-fig">
      <g class="hs-flip">
        <line class="hs-ink" stroke-width="2.4" x1="-11" y1="-4" x2="10" y2="-4"/>
        <line class="hs-blue" stroke-width="2.4" x1="9" y1="-4" x2="6" y2="-27"/>
        <line class="hs-ink" stroke-width="2.4" x1="3" y1="-27" x2="9" y2="-27"/>
        <circle class="hs-galaxy" cx="-9" cy="-2" r="2.6"/>
        <circle class="hs-galaxy" cx="9" cy="-2" r="2.6"/>
        <line class="hs-ink" stroke-width="3" x1="1" y1="-14" x2="1" y2="-5"/>
        <line class="hs-ink hs-anim hs-push" stroke-width="3" x1="-2" y1="-14" x2="-2" y2="-1"/>
        <rect class="hs-planet" x="-4" y="-25" width="8" height="12" rx="2.5"/>
        <line class="hs-ink" stroke-width="2" x1="2" y1="-22" x2="6" y2="-26"/>
        <circle class="hs-white" cx="0" cy="-30" r="4.5"/>
        <path class="hs-galaxy" d="M-4.5 -30 A4.5 4.5 0 0 1 4.5 -31 L1 -31 Q-2 -33 -4.5 -30 Z"/>
        <circle cx="0" cy="-30" r="4.5" class="hs-ink" stroke-width="1.2"/>
      </g>
    </g>

    <g id="hs-cyclist" class="hs-fig">
      <g class="hs-flip">
        <g class="hs-anim hs-spin"><circle class="hs-ink" stroke-width="2" cx="-14" cy="-9" r="9"/><path class="hs-ink" stroke-width="1" d="M-23 -9 H-5 M-14 -18 V0"/></g>
        <g class="hs-anim hs-spin"><circle class="hs-ink" stroke-width="2" cx="14" cy="-9" r="9"/><path class="hs-ink" stroke-width="1" d="M5 -9 H23 M14 -18 V0"/></g>
        <path class="hs-blue" stroke-width="2.2" d="M-14 -9 L-2 -9 L7 -21 L-5 -21 Z M-2 -9 L-6 -24 M7 -21 L14 -9 M7 -21 L8 -27"/>
        <line class="hs-ink" stroke-width="2.4" x1="-9" y1="-24" x2="-3" y2="-24"/>
        <path class="hs-ink" stroke-width="3.2" d="M-5 -25 L1 -16 L-2 -8"/>
        <path class="hs-planet" d="M-7 -26 L-3 -40 L4 -38 L1 -24 Z"/>
        <line class="hs-ink" stroke-width="2.2" x1="1" y1="-36" x2="8" y2="-27"/>
        <circle class="hs-white" cx="2" cy="-44" r="4.8"/>
        <path class="hs-galaxy" d="M-3 -45 A5 5 0 0 1 7 -45 L9 -44 L-3 -44 Z"/>
        <circle cx="2" cy="-44" r="4.8" class="hs-ink" stroke-width="1.2"/>
      </g>
    </g>
  </svg>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const root = ref(null);
let cleanup = () => {};

onMounted(() => {
  const svg = root.value;
  let io = null;
  let onVis = null;

  var W = 1200;
  // The walking line: a gentle rise and dip across the estate.
  function groundY(x) { return 346 + 9 * Math.sin(x / 170) + 4 * Math.sin(x / 61 + 0.8); }

  var d = 'M0 ' + groundY(0).toFixed(1);
  for (var x = 10; x <= W; x += 10) d += ' L' + x + ' ' + groundY(x).toFixed(1);
  svg.querySelector('#hs-ground').setAttribute('d', d + ' L' + W + ' 400 L0 400 Z');

  var cat = svg.querySelector('#hs-cat');
  cat.setAttribute('transform', 'translate(600 ' + groundY(600).toFixed(1) + ')');

  // speed in viewBox units per second; edge: 'turn' walks back, 'wrap' leaves and re-enters
  var figs = [
    { el: '#hs-aunty',   x: 180, dir:  1, speed: 16, edge: 'turn', tilt: false },
    { el: '#hs-worker',  x: 860, dir: -1, speed: 30, edge: 'turn', tilt: false },
    { el: '#hs-kid',     x: 420, dir:  1, speed: 46, edge: 'wrap', tilt: true },
    { el: '#hs-cyclist', x: 60,  dir: -1, speed: 74, edge: 'wrap', tilt: true }
  ].map(function (f) {
    f.node = svg.querySelector(f.el);
    f.flip = f.node.querySelector('.hs-flip');
    f.pause = 0;
    return f;
  });

  function place(f) {
    var y = groundY(f.x);
    var a = f.tilt ? Math.atan2(groundY(f.x + 4) - groundY(f.x - 4), 8) * 180 / Math.PI : 0;
    f.node.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + a.toFixed(2) + ')');
    f.flip.setAttribute('transform', 'scale(' + f.dir + ' 1)');
  }

  function step(f, dt) {
    if (f.pause > 0) { f.pause -= dt; return; }
    f.x += f.dir * f.speed * dt;
    if (f.edge === 'turn' && (f.x < 40 || f.x > W - 40)) {
      f.x = Math.max(40, Math.min(W - 40, f.x));
      f.dir *= -1;
      f.pause = 1.2 + Math.random() * 1.5;
    } else if (f.edge === 'wrap') {
      if (f.x > W + 60) f.x = -60;
      if (f.x < -60) f.x = W + 60;
    }
  }

  figs.forEach(place);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var visible = true, last = null, raf = null;
  function tick(t) {
    var dt = last == null ? 0 : Math.min((t - last) / 1000, 0.1);
    last = t;
    figs.forEach(function (f) { step(f, dt); place(f); });
    raf = requestAnimationFrame(tick);
  }
  function start() { if (raf == null && visible && !document.hidden) { last = null; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); });
    io.observe(svg);
  }
  onVis = function () { document.hidden ? stop() : start(); };
  document.addEventListener('visibilitychange', onVis);
  cleanup = function () { stop(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  start();
});

onBeforeUnmount(() => cleanup());
</script>

<style scoped>
  .hero-scene { display:block; width:100%; height:auto; }
  .hs-sky    { fill:var(--color-sky); }
  .hs-venus  { fill:var(--color-venus); }
  .hs-uni    { fill:var(--color-universe); }
  .hs-planet { fill:var(--color-planetary); }
  .hs-galaxy { fill:var(--color-galaxy); }
  .hs-white  { fill:var(--bg-surface-raised); }
  .hs-page   { fill:var(--bg-page); }
  .hs-ink    { stroke:var(--color-galaxy); fill:none; stroke-linecap:round; stroke-linejoin:round; }
  .hs-blue   { stroke:var(--color-planetary); fill:none; stroke-linecap:round; stroke-linejoin:round; }
  .hs-win-back  { fill:var(--color-venus); }
  .hs-win-front { fill:var(--color-universe); }

  /* limbs and wheels animate in CSS; positions along the ground are set by the script */
  .hs-anim { transform-box:fill-box; }
  .hs-leg  { transform-origin:50% 0; animation:hs-swing .7s ease-in-out infinite alternate; }
  .hs-leg--b { animation-direction:alternate-reverse; }
  .hs-push { transform-origin:50% 0; animation:hs-push 1.1s ease-in-out infinite; }
  .hs-bob  { animation:hs-bob .35s ease-in-out infinite alternate; }
  .hs-spin { transform-origin:50% 50%; animation:hs-spin .9s linear infinite; }
  .hs-tail { transform-origin:0% 100%; animation:hs-tail 2.4s ease-in-out infinite; }
  .hs-fig--slow .hs-leg { animation-duration:.9s; }
  @keyframes hs-swing { from { transform:rotate(-22deg); } to { transform:rotate(22deg); } }
  @keyframes hs-push  { 0%,100% { transform:rotate(-8deg); } 50% { transform:rotate(38deg); } }
  @keyframes hs-bob   { from { transform:translateY(0); } to { transform:translateY(-1.2px); } }
  @keyframes hs-spin  { to { transform:rotate(360deg); } }
  @keyframes hs-tail  { 0%,100% { transform:rotate(0); } 50% { transform:rotate(-24deg); } }
  @media (prefers-reduced-motion: reduce) {
    .hs-leg, .hs-push, .hs-bob, .hs-spin, .hs-tail { animation:none; }
  }
</style>
