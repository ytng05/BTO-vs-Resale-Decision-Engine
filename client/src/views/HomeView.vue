<script setup>
// Home, after the Calm home board (CalmHome.dc.html): the question and the two ways in (start, or see an example),
// a small static city illustration, how it works in four steps, what the results tell you, the costs people forget, a short FAQ
// and a closing call to action. The navbar and the disclaimer footer come from App.vue, as on every page.
// 5 Nov 2026: a "welcome back" strip for someone who is logged in or has a plan in progress (their last saved
// scenario, or a way back into the plan), a strip naming where the data and rules come from, and the page's colours
// kept to the app's pink and indigo family (no grey, green or amber), with pink hovers.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScenarioStore } from '../stores/scenario.js';
import { EXAMPLE_PLAN } from '../constants/examplePlan.js';
import { getRuleset } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const store = useScenarioStore();
const router = useRouter();
const auth = useAuthStore();

// Anything entered in the plan this session: loading the example would replace it, so ask first.
const hasOwnPlan = computed(() => {
  const p = store.profile;
  return store.wishes.length > 0
    || p.applicants.some((a) => a.age != null || a.monthlyIncome != null || a.cpfOaBalance != null)
    || p.cashSavings != null
    || Boolean(store.choiceA.town || store.choiceB.town);
});
const confirming = ref(null);

// "Welcome back": shown to someone logged in, or with a plan in progress this session. Logged in, it names their
// most recently saved scenario (newest first by date); anything that can't be loaded is simply left out.
const firstName = computed(() => {
  const n = auth.user?.name?.trim();
  return n ? n.split(/\s+/)[0] : '';
});
// The banner's greeting, and nothing else: "Welcome back, <name>" for someone logged in, "Welcome, <name>" right
// after creating an account (auth.justRegistered), "Welcome" for a visitor without an account. A plan in the tab
// doesn't count: it can be the example, so only the account says who this is.
const greeting = computed(() => {
  if (!auth.isLoggedIn) return 'Welcome';
  const hello = auth.justRegistered ? 'Welcome' : 'Welcome back';
  return firstName.value ? `${hello}, ${firstName.value}` : hello;
});

// Fill the plan with a ready-made couple and open their Results; "Change inputs" there makes it their own.
// If the user has started a plan, ask before replacing it (the confirm button passes force).
async function seeExample(from, force = false) {
  if (hasOwnPlan.value && !force) {
    confirming.value = from;
    await nextTick();
    document.querySelector('[data-cy=home-example-confirm-yes]')?.focus();
    return;
  }
  confirming.value = null;
  store.loadSaved(EXAMPLE_PLAN);
  router.push('/results');
}

