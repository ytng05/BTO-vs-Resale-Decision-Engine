<script setup>
// "Why we ask": a small button under a question that shows or hides a short explanation (a disclosure, not a
// tooltip). Click (or Enter / Space) opens it, again closes it, Esc closes it too. It opens in the page flow, under
// the button, so it pushes what follows down instead of covering it (e.g. Next). Same on every About you screen.
import { ref } from 'vue';

defineProps({
  text: { type: String, required: true },
  id: { type: String, default: 'why-we-ask' },
});
const open = ref(false);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}
</script>

<template>
  <div class="why">
    <button
      type="button"
      class="why__link"
      :aria-expanded="String(open)"
      :aria-controls="id"
      data-cy="about-why"
      @click="toggle"
      @keydown.esc="close"
    >
      Why we ask
    </button>
    <p v-show="open" :id="id" class="why__tip" data-cy="about-why-tip">{{ text }}</p>
  </div>
</template>

<style scoped>
/* As wide as the question's column, so the explanation is capped at that width and never runs past the card. */
.why { display: block; align-self: stretch; }
.why__link {
  padding: 0; border: 0; background: none; font-size: 14px; font-weight: 600;
  color: var(--text-primary); text-decoration: underline; text-underline-offset: 3px;
}
.why__link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; border-radius: 4px; }
.why__tip {
  width: max-content; max-width: min(320px, 100%); margin: 8px 0 0;
  padding: 10px 12px; border-radius: 12px; background: var(--text-primary); color: var(--bg-surface);
  font-size: 14px; line-height: 1.4;
}
</style>
