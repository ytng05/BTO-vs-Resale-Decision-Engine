<script setup>
// Presentational only. The store owns the step; this just renders progress.
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
});
</script>

<template>
  <ol class="stepper" data-cy="stepper" aria-label="Progress">
    <li
      v-for="(label, i) in steps"
      :key="label"
      class="stepper__item"
      :class="{ 'stepper__item--active': i === current, 'stepper__item--done': i < current }"
      :aria-current="i === current ? 'step' : null"
      :data-cy="`stepper-step-${i + 1}`"
    >
      {{ label }}
    </li>
  </ol>
</template>
