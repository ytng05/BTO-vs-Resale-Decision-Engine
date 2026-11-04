<script setup>
// The suggestion list under an About you number box (SituationForm.vue), styled like the browser's own autofill:
// the box's answers from saved scenarios. Up and down arrows move through it, Esc closes it. mousedown.prevent keeps
// the focus in the box while an option is clicked.
defineProps({
  options: { type: Array, required: true }, // [{ value, label }]
});
const emit = defineEmits(['pick', 'close']);

function onKeydown(event) {
  const items = Array.from(event.currentTarget.querySelectorAll('.autofill__item'));
  const index = items.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' && index < items.length - 1) {
    event.preventDefault();
    items[index + 1].focus();
  } else if (event.key === 'ArrowUp' && index > 0) {
    event.preventDefault();
    items[index - 1].focus();
  } else if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <ul class="autofill" role="listbox" aria-label="Answers from your saved scenarios" data-cy="situation-autofill" @keydown="onKeydown">
    <li v-for="option in options" :key="option.value" role="none">
      <button
        type="button"
        role="option"
        aria-selected="false"
        class="autofill__item"
        data-cy="situation-autofill-option"
        @mousedown.prevent
        @click="emit('pick', option.value)"
      >
        {{ option.label }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.autofill {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  width: 100%;
  margin: var(--space-2) 0 0;
  padding: var(--space-1);
  list-style: none;
  color: var(--on-primary);
  background: var(--primary);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  max-height: 10rem;
  overflow-y: auto;
}
.autofill__item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
  color: inherit;
  background: none;
  border: 0;
  border-radius: calc(var(--radius-sm) - var(--space-1)); /* fits inside the list's corners */
  cursor: pointer;
}
.autofill__item:hover,
.autofill__item:focus-visible {
  background: var(--primary-hover);
  outline: none;
}
</style>
