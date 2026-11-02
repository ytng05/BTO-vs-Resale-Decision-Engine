<script setup>
// "There are 2 problems" at the top of a plan step, after the user tries to continue: every error on the
// step, each a link that moves focus to its field (the error summary pattern from government service forms).
// PlanView focuses the summary itself, so screen readers read the whole list first.
import { computed, ref } from 'vue';
import { summariseErrors } from '../utils/errorSummary.js';

const props = defineProps({
  step: { type: Number, required: true },
  errors: { type: Object, required: true },
});

const items = computed(() => summariseErrors(props.step, props.errors));
const heading = computed(() => (items.value.length === 1 ? 'There is 1 problem to fix' : `There are ${items.value.length} problems to fix`));
const root = ref(null);

// The field itself, or the first control inside a group (chips, the buyer box).
function focusField(cy) {
  const el = document.querySelector(`[data-cy="${cy}"]`);
  if (!el) return;
  const target = el.matches('input, select, textarea, button') ? el : el.querySelector('input:not([type=hidden]), select, textarea, button');
  (target ?? el).scrollIntoView({ block: 'center' });
  (target ?? el).focus({ preventScroll: true });
}

defineExpose({ focus: () => root.value?.focus() });
</script>

<template>
  <div ref="root" class="error-summary" role="alert" tabindex="-1" aria-labelledby="error-summary-title" data-cy="plan-step-errors">
    <h3 id="error-summary-title" class="error-summary__title">{{ heading }}</h3>
    <ul class="error-summary__list">
      <li v-for="e in items" :key="e.key" :data-cy="`plan-error-${e.key}`">
        <a v-if="e.cy" :href="`#${e.cy}`" @click.prevent="focusField(e.cy)">
          <template v-if="e.label">{{ e.label }}: </template>{{ e.message }}
        </a>
        <template v-else>{{ e.message }}</template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.error-summary {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--danger);
  border-left-width: 4px;
  border-radius: var(--radius-sm);
  background: var(--danger-fill);
  color: var(--text-primary);
}
.error-summary:focus { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.error-summary__title { margin: 0 0 var(--space-2); font-size: 1rem; font-weight: 600; }
.error-summary__list { margin: 0; padding-left: 1.1rem; }
.error-summary__list li + li { margin-top: var(--space-1); }
.error-summary__list a { color: var(--danger); font-weight: 500; }
</style>
