<script setup>
// A word with a plain-English definition one tap away: <Term id="mop">minimum occupation period</Term>.
// The word is a button (dotted underline), so it works by tap, click and keyboard, not hover only; the
// definition opens just below it, with a link to the full glossary on Sources. Esc or a click elsewhere closes it.
// The pop-up is position: fixed, placed from the word's spot on screen and kept 16px inside the viewport, so a word
// near the right edge (or inside a card that clips its overflow) never pushes it off-screen.
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';
import { GLOSSARY_BY_ID } from '../constants/glossary.js';

const props = defineProps({
  id: { type: String, required: true }, // a GLOSSARY id
  // icon: the slot text stays plain and an (i) button after it opens the definition; it also opens on hover
  // with a mouse, so it reads as an info button. Used next to form labels, where an underline would be odd.
  icon: { type: Boolean, default: false },
  // The (i) button's accessible name, e.g. "What is the asking price?". Defaults to "What is <term>?".
  ask: { type: String, default: '' },
});

const entry = computed(() => GLOSSARY_BY_ID[props.id] ?? null);
const open = ref(false);
const root = ref(null);
const pop = ref(null);
const popStyle = ref({});
const popId = `term-${useId()}`;

const GUTTER = 16;
const MAX_WIDTH = 320;
function place() {
  const word = root.value?.querySelector('button');
  if (!word) return;
  const r = word.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const width = Math.min(MAX_WIDTH, vw - 2 * GUTTER);
  const left = Math.max(GUTTER, Math.min(r.left, vw - GUTTER - width));
  popStyle.value = { top: `${r.bottom + 6}px`, left: `${left}px`, width: `${width}px` };
}

function onOutside(e) {
  if (!root.value?.contains(e.target)) close();
}
function onKey(e) {
  if (e.key === 'Escape') {
    // Only take focus back if it was on the word or in the pop-up, not somewhere the user has since moved to.
    const wasInside = root.value?.contains(document.activeElement);
    close();
    if (wasInside) root.value?.querySelector('button')?.focus();
  }
}
function close() {
  open.value = false;
  document.removeEventListener('click', onOutside, true);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('scroll', place, true);
  window.removeEventListener('resize', place);
}
async function show() {
  if (open.value) return;
  place();
  open.value = true;
  document.addEventListener('click', onOutside, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place);
  await nextTick();
  place();
}
function toggle() {
  if (open.value) return close();
  return show();
}
// Hover opens it only for a mouse (a tap fires pointerenter too, and the click would then close it again).
let openedByHover = false;
// Closing waits a moment, so the mouse can cross the gap into the pop-up to reach its link (WCAG 1.4.13).
let leaveTimer = null;
function onEnter(e) {
  clearTimeout(leaveTimer);
  if (!props.icon || e.pointerType !== 'mouse' || open.value) return;
  openedByHover = true;
  show();
}
function onLeave(e) {
  if (!openedByHover || e.pointerType !== 'mouse') return;
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => { openedByHover = false; close(); }, 300);
}
function onClick() {
  if (openedByHover) {
    openedByHover = false; // a click after hovering keeps it open
    return;
  }
  toggle();
}
onBeforeUnmount(() => { clearTimeout(leaveTimer); close(); });
</script>

<template>
  <span v-if="entry" ref="root" class="term" :data-cy="`term-${id}`" @pointerenter="onEnter" @pointerleave="onLeave">
    <template v-if="icon">
      <slot />
      <button
        type="button"
        class="term__icon"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="popId"
        :aria-label="ask || `What is ${entry.term}?`"
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
    <span v-show="open" :id="popId" ref="pop" class="term__pop" :style="popStyle" role="note" :data-cy="`term-${id}-definition`">
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
  position: fixed; /* top, left and width come from place() */
  z-index: 1050;
  display: block;
  max-width: calc(100vw - 2rem);
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
