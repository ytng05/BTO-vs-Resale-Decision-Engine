<script setup>
// A Dashboard section that opens and closes (D35: detail sits one click away, the answer stays in view).
// Built on the native <details>/<summary>, so it works with a keyboard and a screen reader with no extra JS.
// The header always shows the title and a one-line takeaway, so a closed section still says something.
// `open` is controlled by the Dashboard (so "Expand all" and the grants jump link can open sections).
// `lazy` holds back the content until the section is first opened: charts and maps need a visible box to
// size themselves, and a lazy section does not fetch or draw anything nobody asked for.
// `flat` strips the card from a component that brings its own card (the price chart, the PHG map) and hides
// its own heading, because this header is the heading.
import { ref, watch } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  takeaway: { type: String, default: '' },
  open: { type: Boolean, default: false },
  headingId: { type: String, default: '' }, // lets a link jump to this section's heading
  lazy: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  cy: { type: String, default: '' },
});
const emit = defineEmits(['update:open']);

const everOpened = ref(props.open);
watch(() => props.open, (isOpen) => { if (isOpen) everOpened.value = true; });

// The browser fires "toggle" when the user clicks the summary; tell the Dashboard.
function onToggle(event) {
  const isOpen = event.target.open;
  if (isOpen) everOpened.value = true;
  if (isOpen !== props.open) emit('update:open', isOpen);
}
</script>

<template>
  <details class="card dash-section" :class="{ 'dash-section--flat': flat }" :open="open" :data-cy="cy || undefined" @toggle="onToggle">
    <summary class="dash-section__summary">
      <span class="dash-section__text">
        <h2 :id="headingId || undefined" tabindex="-1" class="dash-section__title">{{ title }}</h2>
        <span v-if="takeaway" class="dash-section__takeaway">{{ takeaway }}</span>
      </span>
      <svg class="dash-section__chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </summary>
    <div class="dash-section__body">
      <slot v-if="!lazy || everOpened" />
    </div>
  </details>
</template>

<style scoped>
.dash-section__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 44px;
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  list-style: none;
  border-radius: var(--radius-md);
}
.dash-section__summary::-webkit-details-marker { display: none; }
.dash-section__summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.dash-section__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dash-section__title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
.dash-section__title:focus { outline: none; }
.dash-section__takeaway { font-size: 0.875rem; color: var(--text-secondary); }
.dash-section__chevron { flex: none; color: var(--text-secondary); }
.dash-section[open] > .dash-section__summary .dash-section__chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: no-preference) {
  .dash-section__chevron { transition: transform var(--duration-base) var(--ease-out); }
}
.dash-section__body { padding: 0 var(--space-5) var(--space-5); }

/* A child that brings its own card (price chart, PHG map): flatten it, and let this header be its heading. */
.dash-section--flat .dash-section__body :deep(.card) {
  box-shadow: none;
  background: transparent;
  border: 0;
  border-radius: 0;
  margin: 0 !important;
}
.dash-section--flat .dash-section__body :deep(.card-body) { padding: 0; }
.dash-section--flat .dash-section__body :deep(h2) { display: none; }
</style>
