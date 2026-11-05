<script setup>
// "Explore the detail": one card per detail section, like the home page's cards (icon, title, one line). Clicking a
// card tells the dashboard to open that detail in a pop-up; the card stays pink while its pop-up is open.
defineProps({
  items: { type: Array, required: true }, // [{ key, title, sub, icon }] (icon: a 24×24 stroke path)
  picked: { type: String, default: null },
});
const emit = defineEmits(['pick']);
</script>

<template>
  <ul class="explore">
    <li v-for="it in items" :key="it.key">
      <button
        type="button"
        class="explore__card"
        :class="{ 'is-on': picked === it.key }"
        :aria-pressed="picked === it.key"
        :data-cy="`dashboard-explore-${it.key}`"
        @click="emit('pick', it.key)"
      >
        <span class="explore__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="it.icon" /></svg></span>
        <span class="explore__title">{{ it.title }}</span>
        <span class="explore__sub">{{ it.sub }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
/* 3 per row on laptops, 2 on phones. */
.explore { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
@media (min-width: 768px) { .explore { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.explore__card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: inherit;
  text-align: left;
  transition: translate 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease, box-shadow 0.25s ease;
}
.explore__card:hover { translate: 0 -4px; border-color: var(--accent-fill-1); box-shadow: 0 12px 26px rgba(240, 138, 182, 0.2); }
.explore__card.is-on { border-color: var(--color-pink-deep); background: var(--accent-tint); }
.explore__card:focus { outline: none; }
.explore__card:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.explore__icon { width: 40px; height: 40px; margin-bottom: var(--space-2); border-radius: 12px; background: var(--accent-tint); display: grid; place-items: center; transition: background 0.2s ease; }
.explore__card.is-on .explore__icon, .explore__card:hover .explore__icon { background: var(--accent-fill-2); }
.explore__icon svg { width: 20px; height: 20px; fill: none; stroke: var(--color-berry); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.explore__title { font-weight: 600; }
.explore__card.is-on .explore__title { color: var(--color-berry); }
.explore__sub { font-size: 0.8125rem; color: var(--text-secondary); }
@media (prefers-reduced-motion: reduce) {
  .explore__card { transition: none; }
  .explore__card:hover { translate: none; }
}
</style>