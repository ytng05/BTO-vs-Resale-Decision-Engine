<script setup>
// One labelled slider with its value pill and optional hint, used by the What-if panel.
import Term from '../Term.vue';

defineProps({
  // { key, id, label, hint?, term? ({ id, lead, text }), link?, markAt? (0–1, D40), min, max, step, scale, value, text }
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
    <div class="whatif-track">
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
      <!-- D40: where the verdict flips. Decoration only: the hint says it in words. -->
      <span
        v-if="typeof slider.markAt === 'number'"
        class="whatif-track__mark"
        :style="{ '--at': slider.markAt }"
        aria-hidden="true"
        :data-cy="`${slider.id}-mark`"
      ></span>
    </div>
    <div v-if="slider.hint" :id="`${slider.id}-hint`" class="form-text mt-0" :data-cy="`${slider.id}-hint`">
      {{ slider.hint }}
      <template v-if="slider.term">{{ slider.term.lead }}<Term :id="slider.term.id">{{ slider.term.text }}</Term>.</template>
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
