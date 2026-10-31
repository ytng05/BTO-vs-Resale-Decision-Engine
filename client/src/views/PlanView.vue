<script setup>
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScenarioStore, STEPS } from '../stores/scenario.js';
import AppStepper from '../components/AppStepper.vue';
import SituationForm from '../components/SituationForm.vue';
import PathForm from '../components/PathForm.vue';
import WishesForm from '../components/WishesForm.vue';
import EstateScene from '../components/EstateScene.vue';
import { validateStep } from '../validation/planValidation.js';

const store = useScenarioStore();
const router = useRouter();

// The track shows the four input steps (Results is the page after them), with step 1 shortened to fit.
const TRACK = STEPS.slice(0, -1).map((s, i) => (i === 0 ? 'What matters' : s));
const HEADINGS = ['What matters most in your next home?', ...STEPS.slice(1, -1)];
const isLastInput = computed(() => store.step === STEPS.length - 2);
const nextLabel = computed(() => (isLastInput.value ? 'See results' : `Next: ${STEPS[store.step + 1].toLowerCase()}`));

// Errors are always computed, but only shown after the user tries to continue,
// so a fresh form is not covered in red before they have typed anything.
const attempted = ref(false);
const errors = computed(() => validateStep(store.step, store));
const isStepValid = computed(() => Object.keys(errors.value).length === 0);
const shownErrors = computed(() => (attempted.value ? errors.value : {}));

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
  <EstateScene
    :wishes="store.wishes"
    :move-in-by-year="store.profile.constraints?.moveInByYear"
    class="plan-scene" :class="{ 'plan-scene--tall': store.step > 0 }">
    <form class="card plan-card" data-cy="plan-form" novalidate @submit.prevent="next">
      <div
        class="plan-card__body"
        :class="{ 'plan-card__body--center': store.step === 0 }"
        :data-cy="`plan-step-${store.step + 1}-panel`"
      >
        <AppStepper :steps="TRACK" :current="store.step" />

        <div class="plan-card__head">
          <h2 class="plan-card__title" :class="{ 'plan-card__title--hero': store.step === 0 }">{{ HEADINGS[store.step] }}</h2>
          <p v-if="store.step === 0" class="plan-card__lead">Pick as many as you like. You can change these later.</p>
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
        <PathForm v-else-if="store.step === 2" key="choiceA" choice-key="choiceA" :errors="shownErrors" />
        <PathForm v-else-if="store.step === 3" key="choiceB" choice-key="choiceB" :errors="shownErrors" />

        <div
          class="plan-card__actions"
          :class="store.step === 0 ? 'justify-content-center' : 'justify-content-between'"
        >
          <!-- Step 1 is optional: skip it. Later steps go back instead. -->
          <button v-if="store.step === 0" type="button" class="btn btn-link" data-cy="plan-step-skip" @click="next">
            Skip for now
          </button>
          <button v-else type="button" class="btn btn-outline-secondary" data-cy="plan-step-back" @click="back">
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
  </EstateScene>
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