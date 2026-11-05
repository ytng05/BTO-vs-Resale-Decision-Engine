<script setup>
// The store owns the step; this renders progress, and each step up to `reachable` (other than the current one) is a
// button that emits `go` with its index, so people can move between phases (PlanView decides whether to allow it).
// Calm "Easier onboarding" board: one segment per step, its label underneath (labels drop below md, leaving the bar
// and a "Step X of N" line for screen readers and phones). `weights` widens steps that ask more questions; `fill`
// is how far through the current step's questions the user is (0 to 1).
import { computed } from 'vue';

const props = defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
  weights: { type: Array, default: () => [] },
  fill: { type: Number, default: 1 },
  reachable: { type: Number, default: -1 },
});
const emit = defineEmits(['go']);
const canGo = (i) => i !== props.current && i <= props.reachable;

const widthOf = (i) => (i < props.current ? 100 : i === props.current ? Math.round(props.fill * 100) : 0);

const stepNumber = computed(() => props.current + 1);
</script>

<template>
  <ol class="seg-track" data-cy="stepper" aria-label="Progress">
    <li
      v-for="(label, i) in steps"
      :key="label"
      class="seg-track__item"
      :class="{ 'seg-track__item--current': i === current, 'seg-track__item--done': i < current }"
      :aria-current="i === current ? 'step' : null"
      :data-cy="`stepper-step-${i + 1}`"
      :style="{ flexGrow: weights[i] ?? 1 }"
    >
      <span class="seg-track__bar" aria-hidden="true"><span :style="{ width: `${widthOf(i)}%` }"></span></span>
      <button v-if="canGo(i)" type="button" class="seg-track__label seg-track__link" :data-cy="`stepper-go-${i + 1}`" @click="emit('go', i)">
        {{ label }}<span class="visually-hidden">{{ i < current ? ', done' : '' }}: go to this step</span>
      </button>
      <span v-else class="seg-track__label" :data-cy="`stepper-label-${i + 1}`">{{ label }}<span v-if="i < current" class="visually-hidden">, done</span></span>
    </li>
  </ol>
  <p class="seg-track__mobile" role="status" aria-live="polite" data-cy="stepper-mobile-label">
    Step {{ stepNumber }} of {{ steps.length }} · {{ steps[current] }}
  </p>
</template>

<style scoped>
.seg-track { display: flex; gap: 8px; flex: 1; min-width: 0; margin: 0; padding: 0; list-style: none; }
.seg-track__item { display: flex; flex-direction: column; gap: 8px; flex: 1 1 0; min-width: 0; }
.seg-track__bar { display: block; height: 6px; border-radius: 3px; background: var(--accent-fill-3); overflow: hidden; }
.seg-track__bar > span { display: block; height: 100%; border-radius: 3px; background: var(--text-primary); transition: width 0.4s ease-out; }
/* A label too long for its segment wraps onto a second line instead of being cut to "What mat…": at 992–1144px the
   plan card sits beside its picture and the segments are about 55–70px wide. */
.seg-track__label {
  font-size: 13px; font-weight: 500; line-height: 1.3; color: var(--text-secondary);
  overflow-wrap: break-word;
}
.seg-track__item--current .seg-track__label { color: var(--text-primary); font-weight: 600; }
.seg-track__link {
  align-self: flex-start; max-width: 100%; padding: 0; border: 0; background: none; text-align: left; cursor: pointer;
  text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 3px;
}
.seg-track__link:hover { color: var(--text-primary); text-decoration-color: currentColor; }
.seg-track__link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; border-radius: 4px; }
.seg-track__mobile { display: none; margin: 0; font-size: 14px; font-weight: 500; color: var(--text-secondary); }
@media (max-width: 767.98px) {
  .seg-track__label { display: none; }
  .seg-track__mobile { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .seg-track__bar > span { transition: none; }
}
</style>
