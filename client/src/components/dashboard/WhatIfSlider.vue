<script setup>
// One labelled slider with its value pill and optional hint, used by the What-if panel.
defineProps({
  // { key, id, label, hint?, link?, min, max, step, scale, value, text }
  slider: { type: Object, required: true },
});
const emit = defineEmits(['change']);
</script>

<template>
  <div class="mb-3">
    <div class="d-flex justify-content-between align-items-baseline gap-2 small">
      <label :for="slider.id" class="fw-semibold">{{ slider.label }}</label>
      <output :for="slider.id" class="whatif-value text-numeric" :data-cy="`${slider.id}-value`">{{ slider.text }}</output>
    </div>
    <input
      :id="slider.id"
      type="range"
      class="form-range"
      :min="slider.min"
      :max="slider.max"
      :step="slider.step"
      :value="slider.value"
      :aria-valuetext="slider.text"
      :data-cy="`${slider.id}-slider`"
      :aria-describedby="slider.hint ? `${slider.id}-hint` : undefined"
      @input="emit('change', slider.key, $event.target.value, slider.scale)"
    />
    <div v-if="slider.hint" :id="`${slider.id}-hint`" class="form-text mt-0" :data-cy="`${slider.id}-hint`">
      {{ slider.hint }}
      <a v-if="slider.link" :href="slider.link.href" target="_blank" rel="noopener noreferrer">{{ slider.link.text }}<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
    </div>
  </div>
</template>

<style scoped>
.whatif-value {
  background: var(--accent-fill-3);
  border-radius: var(--radius-pill);
  padding: 0 0.625rem;
  font-weight: 500;
  white-space: nowrap;
}
</style>
