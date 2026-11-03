<script setup>
// "2 answers still needed" at the top of a longer plan step (Your BTO, Resale flat), after the user tries to
// continue: every error on the step, each a link that moves focus to its field (the error summary pattern from
// government service forms). Each line is only the action ("Choose a town."): the link takes people to the field.
// PlanView focuses the summary itself, so screen readers read the whole list first. The short About you screens
// have no summary: their messages sit under each box (PlanView).
import { computed, ref } from 'vue';
import { summariseErrors } from '../utils/errorSummary.js';

const props = defineProps({
  step: { type: Number, required: true },
  errors: { type: Object, required: true },
});

const items = computed(() => summariseErrors(props.step, props.errors));
const heading = computed(() => (items.value.length === 1 ? '1 answer still needed' : `${items.value.length} answers still needed`));
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
  <div ref="root" class="error-summary" role="region" tabindex="-1" aria-labelledby="error-summary-title" data-cy="plan-step-errors">
    <h3 id="error-summary-title" class="error-summary__title">{{ heading }}</h3>
    <ul class="error-summary__list">
      <li v-for="e in items" :key="e.key" :data-cy="`plan-error-${e.key}`">
        <a v-if="e.cy" :href="`#${e.cy}`" @click.prevent="focusField(e.cy)">
          {{ e.message }}
        </a>
        <template v-else>{{ e.message }}</template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* One signal only: a light pink fill with dark text. No side stripe; no ring when PlanView moves focus here (it
   still shows for a keyboard user who tabs to it). */
.error-summary {
  padding: var(--space-3) var(--space-4);
  border-radius: 16px;
  background: #fdf0f6;
  color: var(--text-primary);
}
.error-summary:focus { outline: none; }
.error-summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.error-summary__title { margin: 0 0 var(--space-2); font-size: 1rem; font-weight: 600; }
.error-summary__list { margin: 0; padding-left: 1.1rem; }
.error-summary__list li + li { margin-top: var(--space-1); }
.error-summary__list a { color: var(--text-primary); font-weight: 500; text-decoration: underline; text-underline-offset: 3px; }
</style>
