<script setup>
// Top of the Results page: who ends ahead, by how much, why the other path still has something going for it, and the
// few numbers that decide it, side by side. Everything is derived from the two Outcomes by utils/resultsVerdict.js
// (pure, unit-tested); this component only lays it out. Wording follows the guardrails: "net position" (what a
// path leaves you with, after costs), never "profit". Colour is never the only signal: the leading path is named in
// words, each bar carries its figure, and the better side of each row is marked with a ✓ (and tinted, and spoken as "(better)" to screen readers).
// data-cy names: docs/CONVENTIONS.md "Results verdict".
import Term from './Term.vue';
import { computed, nextTick } from 'vue';
import { barShares, reasonLine } from '../utils/resultsVerdict.js';

const props = defineProps({
  verdict: { type: Object, required: true }, // from verdict()
  rows: { type: Array, required: true }, // from keyRows()
  gapSentence: { type: String, default: '' }, // the exact figure, kept for the existing Results spec
  breakEvenSentence: { type: String, default: '' },
  horizonYear: { type: Number, default: null },
  labelA: { type: String, default: 'BTO' }, // e.g. 'BTO · Tampines', for the bars
  labelB: { type: String, default: 'Resale' },
});

const reason = computed(() => reasonLine(props.rows, props.verdict));
const position = computed(() => props.rows.find((r) => r.id === 'position'));
const shares = computed(() => barShares(position.value?.raw?.[0], position.value?.raw?.[1]));
const bars = computed(() => [
  { key: 'bto', label: props.labelA, value: position.value?.a, pct: shares.value.a },
  { key: 'resale', label: props.labelB, value: position.value?.b, pct: shares.value.b },
]);
const named = computed(() => (props.verdict.winner === 'bto' || props.verdict.winner === 'resale') && !props.verdict.close);

// "Jump to the official steps" scrolls to the existing "What to do next" card and moves focus there, so
// keyboard and screen-reader users land on it too.
async function jumpTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  await nextTick();
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
const jumpToSteps = () => jumpTo('next-steps-title');
// "See why each grant applies": the grant reasons live on the two path cards further down.
const jumpToGrants = () => jumpTo('path-details-title');
</script>