// Ruleset freshness, shown under Good to know: green when checked against its sources, amber when not.
// Left out if the ruleset can't be loaded, rather than shown wrong.
const ruleset = ref(null);
const rulesetDate = computed(() => {
  const d = ruleset.value?.version ? new Date(`${ruleset.value.version}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
});
const rulesetVerified = computed(() => ruleset.value?.status === 'VERIFIED');
onMounted(async () => {
  try {
    ruleset.value = await getRuleset();
  } catch {
    ruleset.value = null;
  }
});

// The four plan steps, as the stepper names them, with what to have to hand for each.
const STEPS = [
  { title: 'What matters', text: 'Pick what you care about, like living near family or keeping cash in hand.', need: 'Nothing to prepare' },
  { title: 'About you', text: 'Ages, incomes, CPF and savings for both of you.', need: 'Your CPF statement, or an estimate' },
  { title: 'Your BTO', text: "The town, launch and flat type you're eyeing.", need: 'A town in mind' },
  { title: 'Resale flat', text: 'The town, flat type and lease left. Asking price is optional.', need: 'A listing you like' },
];

// "What you'll get": what the app gives a household, from the project report. Icons are 24×24 strokes.
const FEATURES = [
  { title: 'Find out the best year to apply', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3' },
  { title: 'The main costs and grants, counted', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3' },
  { title: 'Try what-ifs, then compare', icon: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4' },
  { title: 'Built on real HDB historical data', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { title: 'Personalised dashboards and results', icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
];

// "The costs people usually forget": each tile names a cost the engine counts and what it means.
// They run past in a strip that moves by itself, coloured in turn by TILE_THEMES. Icons are 24×24 strokes.
const TILES = [
  { title: 'Grants you qualify for', text: 'Checked against your income, citizenship and the flat you pick.', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z' },
  { title: 'Rent while you wait', text: 'What BTO buyers pay before they get their keys, which resale buyers skip.', icon: 'M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10' },
  { title: 'CPF interest you give up', text: "What your Ordinary Account would have earned if you hadn't used it.", icon: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6' },
  { title: 'Loan limits', text: 'How much you can borrow, based on your income and the lease left.', icon: 'M4 18a8 8 0 1 1 16 0M12 18l4-5M3 18h18' },
  { title: "Buyer's Stamp Duty", text: 'Worked out on the price you pay, and due soon after you buy.', icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6' },
  { title: 'Remaining lease', text: 'A shorter lease can limit your loan and how much CPF you can use.', icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2' },
  { title: 'Minimum occupation', text: 'How long you must live there before you can sell or rent out the whole flat.', icon: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4' },
  { title: 'Subsidy clawback', text: 'Plus and Prime flats return part of their subsidy when you sell.', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' },
];

// Four shades of the app's own two colours (pink and indigo), so the strip stays in the same family as every page.
const TILE_THEMES = ['pink', 'indigo', 'lilac', 'blush'];

// The moving strip. It scrolls itself a little each frame and loops (the tiles are listed twice, so jumping back by
// one copy looks seamless). Pointing at it pauses it; the arrows step one tile at a time and pause it; the middle
// button plays or pauses. People who turn off motion in their settings start paused.
const strip = ref(null);
const prefersStill = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const playing = ref(!prefersStill);
let hovering = false;
let pos = 0;
let lastTime = 0;
let frame = 0;
const SPEED = 0.04; // pixels per millisecond

const loopWidth = () => (strip.value ? strip.value.scrollWidth / 2 : 0);
function tileStep() {
  const tile = strip.value?.querySelector('.home-tile');
  if (!tile) return 296;
  return tile.offsetWidth + parseFloat(getComputedStyle(tile).marginRight || 0);
}
function tick(time) {
  const el = strip.value;
  if (el && playing.value && !hovering) {
    pos += (lastTime ? time - lastTime : 16) * SPEED;
    if (pos >= loopWidth()) pos -= loopWidth();
    el.scrollLeft = pos;
  }
  lastTime = time;
  frame = requestAnimationFrame(tick);
}
function step(dir) {
  const el = strip.value;
  if (!el) return;
  playing.value = false;
  const w = tileStep();
  const loop = loopWidth();
  if (dir > 0 && el.scrollLeft + w >= loop) el.scrollLeft -= loop;
  if (dir < 0 && el.scrollLeft < w) el.scrollLeft += loop;
  el.scrollTo({ left: (Math.round(el.scrollLeft / w) + dir) * w, behavior: prefersStill ? 'auto' : 'smooth' });
}
function togglePlay() {
  if (strip.value) pos = strip.value.scrollLeft;
  playing.value = !playing.value;
}
function setHover(on) {
  hovering = on;
  if (!on && strip.value) pos = strip.value.scrollLeft;
}
onMounted(() => { frame = requestAnimationFrame(tick); });
onBeforeUnmount(() => cancelAnimationFrame(frame));

// Every page is white now (_tokens.scss $bg-app); this class is kept only for anything that still targets Home.
onMounted(() => document.body.classList.add('is-home'));
onBeforeUnmount(() => document.body.classList.remove('is-home'));

const FAQS = [
  {
    q: 'Is this financial advice?',
    a: "No. It's an illustrative projection based on the rules in force and the numbers you enter. Use it to understand the trade-offs, then check with HDB, CPF and your bank before you commit.",
  },
  {
    q: 'What does "break-even" mean here?',
    a: "The flat price growth at which both paths end level in the comparison year. Above it one path is ahead, below it the other. It's a what-if line, not a price forecast.",
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
    <!-- Welcome: the greeting only. -->
    <section class="home-welcome" :aria-label="greeting" data-cy="home-welcome">
      <p class="home-welcome__hi mb-0" data-cy="home-welcome-greeting">{{ greeting }}</p>
    </section>

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
            <router-link class="btn btn-primary btn-disc home-btn home-btn--lead" :to="{ name: 'login', query: { redirect: '/plan?new=1' } }" data-cy="home-start-button">
              <span class="btn-disc__disc" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              Start planning
            </router-link>
            <button type="button" class="btn home-btn home-btn--ghost" data-cy="home-example-button" @click="seeExample('hero')">See an example</button>
          </div>
          <div v-if="confirming === 'hero'" class="home-confirm" role="group" aria-labelledby="home-confirm-hero" data-cy="home-example-confirm">
            <p id="home-confirm-hero" class="mb-2">The example replaces what you've entered in your plan so far.</p>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-primary btn-sm" data-cy="home-example-confirm-yes" @click="seeExample('hero', true)">Show the example</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="home-example-confirm-no" @click="confirming = null">Keep my plan</button>
            </div>
          </div>
          <span class="home-chip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            4 short steps
          </span>
        </div>
      </div>
        <svg viewBox="0 0 440 330" class="home-hero__art" data-cy="hero-scene" role="img" aria-label="Illustration: a new BTO block and a resale block, with trees">
          <circle cx="240" cy="160" r="150" style="fill: var(--accent-fill-3)" />
          <rect x="44" y="110" width="40" height="180" rx="4" style="fill: var(--indigo-tint-strong)" /><rect x="352" y="80" width="46" height="210" rx="4" style="fill: var(--indigo-tint-strong)" />
          <!-- BTO block (left) -->
          <rect x="66" y="152" width="124" height="138" rx="6" style="fill: var(--bg-surface)" /><rect x="58" y="144" width="140" height="11" rx="5.5" style="fill: var(--color-pink-deep)" />
          <rect x="80" y="170" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="108" y="170" width="20" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="136" y="170" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="164" y="170" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="80" y="200" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="108" y="200" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="136" y="200" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="164" y="200" width="20" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="80" y="230" width="20" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="108" y="230" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="136" y="230" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="164" y="230" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="80" y="260" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="108" y="260" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="136" y="260" width="20" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="164" y="260" width="20" height="14" rx="3" style="fill: var(--accent-fill-3)" />
          <!-- Resale block (centre) -->
          <rect x="212" y="92" width="132" height="198" rx="6" style="fill: var(--bg-surface)" /><rect x="204" y="84" width="148" height="11" rx="5.5" style="fill: var(--color-pink-deep)" />
          <rect x="226" y="110" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="110" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="288" y="110" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="110" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="226" y="134" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="134" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="288" y="134" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="134" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="226" y="158" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="257" y="158" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="288" y="158" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="158" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="226" y="182" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="182" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="288" y="182" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="319" y="182" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="226" y="206" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="206" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="288" y="206" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="206" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="226" y="230" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="230" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" /><rect x="288" y="230" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="230" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="226" y="254" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="257" y="254" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="288" y="254" width="22" height="14" rx="3" style="fill: var(--accent-fill-3)" /><rect x="319" y="254" width="22" height="14" rx="3" style="fill: var(--accent-fill-1)" />
          <!-- Small block (right) -->
          <rect x="352" y="196" width="66" height="94" rx="6" style="fill: var(--bg-surface)" /><rect x="346" y="189" width="78" height="9" rx="4.5" style="fill: var(--accent-fill-1)" />
          <rect x="364" y="210" width="16" height="12" rx="3" style="fill: var(--accent-fill-3)" /><rect x="390" y="210" width="16" height="12" rx="3" style="fill: var(--accent-fill-3)" /><rect x="364" y="236" width="16" height="12" rx="3" style="fill: var(--accent-fill-1)" /><rect x="390" y="236" width="16" height="12" rx="3" style="fill: var(--accent-fill-3)" /><rect x="364" y="262" width="16" height="12" rx="3" style="fill: var(--accent-fill-3)" /><rect x="390" y="262" width="16" height="12" rx="3" style="fill: var(--accent-fill-3)" />
          <!-- Ground and road -->
          <path d="M0 282 Q 220 258 440 280 V330 H0 Z" style="fill: var(--accent-fill-2)" />
          <rect x="0" y="300" width="440" height="30" style="fill: var(--bg-surface)" />
          <path d="M12 316 H412" style="stroke: var(--accent-fill-3)" stroke-width="3" stroke-dasharray="18 14" />
          <!-- Trees -->
          <path d="M34 296 V240" style="stroke: var(--text-secondary)" stroke-width="3" stroke-linecap="round" /><ellipse cx="34" cy="232" rx="30" ry="24" style="fill: var(--color-pink-deep)" /><ellipse cx="26" cy="224" rx="12" ry="7" style="fill: var(--accent-fill-2)" />
          <path d="M200 296 V258" style="stroke: var(--text-secondary)" stroke-width="3" stroke-linecap="round" /><ellipse cx="200" cy="252" rx="20" ry="16" style="fill: var(--accent-fill-1)" /><ellipse cx="195" cy="247" rx="8" ry="5" style="fill: var(--accent-fill-2)" />
          <path d="M410 298 V262" style="stroke: var(--text-secondary)" stroke-width="3" stroke-linecap="round" /><ellipse cx="410" cy="254" rx="24" ry="19" style="fill: var(--color-pink-deep)" /><ellipse cx="403" cy="248" rx="9" ry="6" style="fill: var(--accent-fill-2)" />
          <!-- Labels -->
          <g font-size="14" font-weight="600" text-anchor="middle" style="font-family: var(--font-body)">
            <rect x="82" y="104" width="92" height="30" rx="15" style="fill: var(--bg-surface); stroke: var(--border-subtle)" /><text x="128" y="124" style="fill: var(--text-primary)">BTO</text>
            <rect x="232" y="40" width="92" height="30" rx="15" style="fill: var(--bg-surface); stroke: var(--border-subtle)" /><text x="278" y="60" style="fill: var(--color-berry)">Resale</text>
          </g>
        </svg>
    </section>

    <!-- Where the numbers come from: real sources, not testimonials. -->
    <ul class="home-trust" aria-label="Where the numbers come from" data-cy="home-trust">
      <li>
        <span class="home-trust__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg></span>
        <span><strong>Resale prices</strong> from HDB's sales on data.gov.sg</span>
      </li>
      <li>
        <span class="home-trust__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg></span>
        <span><strong>Maps and distances</strong> from OneMap (SLA)</span>
      </li>
      <li>
        <span class="home-trust__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" /></svg></span>
        <span><strong>HDB and CPF rules</strong>, <router-link to="/sources" class="home-trust__link">dated<template v-if="rulesetDate"> {{ rulesetDate }}</template> and sourced</router-link></span>
      </li>
    </ul>

    <!-- How it works -->
    <section class="home-section" aria-labelledby="how-title" data-cy="home-steps">
      <div class="home-reveal home-head home-head--center">
        <h2 id="how-title" class="home-title">How it works</h2>
        <p class="home-sub">Four short steps, then your answer.</p>
      </div>
      <ol class="home-steps home-stagger">
        <li v-for="(s, i) in STEPS" :key="s.title" class="home-card home-step" :data-cy="`home-step-${i + 1}`">
          <span class="home-step__num" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="home-step__title">{{ s.title }}</h3>
          <span class="home-muted">{{ s.text }}</span>
          <span class="home-step__need">{{ s.need }}</span>
        </li>
      </ol>
    </section>

    <!-- What you'll get: one big card with the break-even illustration, and a card per feature around it. -->
    <section class="home-section home-get" aria-labelledby="get-title" data-cy="home-get">
      <div class="home-reveal home-head home-head--center">
        <h2 id="get-title" class="home-title">What you'll get</h2>
        <p class="home-sub">Everything you need to decide, in one place. Not a price prediction: a clear picture of both paths, built from your own numbers and today's rules.</p>
      </div>
      <!-- What you get: a plain list of features (icon + title, thin dividers) beside the break-even illustration. -->
      <div class="home-get-grid">
        <ul class="home-feat-list">
          <li v-for="(f, i) in FEATURES" :key="f.title" class="home-feat" :data-cy="`home-feat-${i + 1}`">
            <span class="home-feat__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="f.icon" /></svg></span>
            <span class="home-feat__title">{{ f.title }}</span>
          </li>
        </ul>
        <div class="home-get-panel home-reveal" data-cy="home-feat-breakeven">
          <div class="home-get__chart">
            <div class="home-get__legend">
              <span class="home-muted fw-normal">Illustration of a result</span>
              <span class="home-get__key"><span class="home-get__swatch home-get__swatch--bto" aria-hidden="true"></span>BTO</span>
              <span class="home-get__key"><span class="home-get__swatch home-get__swatch--resale" aria-hidden="true"></span>Resale</span>
            </div>
            <svg viewBox="0 0 520 250" class="home-get__svg" role="img" aria-label="Illustration: resale starts ahead, then the BTO line overtakes it and stays ahead">
              <g class="home-grid"><line x1="20" y1="40" x2="500" y2="40" /><line x1="20" y1="100" x2="500" y2="100" /><line x1="20" y1="160" x2="500" y2="160" /><line x1="20" y1="210" x2="500" y2="210" /></g>
              <g class="home-drawline">
                <polyline points="30,150 72,140 114,130 156,122 198,114 240,106 282,98 324,90 366,83 408,76 450,70 492,64" fill="none" class="home-line-resale" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 10" />
                <polyline points="30,205 72,200 114,190 156,175 198,146 240,126 282,108 324,90 366,70 408,52 450,36 492,22" fill="none" class="home-line-bto" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
              </g>
              <g class="home-meetpop">
                <circle class="home-pulse home-berry" cx="324" cy="90" r="8" /><circle cx="324" cy="90" r="8" class="home-berry" /><circle cx="324" cy="90" r="3" class="home-white" />
                <rect x="336" y="98" width="146" height="30" rx="15" class="home-white" /><text x="409" y="118" text-anchor="middle" font-size="13" font-weight="600" class="home-berry">Where they cross</text>
              </g>
              <g font-size="12" text-anchor="middle" class="home-axis"><text x="30" y="242">Today</text><text x="500" y="242" text-anchor="end">Years ahead</text></g>
            </svg>
            <p class="home-get__note">Example figures. Illustrative projection, not financial advice.</p>
          </div>
          <button type="button" class="btn btn-link p-0 home-get__link" data-cy="home-example-link" @click="seeExample('get')">See an example result</button>
          <div v-if="confirming === 'get'" class="home-confirm" role="group" aria-labelledby="home-confirm-get" data-cy="home-example-confirm">
            <p id="home-confirm-get" class="mb-2">The example replaces what you've entered in your plan so far.</p>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-primary btn-sm" data-cy="home-example-confirm-yes" @click="seeExample('get', true)">Show the example</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="home-example-confirm-no" @click="confirming = null">Keep my plan</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- The costs people usually forget -->
    <section class="home-section home-costs" aria-labelledby="costs-title" data-cy="home-costs">
      <div class="home-reveal home-costs__head">
        <span class="home-chip home-chip--outlined">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg>
          What we count
        </span>
        <h2 id="costs-title" class="home-costs__title">The costs people usually forget</h2>
        <p class="home-lead text-center">Costs that are easy to forget. We count these in your answer.</p>
      </div>
      <!-- A strip that moves by itself, with buttons to step through it or pause it. The second copy only makes the loop
           seamless, so screen readers skip it. -->
      <div ref="strip" class="home-marquee" data-cy="home-costs-strip" @pointerenter="setHover(true)" @pointerleave="setHover(false)" @touchstart.passive="playing = false">
        <ul class="home-marquee__track">
          <li v-for="(t, i) in TILES" :key="t.title" class="home-tile" :class="`home-tile--${TILE_THEMES[i % 4]}`" :data-cy="`home-cost-${i + 1}`">
            <span class="home-tile__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="t.icon" /></svg></span>
            <h3 class="home-tile__title">{{ t.title }}</h3>
            <p class="home-tile__text" data-cy="home-tile-text">{{ t.text }}</p>
          </li>
          <li v-for="(t, i) in TILES" :key="`copy-${t.title}`" class="home-tile" :class="`home-tile--${TILE_THEMES[i % 4]}`" aria-hidden="true">
            <span class="home-tile__icon"><svg viewBox="0 0 24 24"><path :d="t.icon" /></svg></span>
            <p class="home-tile__title">{{ t.title }}</p>
            <p class="home-tile__text">{{ t.text }}</p>
          </li>
        </ul>
      </div>
      <div class="home-marquee__controls">
        <button type="button" class="home-round-btn" aria-label="Previous cost" data-cy="home-costs-prev" @click="step(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" class="home-round-btn" :aria-label="playing ? 'Pause the moving tiles' : 'Play the moving tiles'" data-cy="home-costs-toggle" @click="togglePlay">
          <svg v-if="playing" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
        </button>
        <button type="button" class="home-round-btn" aria-label="Next cost" data-cy="home-costs-next" @click="step(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
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
        <span
          v-if="rulesetDate"
          class="home-ruleset"
          :class="rulesetVerified ? 'home-ruleset--ok' : 'home-ruleset--warn'"
          data-cy="home-ruleset-status"
        >
          <span class="home-ruleset__dot" aria-hidden="true"></span>
          <template v-if="rulesetVerified">Ruleset {{ rulesetDate }} · checked against its sources</template>
          <template v-else>Ruleset {{ rulesetDate }} · not yet verified against its sources</template>
        </span>
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
      <router-link class="btn btn-disc home-btn home-btn--light" :to="{ name: 'login', query: { redirect: '/plan?new=1' } }" data-cy="home-cta-button">
        <span class="btn-disc__disc" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
        Start planning
      </router-link>
    </section>
  </div>
</template>

<style scoped>
/* --bleed-gutter: the gap left at each screen edge by the full-width parts (the hero and the costs strip). */
.home { --bleed-gutter: clamp(12px, 2.5vw, 40px); display: flex; flex-direction: column; gap: calc(var(--space-10) + var(--space-5)); padding-bottom: var(--space-6); }

/* ---- full width: the hero box and the costs strip stretch across the whole screen, not just the page column.
   They start half a screen left of the column's centre and are one screen wide, minus the gutter on each side.
   The gutter is wider than half a desktop scrollbar, so this never causes sideways scrolling. ---- */
.home-hero, .home-marquee {
  width: calc(100vw - 2 * var(--bleed-gutter));
  max-width: none;
  margin-left: calc(50% - 50vw + var(--bleed-gutter));
}

/* ---- shared ---- */
.home-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: 0 1px 2px rgba(29, 29, 36, 0.05), 0 8px 24px rgba(60, 64, 90, 0.06); }
.home-section, .home-head { display: flex; flex-direction: column; }
.home-section { gap: var(--space-5); }
.home-head { gap: var(--space-2); }
.home-eyebrow { margin: 0; font-size: 14px; font-weight: 600; color: var(--color-berry, #b23a78); letter-spacing: 0.02em; }
.home-h2 { margin: 0; font-size: clamp(24px, 2.6vw, 32px); font-weight: 500; letter-spacing: -0.02em; line-height: 1.2; }
.home-lead { margin: 0; font-size: 16px; color: var(--text-secondary); line-height: 1.6; max-width: 68ch; }
.home-lead--lg { font-size: 17px; }
/* Section titles: large and centred, with a smaller line under them. */
.home-head--center { align-items: center; text-align: center; gap: var(--space-3); margin-bottom: var(--space-3); }
.home-title { margin: 0; font-size: clamp(32px, 4.2vw, 52px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.08; }
.home-sub { margin: 0; max-width: 62ch; font-size: clamp(15px, 1.3vw, 17px); line-height: 1.6; color: var(--text-secondary); }
.home-muted { color: var(--text-secondary); line-height: 1.5; }
.home-white { fill: var(--bg-surface); }
.home-pink { fill: var(--accent-fill-1); }
.home-berry { fill: var(--color-berry, #b23a78); }

/* ---- hero ---- */
/* The hero is one box: copy, buttons and the crossing scene inside it. On hover it lifts slightly and turns pink. */
.home-hero {
  --hero-pad: clamp(20px, 3.5vw, 44px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  position: relative;
  overflow: hidden;
  padding: var(--hero-pad);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: linear-gradient(120deg, var(--accent-tint), var(--bg-surface) 45%, var(--indigo-tint));
  box-shadow: 0 20px 50px rgba(60, 64, 90, 0.08);
  transition: translate 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}
/* The pink wash that fades in on hover (a gradient can't transition, so it sits on its own layer). */
.home-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, var(--accent-fill-2), var(--accent-tint) 55%, transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}
.home-hero > * { position: relative; z-index: 1; }
.home-hero:hover {
  translate: 0 -6px;
  border-color: var(--accent-fill-1);
  box-shadow: 0 26px 60px rgba(240, 138, 182, 0.3);
}
.home-hero:hover::before { opacity: 0.7; }
/* Wide screens: copy and buttons on the left, the illustration in the space on the right. */
.home-hero__art { display: block; width: 100%; max-width: 360px; height: auto; align-self: center; }
@media (min-width: 992px) {
  /* Desktop: text on the left, picture on the right, centred vertically. */
  .home-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    align-items: center;
    gap: var(--space-8);
    padding: clamp(40px, 4.5vw, 72px) clamp(32px, 4vw, 64px);
    /* On very wide screens, keep the text and picture lined up with the page column instead of the screen edges. */
    padding-inline: max(clamp(32px, 4vw, 64px), calc((100vw - 2 * var(--bleed-gutter) - 1200px) / 2));
  }
  .home-hero__art { max-width: 480px; justify-self: end; }
  .home-hero__title { font-size: clamp(40px, 4.2vw, 62px); }
  .home-hero .home-lead--lg { font-size: 18px; }
}
.home-hero__row { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-5); }
.home-hero__copy { display: flex; flex-direction: column; gap: var(--space-4); max-width: 720px; }
.home-hero__title { margin: 0; font-size: clamp(30px, 3.6vw, 46px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.05; }
.home-hero__actions { display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; }
.home-confirm { max-width: 26rem; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--bg-surface); font-size: 0.875rem; }
.home-btn { min-height: 52px; display: inline-flex; align-items: center; font-weight: 500; }
.home-btn.btn-disc { padding-right: var(--space-5); }
/* Start planning is the page's main action: taller, larger text and disc, so it reads first. */
.home-btn--lead { min-height: 64px; padding-right: var(--space-6) !important; font-size: 1.125rem; gap: var(--space-3); box-shadow: 0 8px 24px rgba(29, 29, 36, 0.18); }
.home-btn--lead .btn-disc__disc { width: 44px; height: 44px; }
.home-btn--lead:hover { transform: translateY(-1px); }
@media (prefers-reduced-motion: reduce) { .home-btn--lead:hover { transform: none; } }
.home-btn--ghost { padding: 0 var(--space-5); background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-primary); }
.home-btn--ghost:hover { background: var(--accent-fill-3); color: var(--text-primary); }
.home-chip { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-radius: var(--radius-pill); background: var(--bg-surface); font-size: 14px; font-weight: 500; }

/* ---- how it works ---- */
/* The four step cards (the original design). On hover a card grows a little and turns pink. */
.home-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--space-4); margin: 0; padding: 0; list-style: none; }
.home-step {
  position: relative;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: scale 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.home-step__num { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-fill-2); display: grid; place-items: center; font-weight: 600; transition: background 0.25s ease, color 0.25s ease; }
.home-step__title { margin: 0; font-weight: 500; font-size: 17px; line-height: 1.3; transition: color 0.25s ease; }
.home-step__need { align-self: flex-start; margin-top: auto; padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); background: var(--bg-page); font-size: 13px; color: var(--text-secondary); }
/* `scale`, not `transform`, so it doesn't clash with the scroll-in animation (which uses transform). */
.home-step:hover {
  z-index: 1;
  scale: 1.06;
  border-color: var(--accent-fill-1);
  background: var(--accent-tint);
  box-shadow: 0 18px 40px rgba(240, 138, 182, 0.28);
}
.home-step:hover .home-step__num { background: var(--color-berry); color: var(--on-primary); }
.home-step:hover .home-step__title { color: var(--color-berry); }

/* ---- what you'll get: the feature list on the left, the illustration on the right (stacked on smaller screens).
   The list has no boxes: icon + title rows with thin dividers. Hover tints a row pink and nudges it right. ---- */
.home-get-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); align-items: center; }
@media (min-width: 992px) { .home-get-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: var(--space-8); } }
.home-feat-list { margin: 0; padding: 0; list-style: none; }
.home-feat {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-3);
  border-radius: var(--radius-sm);
  transition: background 0.25s ease, translate 0.25s ease;
}
/* Dividers between rows: a straight hairline above each row after the first (drawn separately so the row's rounded
   hover background doesn't bend it). */
.home-feat { position: relative; }
.home-feat + .home-feat::before { content: ""; position: absolute; top: 0; left: var(--space-3); right: var(--space-3); height: 1px; background: var(--border-subtle); }
.home-feat:hover::before, .home-feat:hover + .home-feat::before { opacity: 0; }
.home-feat__icon { flex: none; width: 48px; height: 48px; border-radius: 14px; background: var(--accent-tint); display: grid; place-items: center; transition: background 0.25s ease; }
.home-feat__icon svg { width: 24px; height: 24px; fill: none; stroke: var(--color-berry); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.home-feat__title { font-size: 18px; font-weight: 500; letter-spacing: -0.01em; transition: color 0.25s ease; }
.home-feat:hover { background: var(--accent-tint); translate: 4px 0; }
.home-feat:hover .home-feat__icon { background: var(--accent-fill-2); }
.home-feat:hover .home-feat__title { color: var(--color-berry); }
.home-get-panel { display: flex; flex-direction: column; gap: var(--space-3); }
.home-get__link { align-self: flex-start; font-weight: 500; }
.home-get__chart { background: var(--accent-fill-3); border-radius: var(--radius-md); padding: var(--space-5) var(--space-5) var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
.home-get__legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; font-size: 14px; font-weight: 500; }
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

/* ---- the costs people usually forget: hover tiles ---- */
.home-costs { gap: calc(var(--space-6) + var(--space-1)); }
.home-costs__head { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; }
.home-costs__title { margin: 0; font-size: clamp(32px, 4.2vw, 52px); font-weight: 600; letter-spacing: -0.03em; line-height: 1.08; }
.home-chip--outlined { border: 1px solid var(--border-subtle); box-shadow: 0 1px 2px rgba(29, 29, 36, 0.06); }
/* The moving strip: the track holds two copies of the tiles; the script scrolls it and loops back by one copy. */
.home-marquee {
  overflow-x: auto;
  scrollbar-width: none;
  padding: var(--space-3) 0 var(--space-5);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent); /* a mask, not a colour: only its opacity counts */
  mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
}
.home-marquee::-webkit-scrollbar { display: none; }
.home-marquee__track { display: flex; width: max-content; margin: 0; padding: 0; list-style: none; }
.home-marquee__controls { display: flex; justify-content: center; gap: var(--space-3); }
.home-round-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  display: grid;
  place-items: center;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, translate 0.2s ease;
}
.home-round-btn svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.home-round-btn:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); translate: 0 -2px; }
.home-round-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }

/* Each tile takes one of four colours: a tinted card, a stronger icon well, and the icon and title in the matching ink. */
.home-tile {
  flex: none;
  width: 280px;
  margin-right: var(--space-4); /* margin, not gap, so the two copies are exactly equal and the loop doesn't jump */
  padding: var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: var(--tile-bg);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: translate 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}
.home-tile--pink { --tile-bg: var(--accent-tint); --tile-well: var(--accent-fill-2); --tile-ink: var(--color-berry); }
.home-tile--indigo { --tile-bg: var(--indigo-tint); --tile-well: var(--indigo-tint-strong); --tile-ink: var(--indigo); }
.home-tile--lilac { --tile-bg: color-mix(in srgb, var(--accent-fill-3) 55%, var(--bg-surface)); --tile-well: var(--accent-fill-3); --tile-ink: var(--indigo); }
.home-tile--blush { --tile-bg: color-mix(in srgb, var(--accent-fill-2) 40%, var(--bg-surface)); --tile-well: var(--accent-fill-2); --tile-ink: var(--color-berry); }
.home-tile__icon { width: 48px; height: 48px; margin-bottom: var(--space-2); border-radius: 14px; background: var(--tile-well); display: grid; place-items: center; }
.home-tile__icon svg { width: 24px; height: 24px; fill: none; stroke: var(--tile-ink); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.home-tile__title { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; color: var(--tile-ink); }
.home-tile__text { margin: 0; font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
.home-tile:hover { translate: 0 -6px; border-color: var(--tile-well); box-shadow: 0 14px 30px rgba(60, 64, 90, 0.1); }

/* ---- FAQ ---- */
.home-faq-wrap { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }
.home-faq-wrap__intro { flex: 1 1 300px; }
.home-ruleset { align-self: flex-start; display: inline-flex; align-items: center; gap: var(--space-2); margin-top: var(--space-3); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); font-size: 14px; font-weight: 500; }
.home-ruleset__dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.home-ruleset--ok { background: var(--success-fill); color: var(--success); }
.home-ruleset--warn { background: var(--warning-fill); color: var(--warning); }
.home-faq { flex: 2 1 520px; min-width: 0; padding: var(--space-2) var(--space-5); }
.home-faq details { border-bottom: 1px solid var(--border-subtle); padding: var(--space-4) var(--space-1); }
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
.home-faq p { margin: var(--space-3) 0 0; color: var(--text-secondary); line-height: 1.6; max-width: 72ch; }
.home-faq summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 4px; border-radius: 8px; }

/* ---- welcome back ---- */
.home-welcome { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-5); padding: var(--space-4) var(--space-5); border: 1px solid var(--accent-fill-2); border-radius: var(--radius-lg); background: linear-gradient(100deg, var(--accent-tint), var(--indigo-tint)); animation: home-welcome-in 0.5s var(--ease-out) both; }
.home-welcome__avatar { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--bg-surface); color: var(--color-berry); font-family: var(--font-heading); font-size: 1.375rem; font-weight: 700; box-shadow: 0 4px 14px rgba(240, 138, 182, 0.25); }
.home-welcome__text { flex: 1 1 280px; min-width: 0; }
.home-welcome__hi { margin: 0; font-family: var(--font-heading); font-size: clamp(1.25rem, 2vw, 1.5rem); font-weight: 600; letter-spacing: -0.02em; }
.home-welcome__line { margin: 2px 0 0; color: var(--text-secondary); }
.home-welcome__line strong { color: var(--text-primary); }
.home-welcome__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.home-welcome__btn { min-height: 44px; display: inline-flex; align-items: center; }
.home-welcome .btn-outline-secondary { background: var(--bg-surface); }
.home-welcome .btn-outline-secondary:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); }
@keyframes home-welcome-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

/* ---- where the numbers come from ---- */
.home-trust { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3) var(--space-6); margin: calc(var(--space-8) * -1) 0 0; padding: 0; list-style: none; font-size: 0.9375rem; color: var(--text-secondary); }
.home-trust li { display: flex; align-items: center; gap: var(--space-2); }
.home-trust strong { color: var(--text-primary); font-weight: 600; }
.home-trust__icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--accent-tint); color: var(--color-berry); }
.home-trust__icon svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.home-trust__link { color: inherit; text-underline-offset: 3px; transition: color 0.15s ease; }
.home-trust__link:hover { color: var(--color-berry); }

/* ---- closing call to action ---- */
.home-cta { position: relative; overflow: hidden; background: var(--text-primary); color: var(--bg-surface); border-radius: var(--radius-lg); padding: clamp(28px, 4vw, 48px); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-5); }
.home-cta__art { position: absolute; right: -10px; bottom: 0; width: min(440px, 50%); height: auto; opacity: 0.9; }
.home-cta__copy { position: relative; display: flex; flex-direction: column; gap: var(--space-2); max-width: 560px; }
.home-cta__sub { color: rgba(255, 255, 255, 0.78); line-height: 1.6; }
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
    .home-drawline { animation: home-draw linear both; animation-timeline: view(); animation-range: entry 0% cover 35%; }
    .home-meetpop { transform-box: fill-box; transform-origin: 20px 50%; animation: home-meetpop linear both; animation-timeline: view(); animation-range: cover 30% cover 42%; }
  }
}
@keyframes home-rise { from { opacity: 0; transform: translateY(64px) scale(0.96); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes home-card { from { opacity: 0; transform: translateY(80px) rotate(-2deg) scale(0.92); } to { opacity: 1; transform: none; } }
@keyframes home-slide { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes home-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes home-meetpop { 0% { opacity: 0; transform: scale(0.2); } 70% { opacity: 1; transform: scale(1.35); } 100% { opacity: 1; transform: scale(1); } }

/* ---- pink hover: boxes lift with a springy ease and glow pink (like ParentPal's purple) ---- */
/* `translate` (not `transform`) so it doesn't fight the scroll-reveal animations, which use transform. */
.home-faq {
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}
.home-faq:hover {
  border-color: var(--accent-fill-2);
  box-shadow: 0 18px 44px rgba(240, 138, 182, 0.2);
}
.home-btn--ghost:hover { border-color: var(--accent-fill-1); }

@media (prefers-reduced-motion: reduce) {
  .home-pulse, .home-lit, .home-welcome { animation: none; }
  .home-hero, .home-hero::before { transition: none; }
  .home-hero:hover { translate: none; }
  .home-tile:hover, .home-feat:hover { translate: none; }
  .home-feat { transition: none; }
  .home-step { transition: none; }
  .home-step:hover { scale: none; }
  .home-tile, .home-round-btn { transition: none; }
  .home-faq summary::after { transition: none; }
}
</style>

<style>
/* Home: white like every page now (_tokens.scss); kept so nothing that targets body.is-home changes. */
body.is-home {
  background-color: var(--bg-surface);
  --nav-surface: color-mix(in srgb, var(--bg-surface) 92%, transparent);
}
</style>
