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
import AboutYouScene from '../components/AboutYouScene.vue';
import ResaleScene from '../components/ResaleScene.vue';
import { useAuthStore } from '../stores/auth.js';
import { validateStep } from '../validation/planValidation.js';
import { FLAT_TYPES, LEASE_BANDS, toTitleCase } from '../constants/planOptions.js';

const store = useScenarioStore();
const auth = useAuthStore();
const router = useRouter();

// The track shows the four input steps (Results is the page after them), with step 1 shortened to fit.
const TRACK = STEPS.slice(0, -1).map((s, i) => (i === 0 ? 'What matters' : s));
const HEADINGS = ['What matters most in your next home?', STEPS[1], 'Which BTO are you eyeing?', STEPS[3]];
const isLastInput = computed(() => store.step === STEPS.length - 2);
const nextLabel = computed(() => (isLastInput.value ? 'See results' : 'Next'));

// Errors are always computed, but only shown after the user tries to continue,
// so a fresh form is not covered in red before they have typed anything.
const attempted = ref(false);
const errors = computed(() => validateStep(store.step, store));
const isStepValid = computed(() => Object.keys(errors.value).length === 0);
const shownErrors = computed(() => (attempted.value ? errors.value : {}));

// Steps 2 to 4 share the Calm "Plan your BTO" layout: two columns straight under the nav, the step's illustration on the
// left (with a summary of the choice on "Your BTO") and the form card on the right. Step 1 sits on the estate scene.
const isSideStep = computed(() => store.step > 0);
const isBtoStep = computed(() => store.step === 2);
// "About you" stacks instead: the scene as a banner on top, then the form across the full width, buyers side by side.
const isStackedStep = computed(() => store.step === 1);
const ABOUT_YOU_LEAD = 'Two buyers buying together, at least one a Singapore Citizen. Have your CPF statement handy, or estimate. You can change these later.';
// The resale scene's lease bubble: '80 to 89 years' becomes '80 to 89', as the scene adds "years left".
const leaseLabel = computed(() => LEASE_BANDS.find((b) => b.value === store.choiceB.leaseBand)?.label.replace(/ years$/, '') ?? null);
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
    :is="isSideStep ? 'div' : EstateScene"
    v-bind="isSideStep ? {} : { wishes: store.wishes, moveInByYear: store.profile.constraints?.moveInByYear }"
    :class="isSideStep ? 'side-step' : 'plan-scene'"
  >
    <div :class="{ 'side-step__grid': isSideStep, 'side-step__grid--stacked': isStackedStep }">
      <section v-if="isSideStep" class="side-step__art" data-cy="plan-step-art">
        <!-- About you: the step's title and intro sit on the banner's left (the card repeats them on phones). -->
        <div v-if="isStackedStep" class="side-step__banner-text">
          <h2 class="plan-card__title plan-card__title--hero">{{ HEADINGS[store.step] }}</h2>
          <p class="plan-card__lead">{{ ABOUT_YOU_LEAD }}</p>
        </div>
        <AboutYouScene
          v-if="store.step === 1"
          :buyers="store.profile.applicants.length"
          :move-by="store.profile.constraints?.moveInByYear"
          wide
        />
        <BtoScene v-else-if="isBtoStep" :wishes="store.wishes" :keys-year="keysYear" />
        <ResaleScene v-else :lease="leaseLabel" />
        <div v-if="isBtoStep" class="bto-step__summary" data-cy="bto-step-summary" aria-live="polite">
          <span class="bto-step__summary-text">
            <span class="bto-step__summary-label">Building your BTO plan</span>
            <span class="bto-step__summary-value">{{ btoSummary ?? 'Choose a town to start' }}</span>
          </span>
          <span v-if="keysIn" class="bto-step__keys" data-cy="bto-step-keys">{{ keysIn }}</span>
        </div>
      </section>

      <form class="card plan-card" :class="{ 'plan-card--side': isSideStep, 'plan-card--stacked': isStackedStep }" data-cy="plan-form" novalidate @submit.prevent="next">
        <div
          class="plan-card__body"
          :class="{ 'plan-card__body--center': store.step === 0 }"
          :data-cy="`plan-step-${store.step + 1}-panel`"
        >
          <!-- Every step: the track at the top of the form card, a thin divider under it. -->
          <div class="plan-card__track">
            <AppStepper :steps="TRACK" :current="store.step" />
            <hr class="plan-card__divider" />
          </div>

          <div class="plan-card__head" :class="{ 'plan-card__head--banner': isStackedStep }">
            <p v-if="isBtoStep && firstName" class="plan-card__lead">Welcome back, {{ firstName }}</p>
            <h2 class="plan-card__title plan-card__title--hero">{{ HEADINGS[store.step] }}</h2>
            <p v-if="isStackedStep" class="plan-card__lead">{{ ABOUT_YOU_LEAD }}</p>
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
              :class="isSideStep ? 'btn-link plan-card__back-link' : 'btn-outline-secondary'"
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
.plan-card__track { align-self: stretch; }
.plan-card__divider { margin: 16px 0 0; border: 0; border-top: 1px solid var(--border, #dfe2ea); opacity: 1; }
.plan-card__head { display: flex; flex-direction: column; gap: 8px; }
.plan-card__title { margin: 0; }
.plan-card__title--hero { font-size: clamp(26px, 2.8vw, 36px); font-weight: 500; letter-spacing: -0.025em; line-height: 1.15; }
.plan-card__lead { margin: 0; font-size: 15px; color: var(--text-secondary, #5f6373); }
.plan-card__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }

/* Steps 2 to 4 (Calm "Plan your BTO" board): the illustration panel and the form card side by side (the track is
   inside the card), stacking below 992px. */
.side-step { display: flex; flex-direction: column; gap: 28px; }
.side-step__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
/* Below lg the form comes first, so the question is on screen without scrolling; the illustration follows. */
.side-step__grid > .side-step__art { order: 2; }
@media (min-width: 992px) {
  .side-step__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .side-step__grid > .side-step__art { order: 0; }
}
/* "About you": one column at every width, the wide scene first as a banner across the panel, above the form. */
@media (min-width: 992px) {
  .side-step__grid--stacked { grid-template-columns: minmax(0, 1fr); }
}
/* The banner is short so the whole form fits under it on a laptop screen: the scene runs edge to edge (no padding)
   and the title and intro sit over its left side, on a fade so the skyline behind stays quiet. */
.side-step__grid--stacked > .side-step__art { order: 0; position: relative; padding: 0; gap: 0; }
.side-step__grid--stacked > .side-step__art > svg { border-radius: 0; }
.side-step__banner-text {
  position: absolute; inset: 0 auto 0 0; z-index: 1; width: min(46%, 520px);
  display: flex; flex-direction: column; justify-content: center; gap: 8px; padding: 24px 40px;
  background: linear-gradient(90deg, var(--color-periwinkle, #e9ecf6) 55%, transparent);
}
.plan-card--side.plan-card--stacked { padding-block: 24px 28px; }
.plan-card--stacked .plan-card__body { gap: 16px; }
/* About you fits a laptop screen with room to spare, so its text runs a step larger than the site's defaults. */
.side-step__banner-text .plan-card__lead { font-size: 17px; }
.plan-card--stacked :deep(.form-label) { font-size: 15px; }
.plan-card--stacked :deep(.form-text),
.plan-card--stacked :deep(.alert) { font-size: 15px; }
.plan-card--stacked :deep(.form-check-label) { font-size: 16px; }
.plan-card--stacked :deep(.buyer__name) { font-size: 18px; }
@media (min-width: 768px) {
  .plan-card__head--banner { display: none; }
}
/* Phones: no room beside the scene, so the title stays in the card and the scene crops to its middle. */
@media (max-width: 767px) {
  .side-step__banner-text { display: none; }
  .side-step__grid--stacked > .side-step__art > svg { height: 200px; }
}
.side-step__art {
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

/* How the estate scene fits step 1; EstateScene.vue itself stays as designed. The box keeps the scene's own
   1240 × 860 shape, so no bubble is cut off at the sides. It still grows if the content needs more room. */
@media (min-width: 768px) {
  .estate.plan-scene { min-height: auto; aspect-ratio: 1240 / 860; }
}
/* Below 1280px the card covers some of the bubbles, or the scene's edges cut them off (measured at 768–1279px):
   hide them, keep the scene and its animation. */
@media (max-width: 1279.98px) {
  .plan-scene :deep(.es-bubble) { display: none; }
}
/* Step 3 on phones: the scene shrinks so far that its bubble text would render at 6–9px. The keys year is also
   in the summary card beside it. */
@media (max-width: 575.98px) {
  .side-step__art :deep(.bs-bubble) { display: none; }
}
</style>