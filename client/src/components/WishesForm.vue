<script setup>
// Step 1 of the plan stepper, "What matters most" (D38). Optional: the picks only decide which questions
// appear later (near my parents → the parents question; moving in by a date → the move-in year; more
// space → flat type defaults a size up). They are UI only and never sent to the engine.
import { useScenarioStore, WISHES } from '../stores/scenario.js';

const store = useScenarioStore();
</script>

<template>
  <div data-cy="wishes-form">
    <p class="text-secondary mb-3">Pick any that matter to you. We'll only ask about the things you pick.</p>
    <fieldset>
      <legend class="visually-hidden">What matters most in your next home</legend>
      <div class="chip-group">
        <label v-for="w in WISHES" :key="w.key" class="chip" :data-cy="`wish-${w.key}`">
          <input
            v-model="store.wishes"
            type="checkbox"
            class="chip__input"
            :value="w.key"
            :data-cy="`wish-${w.key}-input`"
          />
          <span class="chip__face">{{ w.label }}</span>
        </label>
      </div>
    </fieldset>
    <p class="small text-secondary mt-3 mb-0">None of these is required. Choose Next to skip.</p>
  </div>
</template>
