<script setup>
// "Could resale get closer?": shown when the parents question wasn't asked (D38), so the Proximity Housing Grant was
// left out. "Add it to my plan" goes back to the resale step's parents question. Each path card has its own grants.
const emit = defineEmits(['add-parents']);
</script>

<template>
  <section class="phg" aria-labelledby="phg-title" data-cy="results-phg-note">
    <div class="phg__text">
      <h2 id="phg-title" class="phg__title">Could resale get closer?</h2>
      <p class="mb-0">
        If you'd live with or within 4 km of your parents, the Proximity Housing Grant could add up to <strong>S$30,000</strong>
        to the resale path. We haven't counted it yet.
      </p>
    </div>
    <button type="button" class="btn phg__add d-print-none" data-cy="results-phg-add" @click="emit('add-parents')">Add it to my plan</button>
  </section>
</template>

<style scoped>
.phg { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-4); padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-md); background: var(--accent-fill-2); }
.phg__text { flex: 1 1 420px; }
.phg__title { margin: 0 0 var(--space-2); font-size: 1.375rem; font-weight: 600; }
.phg__add { border-radius: var(--radius-pill); background: var(--bg-surface); font-weight: 600; padding: 0.625rem 1.25rem; }
.phg__add:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
</style>
