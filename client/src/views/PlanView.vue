<script setup>
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScenarioStore, STEPS } from '../stores/scenario.js';
import AppStepper from '../components/AppStepper.vue';
import SituationForm from '../components/SituationForm.vue';
import PathForm from '../components/PathForm.vue';
import WishesForm from '../components/WishesForm.vue';
import EstateScene from '../components/EstateScene.vue';
import BtoScene from '../components/BtoScene.vue';
import { useAuthStore } from '../stores/auth.js';
import { validateStep } from '../validation/planValidation.js';
import { FLAT_TYPES, toTitleCase } from '../constants/planOptions.js';

const store = useScenarioStore();
const auth = useAuthStore();
const router = useRouter();

// The track shows the four input steps (Results is the page after them), with step 1 shortened to fit.
const TRACK = STEPS.slice(0, -1).map((s, i) => (i === 0 ? 'What matters' : s));
const HEADINGS = ['What matters most in your next home?', STEPS[1], 'Which BTO are you eyeing?', STEPS[3]];
const isLastInput = computed(() => store.step === STEPS.length - 2);
const nextLabel = computed(() => (isLastInput.value ? 'See results' : `Next: ${STEPS[store.step + 1].toLowerCase()}`));

// Errors are always computed, but only shown after the user tries to continue,
// so a fresh form is not covered in red before they have typed anything.
const attempted = ref(false);
const errors = computed(() => validateStep(store.step, store));
const isStepValid = computed(() => Object.keys(errors.value).length === 0);
const shownErrors = computed(() => (attempted.value ? errors.value : {}));

// Step 3 ("Your BTO") has its own layout, as on the Calm "Plan your BTO" board: the track above two columns,
// the building illustration with a summary of the choice on the left and the form card on the right.
const isBtoStep = computed(() => store.step === 2);
const firstName = computed(() => auth.user?.name?.trim().split(/\s+/)[0] ?? '');
// The launch PathForm resolves the choice to; its range and wait fill the summary card.
const btoProject = ref(null);
const btoSummary = computed(() => {
  const { town, flatType } = store.choiceA;
  if (!town) return null;
  const parts = [toTitleCase(town), FLAT_TYPES.find((f) => f.value === flatType)?.label];
  const flat = btoProject.value?.flats?.find((f) => f.flatType === flatType);
  if (flat) parts.push(`S$${Math.round(flat.priceMinCents / 100000)}k–${Math.round(flat.priceMaxCents / 100000)}k`);
  return parts.filter(Boolean).join(' · ');
});
// Keys year for the scene's bubble: application (1 January) plus HDB's waiting time for the launch (D7).
const keysYear = computed(() => {
  const months = btoProject.value?.waitMonths;
  return typeof months === 'number' ? store.choiceA.applicationYear + Math.floor(months / 12) : null;
});
const keysIn = computed(() => {
  const months = btoProject.value?.waitMonths;
  if (typeof months !== 'number') return null;
  // To the nearest half year, as the launch chips' hint in PathForm says it.
  const half = Math.round(months / 6) / 2;
  if (half < 1) return 'Keys in under a year';
  const whole = Math.floor(half);
  return `Keys in about ${whole}${half > whole ? '½' : ''} year${half === 1 ? '' : 's'}`;
});

async function next() {
  if (!isStepValid.value) {
    attempted.value = true;
    // Move focus to the first bad field so keyboard and screen-reader users land on it.
    await nextTick();
    document.querySelector('[data-cy="plan-form"] .is-invalid')?.focus();
    return;
  }

  attempted.value = false;
  if (isLastInput.value) {
    // Last input step done: go to results.
    router.push('/results');
    return;
  }
  store.next();
}

function back() {
  attempted.value = false;
  store.back();
}
</script>

