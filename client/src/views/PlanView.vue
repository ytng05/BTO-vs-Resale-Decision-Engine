<script setup>
import { useRouter } from 'vue-router';
import { useScenarioStore, STEPS } from '../stores/scenario.js';
import AppStepper from '../components/AppStepper.vue';

const store = useScenarioStore();
const router = useRouter();

function next() {
  if (store.step === STEPS.length - 2) {
    // Last input step done: go to results.
    router.push('/results');
    return;
  }
  store.next();
}
</script>

<template>
  <section>
    <AppStepper :steps="STEPS" :current="store.step" />

    <!-- TODO (seat 4): real forms + validation for each step, bound to the Pinia store. -->
    <div class="card mt-3">
      <div class="card-body" :data-cy="`plan-step-${store.step + 1}-panel`">
        <h2 class="h5">{{ STEPS[store.step] }}</h2>
        <p class="text-secondary mb-0">Placeholder. Build this step's form here.</p>
      </div>
    </div>

    <div class="d-flex justify-content-between mt-3">
      <button class="btn btn-outline-secondary" :disabled="store.step === 0" data-cy="plan-step-back" @click="store.back()">
        Back
      </button>
      <button class="btn btn-primary" data-cy="plan-step-next" @click="next">Next</button>
    </div>
  </section>
</template>
