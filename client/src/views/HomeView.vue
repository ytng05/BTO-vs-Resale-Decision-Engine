<script setup>
// Home, after the Calm home board (CalmHome.dc.html): the question and the two ways in (start, or see an example),
// the crossing scene, how it works in four steps, what the results tell you, a short FAQ and a closing call to
// action. The navbar and the disclaimer footer come from App.vue, as on every page.
import { useRouter } from 'vue-router';
import { useScenarioStore } from '../stores/scenario.js';
import { EXAMPLE_PLAN } from '../constants/examplePlan.js';
import CrossingScene from '../components/CrossingScene.vue';

const store = useScenarioStore();
const router = useRouter();

// Fill the plan with a ready-made couple and open their Results; "Change inputs" there makes it their own.
function seeExample() {
  store.loadSaved(EXAMPLE_PLAN);
  router.push('/results');
}

// The four plan steps, as the stepper names them, with what to have to hand for each.
const STEPS = [
  { title: 'What matters', text: 'Pick what you care about, like living near your parents or keeping cash in hand.', need: 'Nothing to prepare' },
  { title: 'About you', text: 'Ages, incomes, CPF and cash for the two of you, and a move-in date if you have one.', need: 'Your CPF statement, or an estimate' },
  { title: 'Your BTO', text: "The town, launch and flat type you're eyeing. We use a recent launch to estimate price and wait.", need: 'A town in mind' },
  { title: 'Resale flat', text: 'The town, flat type and remaining lease of the listing. Asking price is optional.', need: 'A listing you like' },
];

const GETS = [
  { tag: 'Break-even year', fill: 'var(--accent-fill-2)', text: 'When both paths leave you equally well off' },
  { tag: 'Net position', fill: 'var(--accent-fill-3)', text: 'How far ahead each path is, year by year' },
  { tag: 'What would flip it', fill: 'var(--bg-page)', text: 'The price, wait or rent at which the answer changes' },
];

