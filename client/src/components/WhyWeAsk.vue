<script setup>
// "Why we ask": a small link under a question whose tooltip opens on hover and on keyboard focus (not only a title
// attribute), and closes on Esc until the link is left (WCAG 1.4.13). Same on every About you screen.
import { ref } from 'vue';

defineProps({
  text: { type: String, required: true },
  id: { type: String, default: 'why-we-ask' },
});
const closed = ref(false);
</script>

<template>
  <span class="why">
    <button
      type="button"
      class="why__link"
      :aria-describedby="id"
      data-cy="about-why"
      @keydown.esc="closed = true"
      @blur="closed = false"
    >
      Why we ask
    </button>
    <span :id="id" role="tooltip" class="why__tip" :class="{ 'why__tip--closed': closed }" data-cy="about-why-tip">{{ text }}</span>
  </span>
</template>

<style scoped>
.why { position: relative; align-self: flex-start; }
.why__link {
  padding: 0; border: 0; background: none; font-size: 14px; font-weight: 600;
  color: var(--text-primary, #1d1d24); text-decoration: underline; text-underline-offset: 3px;
}
.why__link:focus-visible { outline: 2px solid #1d1d24; outline-offset: 3px; border-radius: 4px; }
.why__tip {
  position: absolute; left: 0; top: calc(100% + 8px); z-index: 5; width: max-content; max-width: min(320px, 80vw);
  padding: 10px 12px; border-radius: 12px; background: #1d1d24; color: #ffffff; font-size: 14px; line-height: 1.4;
  visibility: hidden; opacity: 0; transition: opacity 0.15s;
}
.why:hover .why__tip, .why__link:focus + .why__tip { visibility: visible; opacity: 1; }
/* As specific as the :hover / :focus rules above, and later, so Esc wins over both. */
.why .why__tip.why__tip--closed { visibility: hidden; opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .why__tip { transition: none; }
}
</style>
