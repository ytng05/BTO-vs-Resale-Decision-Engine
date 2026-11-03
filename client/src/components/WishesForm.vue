<script setup>
// Step 1 of the plan stepper, "What matters most" (D38). Optional: the picks only decide which questions
// appear later (near my parents → the parents question; moving in by a date → the move-in year; more
// space → flat type defaults a size up). They are UI only and never sent to the engine.
import { watch } from 'vue';
import { useScenarioStore, WISHES } from '../stores/scenario.js';

const store = useScenarioStore();

// Each pick's small drawing (Calm "Easier onboarding" board), drawn on a 48 × 48 box.
const ART = {
  parents: '<path d="M5 27 15 18l10 9v14H5z" stroke-width="1.5" stroke-linejoin="round" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><path d="M3 28 15 17l12 11" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-pink-deep)"/><rect x="12" y="32" width="6" height="9" rx="1.5" style="fill: var(--accent-fill-1)"/><path d="M29 31l8-7 8 7v10H29z" stroke-width="1.5" stroke-linejoin="round" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><path d="M27 32l10-9 10 9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-pink-deep)"/><rect x="35" y="35" width="5" height="6" rx="1.5" style="fill: var(--accent-fill-1)"/><path d="M26 9.5c-1.5-2.4-5.2-1.5-5.2 1.2 0 2.3 3 4.1 5.2 5.7 2.2-1.6 5.2-3.4 5.2-5.7 0-2.7-3.7-3.6-5.2-1.2z" style="fill: var(--color-pink-deep)"/><path d="M2 41h44" stroke-width="1.5" stroke-linecap="round" style="stroke: var(--text-secondary)"/>',
  moveby: '<rect x="5" y="10" width="32" height="30" rx="5" stroke-width="1.5" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><path d="M5.75 15a4.25 4.25 0 0 1 4.25-4.25h22A4.25 4.25 0 0 1 36.25 15v4H5.75z" style="fill: var(--accent-fill-1)"/><path d="M13 7v6M29 7v6" stroke-width="2" stroke-linecap="round" style="stroke: var(--text-secondary)"/><g style="fill: var(--accent-fill-3)"><rect x="10" y="23" width="5" height="4" rx="1"/><rect x="18.5" y="23" width="5" height="4" rx="1"/><rect x="27" y="23" width="5" height="4" rx="1"/><rect x="10" y="30" width="5" height="4" rx="1"/></g><rect x="18.5" y="30" width="5" height="4" rx="1" style="fill: var(--color-pink-deep)"/><circle cx="36" cy="35" r="5.5" stroke-width="1.5" style="fill: var(--accent-fill-2); stroke: var(--text-secondary)"/><circle cx="36" cy="35" r="1.6" style="fill: var(--text-secondary)"/><path d="M39.8 38.8 45.5 44.5M43 42l-2 2M45 44l-1.5 1.5" stroke-width="2" stroke-linecap="round" style="stroke: var(--text-secondary)"/>',
  monthly: '<rect x="5" y="34" width="24" height="7" rx="3.5" stroke-width="1.5" style="fill: var(--accent-fill-1); stroke: var(--text-secondary)"/><rect x="8" y="27" width="24" height="7" rx="3.5" stroke-width="1.5" style="fill: var(--accent-fill-2); stroke: var(--text-secondary)"/><rect x="5" y="20" width="24" height="7" rx="3.5" stroke-width="1.5" style="fill: var(--accent-fill-1); stroke: var(--text-secondary)"/><path d="M39 8v22M33 24l6 6 6-6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-pink-deep)"/>',
  cash: '<rect x="10" y="7" width="24" height="13" rx="2" stroke-width="1.5" transform="rotate(-8 22 13)" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><circle cx="22" cy="13" r="2.6" transform="rotate(-8 22 13)" style="fill: var(--accent-fill-1)"/><rect x="4" y="15" width="35" height="26" rx="6" stroke-width="1.5" style="fill: var(--accent-fill-1); stroke: var(--text-secondary)"/><path d="M28 22h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H28a6.5 6.5 0 0 1 0-13z" stroke-width="1.5" style="fill: var(--accent-fill-2); stroke: var(--text-secondary)"/><circle cx="29" cy="28.5" r="2" style="fill: var(--text-secondary)"/>',
  space: '<rect x="10" y="10" width="28" height="28" rx="4" stroke-width="1.5" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><rect x="23" y="25" width="13.5" height="11.5" rx="2" style="fill: var(--accent-fill-2)"/><path d="M10.75 24H22v13.25M22 10.75V18" stroke-width="1.5" style="stroke: var(--text-secondary)"/><path d="M3 10V3h7M3 3l6.5 6.5M45 38v7h-7M45 45l-6.5-6.5" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-pink-deep)"/>',
  value: '<path d="M5 27 15 18l10 9v14H5z" stroke-width="1.5" stroke-linejoin="round" style="fill: var(--bg-surface); stroke: var(--text-secondary)"/><path d="M3 28 15 17l12 11" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--accent-fill-1)"/><rect x="12" y="32" width="6" height="9" rx="1.5" stroke-width="1" style="fill: var(--accent-fill-2); stroke: var(--text-secondary)"/><path d="M27 31l6-7 4 4 8-10M39 18h6v6" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="stroke: var(--color-pink-deep)"/><path d="M2 41h44" stroke-width="1.5" stroke-linecap="round" style="stroke: var(--text-secondary)"/>',
};

