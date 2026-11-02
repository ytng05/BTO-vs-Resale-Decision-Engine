<script setup>
// A word with a plain-English definition one tap away: <Term id="mop">minimum occupation period</Term>.
// The word is a button (dotted underline), so it works by tap, click and keyboard, not hover only; the
// definition opens just below it, with a link to the full glossary on Sources. Esc or a click elsewhere closes it.
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { GLOSSARY_BY_ID } from '../constants/glossary.js';

const props = defineProps({
  id: { type: String, required: true }, // a GLOSSARY id
  // icon: the slot text stays plain and an (i) button after it opens the definition; it also opens on hover
  // with a mouse, so it reads as an info button. Used next to form labels, where an underline would be odd.
  icon: { type: Boolean, default: false },
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
function show() {
  if (open.value) return;
  open.value = true;
  document.addEventListener('click', onOutside, true);
  document.addEventListener('keydown', onKey);
}
function toggle() {
  if (open.value) return close();
  show();
}
// Hover opens it only for a mouse (a tap fires mouseenter too, and the click would then close it again).
let openedByHover = false;
function onEnter(e) {
  if (!props.icon || e.pointerType !== 'mouse' || open.value) return;
  openedByHover = true;
  show();
}
function onLeave(e) {
  if (!openedByHover || e.pointerType !== 'mouse') return;
  openedByHover = false;
  close();
}
function onClick() {
  if (openedByHover) {
    openedByHover = false; // a click after hovering keeps it open
    return;
  }
  toggle();
}
onBeforeUnmount(close);
</script>

<template>
  <span v-if="entry" ref="root" class="term" :data-cy="`term-${id}`" @pointerenter="onEnter" @pointerleave="onLeave">
    <template v-if="icon">
      <slot>{{ entry.term }}</slot>
      <button
        type="button"
        class="term__icon"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="popId"
        :aria-label="`What is ${entry.term}?`"
        :data-cy="`term-${id}-button`"
        @click="onClick"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M10 9v5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" /><circle cx="10" cy="6.25" r="1.1" fill="currentColor" /></svg>
      </button>
    </template>
    <button
      v-else
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
.term__icon {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--text-secondary);
  vertical-align: middle;
  cursor: help;
}
.term__icon:hover, .term__icon[aria-expanded='true'] { color: var(--text-primary); background: var(--accent-fill-3); }
.term__icon:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 1px; }
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
