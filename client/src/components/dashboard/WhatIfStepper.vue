<script setup>
// A year in the What-if panel as − 2027 +, one year per press (a slider is fiddly for a handful of years).
// Keeps the slider's hooks for the value ({id}-value); the buttons are {id}-minus and {id}-plus.
defineProps({
  stepper: { type: Object, required: true }, // { key, id, label, hint?, min, max, value }
});
const emit = defineEmits(['change']);
</script>

<template>
  <div class="whatif-stepper" :data-cy="stepper.id">
    <span class="whatif-stepper__label">
      <span :id="`${stepper.id}-label`">{{ stepper.label }}</span>
      <small v-if="stepper.hint">{{ stepper.hint }}</small>
    </span>
    <span class="whatif-stepper__control" role="group" :aria-labelledby="`${stepper.id}-label`">
      <button
        type="button"
        :aria-label="`${stepper.label}: one year earlier`"
        :disabled="stepper.value <= stepper.min"
        :data-cy="`${stepper.id}-minus`"
        @click="emit('change', stepper.key, stepper.value - 1, 1)"
      ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg></button>
      <output class="text-numeric" aria-live="polite" :data-cy="`${stepper.id}-value`">{{ stepper.value }}</output>
      <button
        type="button"
        :aria-label="`${stepper.label}: one year later`"
        :disabled="stepper.value >= stepper.max"
        :data-cy="`${stepper.id}-plus`"
        @click="emit('change', stepper.key, stepper.value + 1, 1)"
      ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
    </span>
  </div>
</template>

<style scoped>
.whatif-stepper { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.whatif-stepper__label { display: flex; flex-direction: column; font-weight: 600; font-size: 0.9375rem; }
.whatif-stepper__label small { font-weight: 400; font-size: 0.8125rem; color: var(--text-secondary); }
.whatif-stepper__control { display: inline-flex; align-items: center; gap: var(--space-1); padding: 4px; border-radius: var(--radius-pill); background: var(--bg-page); flex: none; }
.whatif-stepper__control button {
  width: 40px; height: 40px; border: 0; border-radius: 50%; display: grid; place-items: center;
  background: var(--bg-surface); color: var(--text-primary); box-shadow: 0 1px 2px rgba(29, 29, 36, 0.08); cursor: pointer;
}
.whatif-stepper__control button:disabled { opacity: 0.4; cursor: not-allowed; }
.whatif-stepper__control button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.whatif-stepper__control output { min-width: 3.25rem; text-align: center; font-weight: 600; }
</style>