<template>
  <component
    :is="isBtoStep ? 'div' : EstateScene"
    v-bind="isBtoStep ? {} : { wishes: store.wishes, moveInByYear: store.profile.constraints?.moveInByYear }"
    :class="isBtoStep ? 'bto-step' : ['plan-scene', { 'plan-scene--tall': store.step > 0 }]"
  >
    <AppStepper v-if="isBtoStep" :steps="TRACK" :current="store.step" />

    <div :class="{ 'bto-step__grid': isBtoStep }">
      <section v-if="isBtoStep" class="bto-step__art" data-cy="bto-step-art">
        <BtoScene :wishes="store.wishes" :keys-year="keysYear" />
        <div class="bto-step__summary" data-cy="bto-step-summary" aria-live="polite">
          <span class="bto-step__summary-text">
            <span class="bto-step__summary-label">Building your BTO plan</span>
            <span class="bto-step__summary-value">{{ btoSummary ?? 'Choose a town to start' }}</span>
          </span>
          <span v-if="keysIn" class="bto-step__keys" data-cy="bto-step-keys">{{ keysIn }}</span>
        </div>
      </section>

      <form class="card plan-card" :class="{ 'plan-card--side': isBtoStep }" data-cy="plan-form" novalidate @submit.prevent="next">
        <div
          class="plan-card__body"
          :class="{ 'plan-card__body--center': store.step === 0 }"
          :data-cy="`plan-step-${store.step + 1}-panel`"
        >
          <AppStepper v-if="!isBtoStep" :steps="TRACK" :current="store.step" />

          <div class="plan-card__head">
            <p v-if="isBtoStep && firstName" class="plan-card__lead">Welcome back, {{ firstName }}</p>
            <h2 class="plan-card__title" :class="{ 'plan-card__title--hero': store.step === 0 || isBtoStep }">{{ HEADINGS[store.step] }}</h2>
            <p v-if="store.step === 0" class="plan-card__lead">Pick as many as you like. You can change these later.</p>
            <p v-else-if="isBtoStep" class="plan-card__lead">
              We'll compare it with a resale flat in the next step, as if you apply next year. You can change the year on the dashboard.
            </p>
          </div>

          <div
            v-if="attempted && !isStepValid"
            class="alert alert-danger py-2 mb-0"
            role="alert"
            data-cy="plan-step-errors"
          >
            Some details need fixing before you continue.
          </div>

          <WishesForm v-if="store.step === 0" />
          <SituationForm v-else-if="store.step === 1" :errors="shownErrors" />
          <PathForm v-else-if="store.step === 2" key="choiceA" choice-key="choiceA" :errors="shownErrors" @project="btoProject = $event" />
          <PathForm v-else-if="store.step === 3" key="choiceB" choice-key="choiceB" :errors="shownErrors" />

          <div
            class="plan-card__actions"
            :class="store.step === 0 ? 'justify-content-center' : 'justify-content-between'"
          >
            <!-- Step 1 is optional: skip it. Later steps go back instead. -->
            <button v-if="store.step === 0" type="button" class="btn btn-link" data-cy="plan-step-skip" @click="next">
              Skip for now
            </button>
            <button
              v-else type="button" class="btn"
              :class="isBtoStep ? 'btn-link plan-card__back-link' : 'btn-outline-secondary'"
              data-cy="plan-step-back" @click="back"
            >
              Back
            </button>
            <button type="submit" class="btn btn-primary btn-disc" data-cy="plan-step-next">
              <span class="btn-disc__disc" aria-hidden="true">
                <!-- Lucide "arrow-right" -->
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              {{ nextLabel }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </component>
</template>

<style scoped>
/* The step card: progress, question and actions in one white box over the scene, sized and spaced as on the
   Calm onboarding board (820px, 36px corners, 24px between parts). */
.plan-card {
  max-width: 820px;
  margin-inline: auto;
  border: 0;
  border-radius: 36px;
  box-shadow: 0 1px 2px rgba(29, 29, 36, 0.05), 0 20px 40px rgba(60, 64, 90, 0.08);
  padding: 32px clamp(20px, 4vw, 48px) 36px;
}
.plan-card__body { display: flex; flex-direction: column; gap: 24px; }
.plan-card__body--center { align-items: center; text-align: center; }
.plan-card__head { display: flex; flex-direction: column; gap: 8px; }
.plan-card__title { margin: 0; }
.plan-card__title--hero { font-size: clamp(26px, 2.8vw, 36px); font-weight: 500; letter-spacing: -0.025em; line-height: 1.15; }
.plan-card__lead { margin: 0; font-size: 15px; color: var(--text-secondary, #5f6373); }
.plan-card__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }

/* Step 3, "Your BTO" (Calm "Plan your BTO" board): track on the page, then the illustration panel and the form
   card side by side, stacking below ~900px. */
.bto-step { display: flex; flex-direction: column; gap: 28px; }
.bto-step__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
/* Below lg the form comes first, so the question is on screen without scrolling; the illustration follows. */
.bto-step__grid > .bto-step__art { order: 2; }
@media (min-width: 992px) {
  .bto-step__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bto-step__grid > .bto-step__art { order: 0; }
}
.bto-step__art {
  display: flex; flex-direction: column; gap: 12px; min-width: 0; overflow: hidden;
  padding: 24px; border-radius: 36px;
  background: var(--color-periwinkle, #e9ecf6); border: 1px solid var(--color-white, #ffffff);
}
.bto-step__summary {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px;
  padding: 16px 20px; border-radius: 24px; background: var(--color-white, #ffffff);
}
.bto-step__summary-text { display: flex; flex-direction: column; flex-grow: 1; }
.bto-step__summary-label { font-size: 13px; color: var(--text-secondary, #5f6373); }
.bto-step__summary-value { font-size: 18px; font-weight: 500; }
.bto-step__keys { padding: 8px 14px; border-radius: 999px; background: var(--color-blush, #fbd5e5); font-size: 14px; font-weight: 500; }
.plan-card--side { max-width: none; min-width: 0; margin: 0; padding: 36px; height: 100%; }
.plan-card__back-link { color: var(--text-secondary, #5f6373); text-decoration: none; padding-inline: 4px; }

/* How the estate scene fits the stepper; EstateScene.vue itself stays as designed. */
@media (min-width: 768px) {
  /* Step 1: the box keeps the scene's own 1240 × 860 shape, so no bubble is cut off at the sides. It still
     grows if the content needs more room. */
  .estate.plan-scene { min-height: auto; aspect-ratio: 1240 / 860; }
  /* Later steps are taller than the scene: keep it at the top in its own shape instead of zooming it to the
     form's height; the form continues on the periwinkle below. */
  .estate.plan-scene--tall { aspect-ratio: auto; min-height: 0; padding-bottom: 48px; }
  .estate.plan-scene--tall :deep(.estate__art) { inset: 0 0 auto 0; height: auto; aspect-ratio: 1240 / 860; }
}
/* Phones crop the scene's sides, which would cut the bubbles off: hide them, keep the scene. */
@media (max-width: 767px) {
  .plan-scene :deep(.es-bubble) { display: none; }
}
</style>