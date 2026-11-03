<script setup>
// Top of the Results page: who ends ahead, by how much, and the few numbers that decide it, side by side.
// Everything here is derived from the two Outcomes by utils/resultsVerdict.js (pure, unit-tested); this
// component only lays it out. Wording follows the guardrails: "net position" (what a path leaves you with, after
// costs), never "profit". Colour is never the only signal: the leading path is named in words
// and the better side of each row carries a "Better" tag.
// data-cy names: docs/CONVENTIONS.md "Results verdict".
import Term from './Term.vue';
import { nextTick } from 'vue';

defineProps({
  verdict: { type: Object, required: true }, // from verdict()
  rows: { type: Array, required: true }, // from keyRows()
  gapSentence: { type: String, default: '' }, // the exact figure, kept for the existing Results spec
  breakEvenSentence: { type: String, default: '' },
  horizonYear: { type: Number, default: null },
});

// "Jump to the official steps" scrolls to the existing "What to do next" card and moves focus there, so
// keyboard and screen-reader users land on it too.
async function jumpToSteps() {
  const el = document.getElementById('next-steps-title');
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  await nextTick();
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
</script>

<template>
  <section aria-labelledby="verdict-headline" class="verdict" data-cy="results-verdict">
    <p class="verdict__eyebrow" data-cy="results-verdict-eyebrow">
      <template v-if="verdict.winner === 'bto' || verdict.winner === 'resale'">
        <span class="verdict__dot" :class="`verdict__dot--${verdict.winner}`" aria-hidden="true"></span>
        {{ verdict.winner === 'bto' ? 'BTO' : 'Resale' }} comes out ahead<template v-if="horizonYear"> in {{ horizonYear }}</template>
      </template>
      <template v-else>Your result<template v-if="horizonYear"> in {{ horizonYear }}</template></template>
    </p>

    <h1 id="verdict-headline" class="hero-statement mb-2" data-cy="results-verdict-headline">{{ verdict.headline }}</h1>
    <p v-if="gapSentence" class="verdict__exact" data-cy="results-gap-sentence">{{ gapSentence }}</p>
    <p v-if="breakEvenSentence" class="text-secondary mb-4" data-cy="results-breakeven-sentence">{{ breakEvenSentence }}</p>

    <div class="card verdict__table-card mb-3">
      <div class="table-responsive">
        <table class="verdict__table" data-cy="results-key-comparison">
          <caption class="visually-hidden">The numbers that matter, BTO next to resale. Net position is what each path leaves you with, after costs.</caption>
          <thead>
            <tr>
              <td></td>
              <th scope="col"><span class="verdict__dot verdict__dot--bto" aria-hidden="true"></span>BTO</th>
              <th scope="col"><span class="verdict__dot verdict__dot--resale" aria-hidden="true"></span>Resale</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" :data-cy="`results-key-row-${row.id}`">
              <th scope="row">
                <Term v-if="row.id === 'position'" id="net-position">{{ row.label }}</Term>
                <template v-else>{{ row.label }}</template>
              </th>
              <td :class="{ 'is-better': row.better === 'a' }" :data-cy="`results-key-${row.id}-bto`">
                <span class="text-numeric">{{ row.a }}</span>
                <span v-if="row.better === 'a'" class="verdict__tag">Better</span>
              </td>
              <td :class="{ 'is-better': row.better === 'b' }" :data-cy="`results-key-${row.id}-resale`">
                <span class="text-numeric">{{ row.b }}</span>
                <span v-if="row.better === 'b'" class="verdict__tag">Better</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- The next step: move on from "which is better" to "what is it made of", then to the official steps. -->
    <div class="verdict__next d-print-none" data-cy="results-verdict-next">
      <p class="verdict__next-text mb-0">
        <strong>Next:</strong> see what these numbers are made of, then check the official steps.
      </p>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink to="/dashboard" class="btn btn-primary" data-cy="results-dashboard-button">See what this is made of</RouterLink>
        <button type="button" class="btn btn-outline-secondary" data-cy="results-steps-jump" @click="jumpToSteps">Jump to the official steps</button>
        <RouterLink to="/plan" class="btn btn-link" data-cy="results-edit-button">Change inputs</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.verdict { margin-bottom: var(--space-4); }
.verdict__eyebrow {
  display: inline-flex; align-items: center; gap: var(--space-2);
  margin: 0 0 var(--space-2);
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  font-size: 0.8125rem; font-weight: 500;
  background: var(--accent-fill-3);
}
.verdict__dot { display: inline-block; width: 0.625rem; height: 0.625rem; border-radius: 50%; margin-right: var(--space-2); }
.verdict__eyebrow .verdict__dot { margin-right: 0; }
.verdict__dot--bto { background: var(--primary); }
.verdict__dot--resale { background: var(--accent-fill-1); box-shadow: 0 0 0 1px var(--primary); }
.verdict__exact { margin-bottom: var(--space-1); }

.verdict__table-card { overflow: hidden; }
.verdict__table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.verdict__table th, .verdict__table td { padding: var(--space-3) var(--space-4); text-align: right; vertical-align: baseline; }
.verdict__table thead th { font-family: var(--font-heading); font-weight: 500; }
.verdict__table tbody th { text-align: left; font-weight: 400; color: var(--text-secondary); }
.verdict__table thead th, .verdict__table tbody td { width: 28%; }
.verdict__table tbody tr { border-top: 1px solid var(--border-subtle); }
.verdict__table td.is-better .text-numeric { font-weight: 600; }
.verdict__tag {
  display: inline-block; margin-left: var(--space-2);
  padding: 0 0.5rem; border-radius: var(--radius-pill);
  background: var(--success-fill); color: var(--success);
  font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
  white-space: nowrap;
}
.verdict__next {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  background: var(--accent-fill-2);
}
@media (max-width: 575.98px) {
  .verdict__table th, .verdict__table td { padding: var(--space-2) var(--space-3); }
  .verdict__tag { display: block; margin: 0.125rem 0 0; width: fit-content; margin-left: auto; }
}
</style>
