<script setup>
// A word with a plain-English definition one tap away: <Term id="mop">minimum occupation period</Term>.
// The word is a button (dotted underline), so it works by tap, click and keyboard, not hover only; the
// definition opens just below it, with a link to the full glossary on Sources. Esc or a click elsewhere closes it.
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { GLOSSARY_BY_ID } from '../constants/glossary.js';

const props = defineProps({
  id: { type: String, required: true }, // a GLOSSARY id
});

const entry = computed(() => GLOSSARY_BY_ID[props.id] ?? null);
const open = ref(false);
const root = ref(null);
const popId = `term-${useId()}`;

function onOutside(e) {
  if (!root.value?.contains(e.target)) close();
}
function onKey(e) {
  if (e.key === 'Escape') {
    close();
    root.value?.querySelector('button')?.focus();
  }
}
function close() {
  open.value = false;
  document.removeEventListener('click', onOutside, true);
  document.removeEventListener('keydown', onKey);
}
function toggle() {
  if (open.value) return close();
  open.value = true;
  document.addEventListener('click', onOutside, true);
  document.addEventListener('keydown', onKey);
}
onBeforeUnmount(close);
</script>

<template>
  <span v-if="entry" ref="root" class="term" :data-cy="`term-${id}`">
    <button
      type="button"
      class="term__word"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="popId"
      :data-cy="`term-${id}-button`"
      @click="toggle"
    ><slot>{{ entry.term }}</slot></button>
    <span v-show="open" :id="popId" class="term__pop" role="note" :data-cy="`term-${id}-definition`">
      <strong class="term__title">{{ entry.term }}</strong>
      {{ entry.definition }}
      <router-link :to="`/sources#glossary-${id}`" class="term__more" @click="close">More in the glossary</router-link>
    </span>
  </span>
  <slot v-else />
</template>

<style scoped>
.term { position: relative; display: inline; }
.term__word {
  display: inline;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  text-decoration: underline dotted;
  text-decoration-color: var(--text-secondary);
  text-underline-offset: 3px;
  cursor: help;
}
.term__word:hover { text-decoration-color: var(--text-primary); }
.term__word:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 4px; }
.term__pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  display: block;
  width: min(20rem, 80vw);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
}
.term__title { display: block; margin-bottom: var(--space-1); font-weight: 600; }
.term__more { display: inline-block; margin-top: var(--space-2); font-weight: 500; }
</style>
