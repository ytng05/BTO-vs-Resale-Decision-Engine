<script setup>
// A floating "Back to top" button for long pages: it appears once the reader has scrolled a screen or so, and takes
// them (and keyboard focus) back to the top, where the navigation is. Hidden when printing. Respects reduced motion.
import { onBeforeUnmount, onMounted, ref } from 'vue';

const SHOW_AFTER_PX = 600;
const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > SHOW_AFTER_PX;
}
function toTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  // Put focus on the first link in the navigation, so a keyboard or screen-reader user is at the top too.
  document.querySelector('header a, nav a')?.focus({ preventScroll: true });
}

onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <Transition name="back-to-top">
    <button v-if="visible" type="button" class="back-to-top d-print-none" data-cy="back-to-top" @click="toTop">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      <span>Back to top</span>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 1030;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.625rem 1rem;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 500;
  font-size: 0.875rem;
  box-shadow: 0 4px 16px rgba(29, 29, 36, 0.22);
  cursor: pointer;
}
.back-to-top:hover { filter: brightness(1.15); }
.back-to-top:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.back-to-top-enter-active, .back-to-top-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.back-to-top-enter-from, .back-to-top-leave-to { opacity: 0; transform: translateY(0.5rem); }
@media (prefers-reduced-motion: reduce) {
  .back-to-top-enter-active, .back-to-top-leave-active { transition: none; }
}
</style>