<template>
  <section aria-labelledby="verdict-headline" class="verdict" data-cy="results-verdict">
    <div class="verdict__hero">
      <div class="verdict__lead">
        <p class="verdict__eyebrow" data-cy="results-verdict-eyebrow">
          <template v-if="named">
            <span class="verdict__dot" :class="`verdict__dot--${verdict.winner}`" aria-hidden="true"></span>
            {{ verdict.winner === 'bto' ? 'BTO' : 'Resale' }} comes out ahead<template v-if="horizonYear"> in {{ horizonYear }}</template>
          </template>
          <!-- Within the "too close to call" line (D42) no path is named as ahead, here or on the cards. -->
          <template v-else>{{ verdict.close ? 'Too close to call' : 'Your result' }}<template v-if="horizonYear"> in {{ horizonYear }}</template></template>
        </p>
        <h1 id="verdict-headline" class="verdict__headline" data-cy="results-verdict-headline">{{ verdict.headline }}</h1>
        <p v-if="reason" class="verdict__reason" data-cy="results-verdict-reason">{{ reason }}</p>
      </div>

      <div class="verdict__bars" data-cy="results-verdict-bars">
        <p class="verdict__bars-title mb-3">
          <Term id="net-position">Net position</Term><template v-if="horizonYear"> in {{ horizonYear }}</template>
        </p>
        <div v-for="bar in bars" :key="bar.key" class="verdict__bar" :data-cy="`results-verdict-bar-${bar.key}`">
          <div class="verdict__bar-head">
            <span><span class="verdict__dot" :class="`verdict__dot--${bar.key}`" aria-hidden="true"></span>{{ bar.label }}</span>
            <span class="verdict__bar-value text-numeric">{{ bar.value }}</span>
          </div>
          <div class="verdict__track" aria-hidden="true">
            <div class="verdict__fill" :class="`verdict__fill--${bar.key}`" :style="{ width: `${bar.pct}%` }"></div>
          </div>
        </div>
        <p class="verdict__diff mb-1" data-cy="results-verdict-diff">{{ verdict.diffLine }}</p>
        <p class="text-caption mb-0">Bars start at S$0.</p>
      </div>
    </div>

    <p v-if="gapSentence" class="verdict__exact" data-cy="results-gap-sentence">{{ gapSentence }}</p>
    <p v-if="breakEvenSentence" class="text-secondary mb-4" data-cy="results-breakeven-sentence">{{ breakEvenSentence }}</p>

    <h2 class="h5 mb-1">Side by side</h2>
    <p class="text-secondary mb-2" data-cy="results-key-hint">The better one in each row is marked ✓. Grants are already in net position, so they are not.</p>
    <div class="card verdict__table-card mb-3">
      <div class="table-responsive">
        <table class="verdict__table" data-cy="results-key-comparison">
          <caption class="visually-hidden">The numbers that matter, BTO next to resale, and how far apart they are. Net position is what each path leaves you with, after costs. The better side of each row is marked with a tick.</caption>
          <thead>
            <tr>
              <td></td>
              <th scope="col">
                <svg class="verdict__ico verdict__ico--bto" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21v-9h7v9M8 15h1M8 18h1M16 21V4M16 4H9M16 4l4 3M9 4v4" /></svg>BTO
              </th>
              <th scope="col">
                <svg class="verdict__ico verdict__ico--resale" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="M10.9 12.1 20 3M17 6l2.5 2.5M14.5 8.5 17 11" /></svg>Resale
              </th>
              <th scope="col" class="verdict__diff-col">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" :data-cy="`results-key-row-${row.id}`">
              <th scope="row">
                <Term v-if="row.id === 'position'" id="net-position">{{ row.label }}</Term>
                <template v-else>{{ row.label }}</template>
                <span v-if="row.note" class="verdict__note">{{ row.note }}</span>
                <!-- On a phone the Difference column is hidden and its words sit under the row label. -->
                <span class="verdict__diff-sm"><strong v-if="row.diffLead">{{ row.diffLead }}</strong> {{ row.diffRest }}</span>
              </th>
              <td :class="{ 'is-better': row.better === 'a' }" :data-cy="`results-key-${row.id}-bto`">
                <span v-if="row.better === 'a'" class="verdict__check" aria-hidden="true">✓</span>
                <span class="text-numeric">{{ row.a }}</span>
                <span v-if="row.better === 'a'" class="visually-hidden"> (better)</span>
              </td>
              <td :class="{ 'is-better': row.better === 'b' }" :data-cy="`results-key-${row.id}-resale`">
                <span v-if="row.better === 'b'" class="verdict__check" aria-hidden="true">✓</span>
                <span class="text-numeric">{{ row.b }}</span>
                <span v-if="row.better === 'b'" class="visually-hidden"> (better)</span>
              </td>
              <td class="verdict__diff-col verdict__diff-cell" :data-cy="`results-key-${row.id}-diff`">
                <strong v-if="row.diffLead">{{ row.diffLead }}</strong> {{ row.diffRest }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Outside the table: inside a row header, screen readers would repeat it for every cell in the row. -->
    <p class="verdict__grants-line d-print-none">
      <button type="button" class="verdict__grants-link" data-cy="results-key-grants-link" @click="jumpToGrants">See why each grant applies</button>
    </p>

    <!-- The next step: move on from "which is better" to "what is it made of", then to the official steps. -->
    <div class="verdict__next d-print-none" data-cy="results-verdict-next">
      <p class="verdict__next-text mb-0">
        <strong>Next:</strong> see what these numbers are made of, then check the official steps.
      </p>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink to="/dashboard" class="btn btn-primary" data-cy="results-dashboard-button">Open the dashboard</RouterLink>
        <button type="button" class="btn btn-outline-secondary" data-cy="results-steps-jump" @click="jumpToSteps">Jump to the official steps</button>
        <RouterLink to="/plan" class="btn btn-link" data-cy="results-edit-button">Change inputs</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.verdict { --tint-bto: var(--indigo-tint); --tint-resale: var(--accent-tint); margin-bottom: var(--space-4); }
.verdict__hero { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--space-3); margin-bottom: var(--space-4); }
.verdict__lead {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--accent-deep);
  color: var(--on-primary);
}
.verdict__eyebrow {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: var(--space-2);
  margin: 0;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.8125rem; font-weight: 500;
  background: var(--accent-fill-3);
  color: var(--text-primary);
}
.verdict__eyebrow .verdict__dot { margin-right: 0; }
.verdict__headline { margin: 0; font-family: var(--font-heading); font-weight: 500; font-size: clamp(1.625rem, 4vw, 2.25rem); line-height: 1.15; letter-spacing: -0.02em; color: inherit; }
.verdict__reason { margin: 0; opacity: 0.88; line-height: 1.5; }
.verdict__bars { padding: var(--space-4) var(--space-5); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); }
.verdict__bars-title { font-size: 0.9375rem; font-weight: 500; }
.verdict__bar { margin-bottom: var(--space-3); }
.verdict__bar-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); font-size: 0.9375rem; }
.verdict__bar-value { font-family: var(--font-heading); font-weight: 500; font-size: 1.25rem; letter-spacing: -0.015em; }
.verdict__track { height: 0.75rem; margin-top: var(--space-1); border-radius: var(--radius-pill); background: var(--accent-fill-3); overflow: hidden; }
.verdict__fill { height: 100%; border-radius: var(--radius-pill); }
.verdict__fill--bto { background: var(--primary); }
.verdict__fill--resale { background: var(--accent-fill-1); box-shadow: inset 0 0 0 1px var(--primary); }
.verdict__diff { font-size: 0.9375rem; }
.verdict__dot { display: inline-block; width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: var(--space-2); }
.verdict__dot--bto { background: var(--primary); }
.verdict__dot--resale { background: var(--accent-fill-1); box-shadow: 0 0 0 1px var(--primary); }
.verdict__exact { margin-bottom: var(--space-1); }

