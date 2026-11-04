<script setup>
// A Dashboard section that opens and closes (D35: detail sits one click away, the answer stays in view).
// Built on the native <details>/<summary>, so it works with a keyboard and a screen reader with no extra JS.
// The header always shows the title and a one-line takeaway, so a closed section still says something.
// `open` is controlled by the Dashboard (so "Expand all" and the grants jump link can open sections).
// `lazy` holds back the content until the section is first opened: charts and maps need a visible box to
// size themselves, and a lazy section does not fetch or draw anything nobody asked for.
// `flat` strips the card from a component that brings its own card (the price chart, the PHG map) and hides
// its own heading, because this header is the heading.
// Feedback (5 Nov 2026): the whole header turns pink on hover (the app's "you can open this" colour, as on the nav
// links), the chevron sits in a round button that fills in, and an open section keeps a pink edge while its content
// fades in, so it is clear what is open and what was just clicked.
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
      <span class="dash-section__chev-wrap" aria-hidden="true">
        <svg class="dash-section__chevron" viewBox="0 0 20 20" width="20" height="20" focusable="false">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
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
.dash-section__chevron { flex: none; }
.dash-section[open] > .dash-section__summary .dash-section__chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: no-preference) {
  .dash-section__chevron { transition: transform var(--duration-base) var(--ease-out); }
}
.dash-section__body { padding: 0 var(--space-5) var(--space-5); }

/* Hover and open states. */
.dash-section { transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; }
.dash-section:hover { border-color: var(--accent-fill-1); box-shadow: 0 10px 28px rgba(240, 138, 182, 0.14); }
.dash-section__summary { transition: background-color 0.2s ease; }
.dash-section__summary:hover { background: var(--accent-tint); }
.dash-section__summary:hover .dash-section__title { color: var(--color-berry); }
.dash-section__title { transition: color 0.2s ease; }
.dash-section__chev-wrap { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--bg-page); color: var(--text-secondary); transition: background-color 0.2s ease, color 0.2s ease; }
.dash-section__summary:hover .dash-section__chev-wrap { background: var(--accent-fill-2); color: var(--color-berry); }
.dash-section[open] { border-color: var(--accent-fill-1); box-shadow: inset 4px 0 0 var(--accent-fill-1), var(--shadow-sm); }
.dash-section[open] > .dash-section__summary .dash-section__chev-wrap { background: var(--color-berry); color: var(--on-primary); }
.dash-section[open] > .dash-section__body { animation: dash-section-open 0.3s var(--ease-out) both; }
@keyframes dash-section-open { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .dash-section, .dash-section__summary, .dash-section__title, .dash-section__chev-wrap { transition: none; }
  .dash-section[open] > .dash-section__body { animation: none; }
}

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
