<script setup>
// "How it works" on the home page: four slides, one per stage of the plan. Moves on by itself every 7 s, but
// (WAI-ARIA carousel pattern) never against the user: a Pause button, a stop while the pointer or keyboard focus
// is inside, and no auto-play at all under prefers-reduced-motion. Previous / Next and the dots work by keyboard.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const INTERVAL_MS = 7000;
const SLIDES = [
  {
    title: 'Tell us about you',
    text: 'Ages, incomes, CPF and cash for the two of you. That decides which grants and loans you can get.',
    // Lucide "users"
    icon: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75', 'M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0'],
  },
  {
    title: 'Pick your BTO',
    text: "Town, launch and flat type. We price it from HDB's range for that launch, and you can move it.",
    // Lucide "building-2"
    icon: ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2', 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2', 'M10 6h4', 'M10 10h4', 'M10 14h4', 'M10 18h4'],
  },
  {
    title: 'Pick a resale flat',
    text: 'Town, flat type and lease left. We use the median of recent sales, or the asking price you enter.',
    // Lucide "house"
    icon: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  },
  {
    title: 'See which ends ahead',
    text: 'Both paths year by year, with grants, loans and costs, and where the answer would flip.',
    // Lucide "chart-line"
    icon: ['M3 3v16a2 2 0 0 0 2 2h16', 'm19 9-5 5-4-4-3 3'],
  },
];

const current = ref(0);
const playing = ref(true); // the user's choice (Pause / Play)
const held = ref(false); // pointer or focus inside: stop for now, without changing the user's choice
const reducedMotion = ref(false);
let timer = null;

const moving = computed(() => playing.value && !held.value && !reducedMotion.value);

function go(i) {
  current.value = (i + SLIDES.length) % SLIDES.length;
  restart();
}
function restart() {
  clearInterval(timer);
  timer = null;
  if (moving.value) timer = setInterval(() => { current.value = (current.value + 1) % SLIDES.length; }, INTERVAL_MS);
}
function setHeld(v) { held.value = v; restart(); }
function togglePlay() { playing.value = !playing.value; restart(); }

let mq = null;
const onMotion = () => { reducedMotion.value = mq.matches; restart(); };
onMounted(() => {
  mq = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  if (mq) {
    reducedMotion.value = mq.matches;
    mq.addEventListener?.('change', onMotion);
  }
  restart();
});
onBeforeUnmount(() => {
  clearInterval(timer);
  mq?.removeEventListener?.('change', onMotion);
});

// Focus leaving the carousel altogether lets it move again; moving between its own buttons does not.
function onFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
}
</script>

<template>
  <section
    class="hiw card"
    aria-roledescription="carousel"
    aria-labelledby="hiw-heading"
    data-cy="home-carousel"
    @mouseenter="setHeld(true)"
    @mouseleave="setHeld(false)"
    @focusin="setHeld(true)"
    @focusout="onFocusOut"
  >
    <div class="hiw__head">
      <h2 id="hiw-heading" class="h5 mb-0">How it works</h2>
      <button
        v-if="!reducedMotion"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :aria-label="playing ? 'Pause the slides' : 'Play the slides'"
        data-cy="home-carousel-toggle"
        @click="togglePlay"
      >
        {{ playing ? 'Pause' : 'Play' }}
      </button>
    </div>

    <!-- Announce slide changes only when they come from the user, not every 7 s while it moves by itself. -->
    <div class="hiw__viewport" :aria-live="moving ? 'off' : 'polite'">
      <Transition name="hiw-slide" mode="out-in">
        <div
          :key="current"
          class="hiw__slide"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${current + 1} of ${SLIDES.length}: ${SLIDES[current].title}`"
          :data-cy="`home-carousel-slide-${current + 1}`"
        >
          <span class="hiw__disc" :class="`hiw__disc--${(current % 3) + 1}`" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path v-for="d in SLIDES[current].icon" :key="d" :d="d" />
            </svg>
          </span>
          <div>
            <p class="hiw__step small text-secondary mb-1">Step {{ current + 1 }} of {{ SLIDES.length }}</p>
            <h3 class="h6 mb-1" data-cy="home-carousel-title">{{ SLIDES[current].title }}</h3>
            <p class="mb-0 text-secondary">{{ SLIDES[current].text }}</p>
          </div>
        </div>
      </Transition>
    </div>

    <div class="hiw__controls">
      <button type="button" class="btn btn-outline-secondary btn-sm hiw__arrow" aria-label="Previous step" data-cy="home-carousel-prev" @click="go(current - 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <div class="hiw__dots">
        <button
          v-for="(s, i) in SLIDES"
          :key="s.title"
          type="button"
          class="hiw__dot"
          :class="{ 'hiw__dot--on': i === current }"
          :aria-label="`Step ${i + 1}: ${s.title}`"
          :aria-current="i === current ? 'step' : undefined"
          :data-cy="`home-carousel-dot-${i + 1}`"
          @click="go(i)"
        ></button>
      </div>
      <button type="button" class="btn btn-outline-secondary btn-sm hiw__arrow" aria-label="Next step" data-cy="home-carousel-next" @click="go(current + 1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.hiw { padding: var(--space-5); }
.hiw__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.hiw__viewport { min-height: 7.5rem; overflow: hidden; }
.hiw__slide { display: flex; gap: var(--space-4); align-items: flex-start; }
.hiw__disc {
  flex: none;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  color: var(--text-primary);
}
.hiw__disc svg { width: 28px; height: 28px; }
.hiw__disc--1 { background: var(--accent-fill-1); }
.hiw__disc--2 { background: var(--accent-fill-2); }
.hiw__disc--3 { background: var(--accent-fill-3); }
.hiw__controls { display: flex; align-items: center; justify-content: center; gap: var(--space-3); margin-top: var(--space-4); }
.hiw__arrow { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: 50%; }
.hiw__arrow svg { width: 20px; height: 20px; }
.hiw__dots { display: flex; gap: var(--space-1); }
/* 24px hit area around an 8px dot (WCAG 2.5.8). */
.hiw__dot {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.hiw__dot::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  transition: width 0.2s ease, background-color 0.2s ease;
}
.hiw__dot--on::before { width: 20px; border-radius: 4px; background: var(--primary); }
.hiw__dot:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

.hiw-slide-enter-active,
.hiw-slide-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.hiw-slide-enter-from { opacity: 0; transform: translateX(16px); }
.hiw-slide-leave-to { opacity: 0; transform: translateX(-16px); }
@media (prefers-reduced-motion: reduce) {
  .hiw-slide-enter-active,
  .hiw-slide-leave-active,
  .hiw__dot::before { transition: none; }
  .hiw-slide-enter-from,
  .hiw-slide-leave-to { transform: none; }
}
</style>