.verdict__table-card { overflow: hidden; }
.verdict__table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.verdict__table th, .verdict__table td { padding: var(--space-3) var(--space-4); text-align: right; vertical-align: baseline; }
.verdict__table thead th { font-family: var(--font-heading); font-weight: 500; }
.verdict__table tbody th { text-align: left; font-weight: 400; color: var(--text-secondary); }
.verdict__table tbody tr { border-top: 1px solid var(--border-subtle); }
.verdict__table td.is-better:nth-of-type(1) { background: var(--tint-bto); }
.verdict__table td.is-better { font-weight: 600; }
.verdict__table td.is-better:nth-of-type(2) { background: var(--tint-resale); }
.verdict__table td.is-better .text-numeric { font-weight: 600; }
.verdict__ico { vertical-align: -3px; margin-right: var(--space-2); }
.verdict__ico--bto { color: var(--accent-deep); }
.verdict__ico--resale { color: var(--color-berry, var(--accent-fill-1)); }
.verdict__check { margin-right: var(--space-1); font-weight: 700; }
.verdict__note { display: block; margin-top: 0.125rem; font-size: 0.8125rem; color: var(--text-secondary); }
.verdict__grants-link {
  display: inline; margin: 0; padding: 0; border: 0; background: none;
  font: inherit; font-size: 0.9375rem; color: var(--text-primary); text-decoration: underline; cursor: pointer;
}
.verdict__grants-line { margin: calc(-1 * var(--space-1)) 0 var(--space-3); }
.verdict__grants-link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }
.verdict__diff-cell { text-align: left !important; color: var(--text-secondary); }
.verdict__diff-cell strong { color: var(--text-primary); font-weight: 600; }
.verdict__diff-col { text-align: left !important; }
.verdict__diff-sm { display: none; font-size: 0.8125rem; }
.verdict__diff-sm strong { color: var(--text-primary); font-weight: 600; }
.verdict__next {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  background: var(--accent-fill-2);
}
@media (max-width: 991.98px) {
  .verdict__hero { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 575.98px) {
  .verdict__lead { padding: var(--space-4); }
  .verdict__bars { padding: var(--space-4); }
  .verdict__table th, .verdict__table td { padding: var(--space-2) var(--space-3); }
  .verdict__diff-col { display: none; }
  .verdict__diff-sm { display: block; margin-top: 0.125rem; }
}
@media print {
  .verdict__lead { background: none; color: inherit; border: 1px solid var(--text-primary); }
}
</style>
