<script setup>
// Presentational only. The store owns the step; this just renders progress.
// Desktop (>= md): the four-box stepper. Mobile (< md): "Step X of N · <label>" + a progress bar.
// Both are rendered; visibility is handled by _components.scss (.stepper / .stepper-mobile).
import { computed } from 'vue';

const props = defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
});

const stepNumber = computed(() => props.current + 1);
const progressPercent = computed(() =>
  props.steps.length > 1 ? Math.round((props.current / (props.steps.length - 1)) * 100) : 0,
);
</script>

<template>
  <!-- Desktop / tablet: box stepper -->
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

  <!-- Mobile: compact label + progress bar -->
  <div class="stepper-mobile" role="status" aria-live="polite">
    <p class="stepper-mobile__label" data-cy="stepper-mobile-label">
      Step {{ stepNumber }} of {{ steps.length }} · {{ steps[current] }}
    </p>
    <div
      class="stepper-mobile__track"
      role="progressbar"
      :aria-valuenow="stepNumber"
      :aria-valuemin="1"
      :aria-valuemax="steps.length"
      data-cy="stepper-mobile-track"
    >
      <div class="stepper-mobile__fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </div>
</template>