// "Near my parents" means the resale step must ask, not assume: clear the default 'NONE' so the parents question
// starts unanswered (and must be answered). Unticking it puts the default back if it was never answered.
watch(() => store.wishes.includes('parents'), (on) => {
  const b = store.choiceB;
  if (on && b.livingArrangement === 'NONE') b.livingArrangement = null;
  else if (!on && b.livingArrangement == null) b.livingArrangement = 'NONE';
});
</script>

<template>
  <div data-cy="wishes-form">
    <fieldset class="wish-tiles">
      <legend class="visually-hidden">What matters most in your next home</legend>
      <label v-for="w in WISHES" :key="w.key" class="wish-tile" :data-cy="`wish-${w.key}`">
        <input
          v-model="store.wishes"
          type="checkbox"
          class="wish-tile__input"
          :value="w.key"
          :data-cy="`wish-${w.key}-input`"
        />
        <span class="wish-tile__face">
          <!-- eslint-disable-next-line vue/no-v-html -- fixed drawings from ART above, no user input -->
          <span class="wish-tile__art"><svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true" v-html="ART[w.key]"></svg></span>
          <span class="wish-tile__name">{{ w.label }}</span>
        </span>
      </label>
    </fieldset>
  </div>
</template>

<style scoped>
.wish-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; border: 0; text-align: left; }
.wish-tile { position: relative; display: block; margin: 0; }
.wish-tile__input { position: absolute; opacity: 0; width: 1px; height: 1px; }
/* Icon and label side by side, so the tiles are short and Next fits on a small laptop without scrolling. */
.wish-tile__face {
  display: flex; align-items: center; gap: 14px;
  min-height: 74px; box-sizing: border-box; padding: 10px 16px; border-radius: 20px; cursor: pointer;
  background: var(--bg-surface); border: 1.5px solid var(--border); color: var(--text-primary);
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
}
/* The shadow is hover only: a tile with no pointer over it never has one, so it never looks picked. */
.wish-tile:hover .wish-tile__face { border-color: var(--border-strong); box-shadow: 0 10px 22px rgba(60, 64, 90, 0.09); }
.wish-tile__art { flex-shrink: 0; width: 54px; height: 54px; border-radius: 15px; background: var(--bg-page); display: grid; place-items: center; }
.wish-tile__name { font-size: 16px; font-weight: 500; line-height: 1.25; }
/* Picked: light pink with a dark border, as the citizenship choice on "Who is buying?" (Next stays the only solid
   black thing on every screen). */
.wish-tile__input:checked + .wish-tile__face { background: var(--accent-tint); border-color: var(--text-primary); }
.wish-tile__input:checked + .wish-tile__face .wish-tile__art { background: var(--bg-surface); }
.wish-tile__input:focus-visible + .wish-tile__face { outline: 2px solid var(--text-primary); outline-offset: 3px; }
@media (max-width: 767.98px) {
  .wish-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  /* Phones: a two-across tile is too narrow for icon and label side by side, so the icon sits above. */
  .wish-tile__face { flex-direction: column; align-items: flex-start; justify-content: space-between; min-height: 104px; gap: 8px; padding: 12px; border-radius: 18px; }
  .wish-tile__art { width: 42px; height: 42px; border-radius: 12px; }
  .wish-tile__art svg { width: 34px; height: 34px; }
  .wish-tile__name { font-size: 15px; }
}
@media (prefers-reduced-motion: reduce) {
  .wish-tile__face { transition: none; }
}
</style>
