<script setup>
// The Grants card and, when the parents question wasn't asked (D38), "Could resale get closer?" with the Proximity
// Housing Grant. Grants are never extra money: they are already inside every figure (D1). On a BTO the Family Grant
// and the PHG are named as resale-only, never as "not eligible". "Why" opens the path cards with each check and its
// official source.
import { computed } from 'vue';
import { grantLine } from '../utils/resultsSummary.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  phgNotAsked: { type: Boolean, default: false },
});
const emit = defineEmits(['why', 'add-parents']);
const lines = computed(() => [
  { key: 'bto', name: 'BTO', ...grantLine(props.outcomeA, 'bto') },
  { key: 'resale', name: 'Resale', ...grantLine(props.outcomeB, 'resale') },
]);
const anyResaleOnly = computed(() => lines.value.some((l) => l.resaleOnly));
</script>

<template>
  <div class="gr" :class="{ 'gr--two': phgNotAsked }">
    <section class="gr__card" aria-labelledby="gr-title" data-cy="results-grants">
      <h2 id="gr-title" class="gr__title">Grants</h2>
      <div v-for="l in lines" :key="l.key" class="gr__line" :class="{ 'gr__line--yes': l.paying.length }" :data-cy="`results-grants-${l.key}`">
        <span class="gr__path" :class="`gr__path--${l.key}`">{{ l.name }}</span>
        <span v-if="l.paying.length" class="gr__what">
          <span v-for="p in l.paying" :key="p.id" class="gr__grant"><span>{{ p.name }}</span><strong class="text-numeric">{{ p.amount }}</strong></span>
        </span>
        <span v-else class="gr__what gr__what--none"><strong>None.</strong> {{ l.reason }}</span>
      </div>
      <p class="gr__note" data-cy="results-gap-grants">
        Already counted in the figures above.<template v-if="anyResaleOnly"> The Family Grant and the Proximity Housing Grant are for resale flats only.</template>{{ ' ' }}
        <button type="button" class="gr__why d-print-none" data-cy="results-grants-why" @click="emit('why')">Why</button>
      </p>
    </section>

    <section v-if="phgNotAsked" class="gr__card gr__card--phg" aria-labelledby="phg-title" data-cy="results-phg-note">
      <h2 id="phg-title" class="gr__title">Could resale get closer?</h2>
      <p class="mb-0">
        If you'd live with or within 4 km of your parents, the Proximity Housing Grant could add up to <strong>S$30,000</strong>
        to the resale path. We haven't counted it yet.
      </p>
      <button type="button" class="btn gr__add d-print-none" data-cy="results-phg-add" @click="emit('add-parents')">Add it to my plan</button>
    </section>
  </div>
</template>

<style scoped>
.gr { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
.gr--two { grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
.gr__card { display: flex; flex-direction: column; gap: var(--space-3); padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-md); background: var(--bg-surface); }
.gr__card--phg { background: var(--accent-fill-2); }
.gr__title { margin: 0; font-size: 1.375rem; font-weight: 600; }
.gr__line { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: baseline; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--indigo-tint); }
.gr__line--yes { background: var(--success-fill); }
.gr__path { flex: none; min-width: 4.5rem; font-weight: 600; }
.gr__path--bto { color: var(--accent-deep); }
.gr__path--resale { color: var(--color-berry); }
.gr__what { flex: 1 1 240px; display: flex; flex-direction: column; gap: var(--space-1); }
.gr__what--none { color: var(--text-secondary); }
.gr__what--none strong { color: var(--text-primary); }
.gr__grant { display: flex; justify-content: space-between; gap: var(--space-3); }
.gr__note { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
.gr__why { padding: 0; border: 0; background: none; font: inherit; font-weight: 600; color: var(--text-primary); text-decoration: underline; cursor: pointer; }
.gr__why:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }
.gr__add { align-self: flex-start; border-radius: var(--radius-pill); background: var(--bg-surface); font-weight: 600; padding: 0.625rem 1.25rem; }
.gr__add:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
</style>