const FAQS = [
  {
    q: 'Is this financial advice?',
    a: "No. It's an illustrative projection based on the rules in force and the numbers you enter. Use it to understand the trade-offs, then check with HDB, CPF and your bank before you commit.",
  },
  {
    q: 'What does "break-even" mean here?',
    a: "It's the year your net position on both paths is the same. Before it, one path is ahead; after it, the other one is.",
  },
  {
    q: "What if my BTO launch isn't listed?",
    a: "The launch you'll apply for usually isn't priced yet, so we estimate from a recent launch in the same town: its price range and waiting time. You can pick a different launch, and move the price on the dashboard.",
  },
  {
    q: 'Can I compare more than one resale flat?',
    a: 'Yes. Log in, save each comparison as a scenario, then compare them side by side.',
  },
];
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero__row">
        <div class="home-hero__copy">
          <h1 id="home-title" class="home-hero__title" data-cy="home-title">BTO or resale: which leaves you better off?</h1>
          <p class="home-lead home-lead--lg" data-cy="home-lead">
            Tell us about your situation, the BTO you're eyeing and the resale flat you keep looking at. We'll compare
            both paths year by year and show the point where they cross, and what would flip the answer.
          </p>
        </div>
        <div class="home-hero__actions">
          <div class="d-flex flex-wrap gap-2">
            <router-link class="btn btn-primary btn-disc home-btn" to="/login?redirect=/plan" data-cy="home-start-button">
              <span class="btn-disc__disc" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              Start planning
            </router-link>
            <button type="button" class="btn home-btn home-btn--ghost" data-cy="home-example-button" @click="seeExample">See an example</button>
          </div>
          <span class="home-chip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            4 short steps
          </span>
        </div>
      </div>
      <CrossingScene />
    </section>

    <!-- How it works -->
    <section class="home-section" aria-labelledby="how-title" data-cy="home-steps">
      <div class="home-reveal home-head">
        <p class="home-eyebrow">How it works</p>
        <h2 id="how-title" class="home-h2">Four short steps, then your answer</h2>
      </div>
      <ol class="home-steps home-stagger">
        <li v-for="(s, i) in STEPS" :key="s.title" class="home-card home-step" :data-cy="`home-step-${i + 1}`">
          <span class="home-step__num" aria-hidden="true">{{ i + 1 }}</span>
          <b class="home-step__title">{{ s.title }}</b>
          <span class="home-muted">{{ s.text }}</span>
          <span class="home-step__need">{{ s.need }}</span>
        </li>
      </ol>
    </section>

    <!-- What you'll get -->
    <section class="home-card home-get home-reveal" aria-labelledby="get-title" data-cy="home-get">
      <div class="home-get__copy">
        <p class="home-eyebrow">What you'll get</p>
        <h2 id="get-title" class="home-h2">Not a price prediction. The point where the answer flips.</h2>
        <p class="home-lead">
          We don't guess where prices are heading. We follow both paths year by year with today's rules, show when one
          pulls ahead, and tell you which assumptions would change that.
        </p>
        <ul class="home-get__list">
          <li v-for="g in GETS" :key="g.tag">
            <span class="home-tag" :style="{ background: g.fill }">{{ g.tag }}</span>
            <span class="home-muted">{{ g.text }}</span>
          </li>
        </ul>
        <button type="button" class="btn btn-link p-0 home-get__link" data-cy="home-example-link" @click="seeExample">See an example result</button>
      </div>
      <div class="home-get__chart">
        <div class="home-get__legend">
          <span class="home-muted fw-normal">Illustration of a result</span>
          <span class="home-get__key"><span class="home-get__swatch home-get__swatch--bto" aria-hidden="true"></span>BTO</span>
          <span class="home-get__key"><span class="home-get__swatch home-get__swatch--resale" aria-hidden="true"></span>Resale</span>
        </div>
        <svg viewBox="0 0 520 250" class="home-get__svg" role="img" aria-label="Illustration: resale starts ahead, the BTO line crosses it at the break-even year and stays ahead after that">
          <g class="home-grid"><line x1="20" y1="40" x2="500" y2="40" /><line x1="20" y1="100" x2="500" y2="100" /><line x1="20" y1="160" x2="500" y2="160" /><line x1="20" y1="210" x2="500" y2="210" /></g>
          <g class="home-drawline">
            <polyline points="30,150 72,140 114,130 156,122 198,114 240,106 282,98 324,90 366,83 408,76 450,70 492,64" fill="none" class="home-line-resale" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10" />
            <polyline points="30,205 72,200 114,190 156,175 198,146 240,126 282,108 324,90 366,70 408,52 450,36 492,22" fill="none" class="home-line-bto" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          </g>
          <g class="home-meetpop">
            <circle class="home-pulse home-berry" cx="324" cy="90" r="8" /><circle cx="324" cy="90" r="8" class="home-berry" /><circle cx="324" cy="90" r="3" class="home-white" />
            <rect x="336" y="98" width="118" height="30" rx="15" class="home-white" /><text x="395" y="118" text-anchor="middle" font-size="13" font-weight="600" class="home-berry">Break-even</text>
          </g>
          <g font-size="12" text-anchor="middle" class="home-axis"><text x="30" y="242">Today</text><text x="492" y="242">Years ahead</text></g>
        </svg>
        <p class="home-get__note">Example figures. Illustrative projection, not financial advice.</p>
      </div>
    </section>

    <!-- FAQ -->
    <section class="home-faq-wrap" aria-labelledby="faq-title" data-cy="home-faq">
      <div class="home-reveal home-head home-faq-wrap__intro">
        <p class="home-eyebrow">Questions</p>
        <h2 id="faq-title" class="home-h2">Good to know</h2>
        <p class="home-lead">
          Want the detail? The <router-link to="/sources" data-cy="home-sources-link">Sources page</router-link> lists the
          rules we use, with their HDB and CPF references.
        </p>
      </div>
      <div class="home-card home-faq home-reveal">
        <details v-for="(f, i) in FAQS" :key="f.q" :open="i === 0" :data-cy="`home-faq-${i + 1}`">
          <summary>{{ f.q }}</summary>
          <p>{{ f.a }}</p>
        </details>
      </div>
    </section>

    <!-- Closing call to action -->
    <section class="home-cta home-reveal" aria-labelledby="cta-title">
      <svg viewBox="0 0 400 140" aria-hidden="true" class="home-cta__art">
        <rect x="40" y="40" width="70" height="100" rx="6" class="home-white" opacity=".08" /><rect x="130" y="10" width="90" height="130" rx="6" class="home-white" opacity=".1" /><rect x="240" y="56" width="80" height="84" rx="6" class="home-white" opacity=".08" />
        <g class="home-pink">
          <rect x="148" y="28" width="14" height="10" rx="2" /><rect class="home-lit" style="animation-delay: -2s" x="188" y="28" width="14" height="10" rx="2" />
          <rect class="home-lit" style="animation-delay: -6s" x="148" y="52" width="14" height="10" rx="2" /><rect x="188" y="76" width="14" height="10" rx="2" />
          <rect class="home-lit" style="animation-delay: -4s" x="256" y="72" width="14" height="10" rx="2" />
        </g>
      </svg>
      <div class="home-cta__copy">
        <h2 id="cta-title" class="home-h2 text-white">Ready to see where your paths cross?</h2>
        <p class="mb-0 home-cta__sub">Four short steps. You can change your answers later.</p>
      </div>
      <router-link class="btn btn-disc home-btn home-btn--light" to="/login?redirect=/plan" data-cy="home-cta-button">
        <span class="btn-disc__disc" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
        Start planning
      </router-link>
    </section>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: 88px; padding-bottom: var(--space-6); }

