<script setup>
// Plan, Resale flat step: a "Check on a map" button beside "Your parents". It opens the Dashboard's Near parents
// map (PhgMapCard) in a pop-up, so the 4 km rule can be checked while answering, not only on the Dashboard.
// The map is display-only (D15): it never changes the answer picked here.
// The pop-up is a dialog: focus moves to its close button; Esc, the close button or a click on the dark backdrop
// closes it, and focus goes back to the button. The page behind can't be reached or scrolled while it is open.
// It is created on the first open and then only hidden, so postal codes typed in it stay until the page is left.
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import PhgMapCard from './dashboard/PhgMapCard.vue';

const props = defineProps({
  prefix: { type: String, required: true }, // 'pathb': for the data-cy names
  btoTown: { type: String, default: null },
  resaleTown: { type: String, default: null },
  livingArrangement: { type: String, default: 'NONE' },
});

const isOpen = ref(false);
const everOpened = ref(false);
const openBtn = ref(null);
const closeBtn = ref(null);
const mapCard = ref(null);

// The same line as the Dashboard's pop-up, following the answer picked on this step.
const subLine = computed(function () {
  if (props.livingArrangement === 'NEAR') {
    return "You said you'll live near your parents: check the 4 km rule.";
  }
  return "Only needed if you'll live near your parents.";
});

// The pop-up is moved to <body> (Teleport), outside #app, so making #app inert keeps Tab inside the pop-up.
function setPageBlocked(on) {
  const app = document.getElementById('app');
  if (app) {
    app.toggleAttribute('inert', on);
  }
  document.body.classList.toggle('parents-map-open', on);
}

function onKey(e) {
  if (e.key === 'Escape') {
    close();
  }
}

async function open() {
  const reopening = everOpened.value;
  everOpened.value = true;
  isOpen.value = true;
  setPageBlocked(true);
  document.addEventListener('keydown', onKey);
  await nextTick();
  if (closeBtn.value) {
    closeBtn.value.focus();
  }
  // Opened again: the towns may have been picked or changed on the step since, so place them (and measure) again.
  if (reopening && mapCard.value) {
    mapCard.value.loadTowns();
  }
}

function close() {
  if (!isOpen.value) {
    return;
  }
  isOpen.value = false;
  setPageBlocked(false);
  document.removeEventListener('keydown', onKey);
  if (openBtn.value) {
    openBtn.value.focus();
  }
}

// Leaving the step with the pop-up open (e.g. the browser's Back button): unblock the page.
onBeforeUnmount(function () {
  if (isOpen.value) {
    setPageBlocked(false);
    document.removeEventListener('keydown', onKey);
  }
});
</script>

<template>
  <button
    ref="openBtn"
    type="button"
    class="btn btn-outline-secondary btn-sm pmap-open"
    aria-haspopup="dialog"
    aria-label="Check on a map"
    :data-cy="`${prefix}-living-map-button`"
    @click="open"
  >
    <!-- Lucide "map-pin" -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
    <!-- Phones: just "Map", so the button stays on the same line as "Your parents" -->
    <span class="d-none d-sm-inline">Check on a map</span>
    <span class="d-sm-none">Map</span>
  </button>

  <Teleport to="body">
    <div v-if="everOpened" v-show="isOpen" class="pmap" :data-cy="`${prefix}-living-map`" @click.self="close">
      <div class="pmap__box" role="dialog" aria-modal="true" aria-labelledby="pmap-title" :data-cy="`${prefix}-living-map-dialog`">
        <header class="pmap__head">
          <span class="pmap__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" /></svg>
          </span>
          <div class="pmap__titles">
            <h2 id="pmap-title" class="pmap__title">Near parents</h2>
            <p class="pmap__sub mb-0">{{ subLine }}</p>
          </div>
          <button ref="closeBtn" type="button" class="pmap__close" aria-label="Close" :data-cy="`${prefix}-living-map-close`" @click="close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div class="pmap__body">
          <PhgMapCard ref="mapCard" :bto-town="btoTown" :resale-town="resaleTown" :living-arrangement="livingArrangement" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* The button, on the right of the "Your parents" row (margin-left: auto keeps it on the right if it ever wraps). */
.pmap-open { margin-left: auto; display: inline-flex; align-items: center; gap: var(--space-2); font-size: 14px; font-weight: 500; white-space: nowrap; }

/* The pop-up: the same look as the Dashboard's detail pop-ups (DashboardView.vue .dash-modal). One column as wide as
   the screen less the padding; on phones it sits at the bottom. */
.pmap {
  position: fixed; inset: 0; z-index: 1050;
  display: grid; grid-template-columns: minmax(0, 1fr); place-items: center;
  padding: var(--space-4);
  background: rgba(29, 29, 36, 0.45);
  animation: pmap-fade 0.2s ease both;
}
.pmap__box {
  display: flex; flex-direction: column;
  width: min(880px, 100%); min-width: 0; max-height: min(86vh, 900px);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: 0 30px 80px rgba(29, 29, 36, 0.3);
  animation: pmap-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.pmap__head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-5) var(--space-5) var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.pmap__icon { flex: none; width: 44px; height: 44px; border-radius: 14px; background: var(--accent-tint); display: grid; place-items: center; }
.pmap__icon svg { width: 22px; height: 22px; fill: none; stroke: var(--color-berry); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.pmap__titles { flex: 1; min-width: 0; }
.pmap__title { margin: 0; font-family: var(--font-heading); font-size: 1.375rem; font-weight: 600; }
.pmap__sub { color: var(--text-secondary); font-size: 0.9375rem; }
.pmap__close { flex: none; width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--bg-page); display: grid; place-items: center; transition: background 0.2s ease; }
.pmap__close:hover { background: var(--accent-fill-2); }
.pmap__close:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.pmap__close svg { width: 18px; height: 18px; fill: none; stroke: var(--text-primary); stroke-width: 2.2; stroke-linecap: round; }
.pmap__body { overflow-y: auto; padding: var(--space-5); }
@keyframes pmap-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pmap-pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
@media (max-width: 575.98px) {
  .pmap { padding: var(--space-2); align-items: end; }
  .pmap__box { max-height: 92vh; }
  .pmap__head, .pmap__body { padding: var(--space-4); }
}
@media (prefers-reduced-motion: reduce) { .pmap, .pmap__box { animation: none; } }
</style>

<style>
/* While the map pop-up is open, the page behind it doesn't scroll. */
body.parents-map-open { overflow: hidden; }
</style>
