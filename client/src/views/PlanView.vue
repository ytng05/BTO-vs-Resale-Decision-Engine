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
  if (store.step === STEPS.length - 2) {
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
    <AppStepper :steps="STEPS" :current="store.step" />

    <form class="card mt-3" data-cy="plan-form" novalidate @submit.prevent="next">
      <div class="card-body" :data-cy="`plan-step-${store.step + 1}-panel`">
        <h2 class="h5">{{ STEPS[store.step] }}</h2>

        <div
          v-if="attempted && !isStepValid"
          class="alert alert-danger py-2"
          role="alert"
          data-cy="plan-step-errors"
        >
          Some details need fixing before you continue.
        </div>

        <WishesForm v-if="store.step === 0" />
        <SituationForm v-else-if="store.step === 1" :errors="shownErrors" />
        <PathForm v-else-if="store.step === 2" key="choiceA" choice-key="choiceA" :errors="shownErrors" />
        <PathForm v-else-if="store.step === 3" key="choiceB" choice-key="choiceB" :errors="shownErrors" />
      </div>
    </form>

    <div class="d-flex justify-content-between mt-3">
      <button
        type="button"
        class="btn btn-outline-secondary"
        :disabled="store.step === 0"
        data-cy="plan-step-back"
        @click="back"
      >
        Back
      </button>
      <button type="button" class="btn btn-primary" data-cy="plan-step-next" @click="next">
        {{ store.step === STEPS.length - 2 ? 'See results' : 'Next' }}
      </button>
    </div>
  </EstateScene>
</template>

<style scoped>
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