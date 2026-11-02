<script setup>
// Step 1 of the plan stepper, "What matters most" (D38). Optional: the picks only decide which questions
// appear later (near my parents → the parents question; moving in by a date → the move-in year; more
// space → flat type defaults a size up). They are UI only and never sent to the engine.
import { watch } from 'vue';
import { useScenarioStore, WISHES } from '../stores/scenario.js';

const store = useScenarioStore();
const picked = (key) => store.wishes.includes(key);

// "Near my parents" means the resale step must ask, not assume: clear the default 'NONE' so the parents question
// starts unanswered (and must be answered). Unticking it puts the default back if it was never answered.
watch(() => store.wishes.includes('parents'), (on) => {
  const b = store.choiceB;
  if (on && b.livingArrangement === 'NONE') b.livingArrangement = null;
  else if (!on && b.livingArrangement == null) b.livingArrangement = 'NONE';
});
</script>

<template>
  <div data-cy="wishes-form">
    <fieldset>
      <legend class="visually-hidden">What matters most in your next home</legend>
      <div class="chip-group chip-group--center">
        <label v-for="w in WISHES" :key="w.key" class="chip" :data-cy="`wish-${w.key}`">
          <input
            v-model="store.wishes"
            type="checkbox"
            class="chip__input"
            :value="w.key"
            :data-cy="`wish-${w.key}-input`"
          />
          <span class="chip__face">
            <!-- Lucide "check" -->
            <svg
              v-if="picked(w.key)"
              class="chip__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {{ w.label }}
          </span>
        </label>
      </div>
    </fieldset>
  </div>
</template>