/* ---- shared ---- */
.home-card { background: var(--bg-surface); border-radius: var(--radius-md); box-shadow: 0 1px 2px rgba(29, 29, 36, 0.05), 0 8px 24px rgba(60, 64, 90, 0.06); }
.home-section, .home-head { display: flex; flex-direction: column; }
.home-section { gap: var(--space-5); }
.home-head { gap: var(--space-2); }
.home-eyebrow { margin: 0; font-size: 14px; font-weight: 600; color: var(--color-berry, #b23a78); letter-spacing: 0.02em; }
.home-h2 { margin: 0; font-size: clamp(24px, 2.6vw, 32px); font-weight: 500; letter-spacing: -0.02em; line-height: 1.2; }
.home-lead { margin: 0; font-size: 16px; color: var(--text-secondary); line-height: 1.6; max-width: 68ch; }
.home-lead--lg { font-size: 17px; }
.home-muted { color: var(--text-secondary); line-height: 1.5; }
.home-white { fill: var(--bg-surface); }
.home-pink { fill: var(--accent-fill-1); }
.home-berry { fill: var(--color-berry, #b23a78); }

/* ---- hero ---- */
.home-hero { display: flex; flex-direction: column; gap: 28px; }
.home-hero__row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-5) var(--space-8); }
.home-hero__copy { display: flex; flex-direction: column; gap: var(--space-4); max-width: 720px; }
.home-hero__title { margin: 0; font-size: clamp(34px, 4.4vw, 56px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; }
.home-hero__actions { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.home-btn { min-height: 52px; display: inline-flex; align-items: center; font-weight: 500; }
.home-btn.btn-disc { padding-right: var(--space-5); }
.home-btn--ghost { padding: 0 22px; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-primary); }
.home-btn--ghost:hover { background: var(--accent-fill-3); color: var(--text-primary); }
.home-chip { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 14px; border-radius: var(--radius-pill); background: var(--bg-surface); font-size: 14px; font-weight: 500; }

/* ---- how it works ---- */
.home-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--space-4); margin: 0; padding: 0; list-style: none; }
.home-step { padding: 22px; display: flex; flex-direction: column; gap: 10px; }
.home-step__num { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-fill-2); display: grid; place-items: center; font-weight: 600; }
.home-step__title { font-weight: 500; font-size: 17px; }
.home-step__need { align-self: flex-start; margin-top: auto; padding: 6px var(--space-3); border-radius: var(--radius-pill); background: var(--bg-page); font-size: 13px; color: var(--text-secondary); }

/* ---- what you'll get ---- */
.home-get { border-radius: var(--radius-lg); padding: clamp(24px, 3vw, 40px); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-6); align-items: center; }
.home-get__copy { display: flex; flex-direction: column; gap: var(--space-4); }
.home-get__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.home-get__list li { display: flex; gap: var(--space-3); align-items: baseline; }
.home-tag { flex: none; display: inline-flex; align-items: center; padding: var(--space-1) 10px; border-radius: var(--radius-pill); font-size: 13px; font-weight: 600; }
.home-get__link { align-self: flex-start; font-weight: 500; }
.home-get__chart { background: var(--accent-fill-3); border-radius: var(--radius-md); padding: 22px 22px 14px; display: flex; flex-direction: column; gap: var(--space-2); }
.home-get__legend { display: flex; flex-wrap: wrap; gap: var(--space-2) 18px; align-items: center; font-size: 14px; font-weight: 500; }
.home-get__key { display: inline-flex; align-items: center; gap: var(--space-2); }
.home-get__swatch { width: 22px; }
.home-get__swatch--bto { height: 4px; border-radius: 2px; background: var(--text-primary); }
.home-get__swatch--resale { height: 0; border-top: 5px dotted var(--color-pink-deep, #f08ab6); }
.home-get__svg { display: block; width: 100%; height: auto; font-family: var(--font-body); }
.home-grid line { stroke: var(--text-primary); stroke-opacity: 0.08; }
.home-line-resale { stroke: var(--color-pink-deep, #f08ab6); }
.home-line-bto { stroke: var(--text-primary); }
.home-axis { fill: var(--text-secondary); }
.home-get__note { margin: 0; font-size: 13px; color: var(--text-secondary); }
.home-pulse { transform-box: fill-box; transform-origin: center; animation: home-pulse 2s ease-out infinite; }
@keyframes home-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }

/* ---- FAQ ---- */
.home-faq-wrap { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }
.home-faq-wrap__intro { flex: 1 1 300px; }
.home-faq { flex: 2 1 520px; min-width: 0; padding: var(--space-2) var(--space-5); }
.home-faq details { border-bottom: 1px solid var(--border-subtle); padding: 18px var(--space-1); }
.home-faq details:last-child { border-bottom: 0; }
.home-faq summary { cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); font-weight: 500; font-size: 16px; }
.home-faq summary::-webkit-details-marker { display: none; }
.home-faq summary::after {
  content: "";
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-page) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231d1d24' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M12 6v12M6 12h12'/%3E%3C/svg%3E") center / 14px no-repeat;
  transition: transform 0.2s;
}
.home-faq details[open] summary::after { transform: rotate(45deg); }
.home-faq p { margin: 10px 0 0; color: var(--text-secondary); line-height: 1.6; max-width: 72ch; }
.home-faq summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 4px; border-radius: 8px; }

/* ---- closing call to action ---- */
.home-cta { position: relative; overflow: hidden; background: var(--text-primary); color: var(--bg-surface); border-radius: var(--radius-lg); padding: clamp(28px, 4vw, 48px); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-5); }
.home-cta__art { position: absolute; right: -10px; bottom: 0; width: min(440px, 50%); height: auto; opacity: 0.9; }
.home-cta__copy { position: relative; display: flex; flex-direction: column; gap: var(--space-2); max-width: 560px; }
.home-cta__sub { color: var(--border); line-height: 1.6; }
.home-btn--light { position: relative; background: var(--bg-surface); color: var(--text-primary); }
.home-btn--light:hover { background: var(--accent-fill-3); color: var(--text-primary); }
.home-lit { animation: home-lit 12s ease-in-out infinite alternate; }
@keyframes home-lit { 0%, 40% { fill: var(--accent-fill-3); } 60%, 100% { fill: var(--accent-fill-1); } }

/* ---- scroll transitions: CSS scroll-driven animations, so the content stays put where they aren't supported ---- */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .home-reveal { animation: home-rise cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
    .home-stagger > * { animation: home-card cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
    .home-stagger > :nth-child(2) { animation-range: entry 15% cover 36%; }
    .home-stagger > :nth-child(3) { animation-range: entry 30% cover 42%; }
    .home-stagger > :nth-child(4) { animation-range: entry 45% cover 48%; }
    .home-eyebrow { animation: home-slide cubic-bezier(0.2, 0.7, 0.2, 1) both; animation-timeline: view(); animation-range: entry 10% cover 30%; }
    .home-step__num { animation: home-pop linear both; animation-timeline: view(); animation-range: entry 40% cover 40%; }
    .home-drawline { animation: home-draw linear both; animation-timeline: view(); animation-range: entry 30% cover 55%; }
    .home-meetpop { transform-box: fill-box; transform-origin: 20px 50%; animation: home-meetpop linear both; animation-timeline: view(); animation-range: cover 50% cover 62%; }
  }
}
@keyframes home-rise { from { opacity: 0; transform: translateY(64px) scale(0.96); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes home-card { from { opacity: 0; transform: translateY(80px) rotate(-2deg) scale(0.92); } to { opacity: 1; transform: none; } }
@keyframes home-slide { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes home-pop { 0% { transform: scale(0.3); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes home-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes home-meetpop { 0% { opacity: 0; transform: scale(0.2); } 70% { opacity: 1; transform: scale(1.35); } 100% { opacity: 1; transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .home-pulse, .home-lit { animation: none; }
  .home-faq summary::after { transition: none; }
}
</style>
