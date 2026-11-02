<script setup>
// Eligibility reasons, grouped by grant (docs/UI.md §8 "Explanation / reason blocks"). Each grant gets ONE
// status pill and, when it pays out, its amount; under it, one line per test with that test's own reason.
// Status is written out ("Eligible" / "Not eligible"), never colour alone; each test is marked "Passed:" or
// "Failed:" for screen readers. sourceUrl (contract v2) links a reason to its official source.
// `amounts` ({ EHG: cents, ... }) decides a grant's status when given (a grant is eligible when it pays
// out, as on the Dashboard); without it a grant is eligible when every one of its tests passed.
// data-cy keeps one item per TEST, numbered across the whole list, as the Results spec expects.
import Term from './Term.vue';
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ grant, passed, reason, sourceUrl }], flattened from Outcome.grants[].tests by PathOutcomeCard
  amounts: { type: Object, default: null }, // { [grantId]: amountCents }
  cyPrefix: { type: String, required: true }, // e.g. 'results-patha'
});

const GRANT_NAMES = {
  EHG: 'Enhanced CPF Housing Grant',
  FAMILY: 'CPF Housing Grant (Family)',
  PHG: 'Proximity Housing Grant',
};
const grantName = (code) => GRANT_NAMES[code] ?? code;
// The glossary entry for each grant, so its name opens a plain-English definition.
const GRANT_TERMS = { EHG: 'ehg', FAMILY: 'family-grant', PHG: 'phg' };

// Groups keep the order grants first appear in; each test keeps its index in the flat list.
const groups = computed(() => {
  const byGrant = new Map();
  props.items.forEach((item, index) => {
    if (!byGrant.has(item.grant)) byGrant.set(item.grant, { id: item.grant, tests: [] });
    byGrant.get(item.grant).tests.push({ ...item, index });
  });
  return [...byGrant.values()].map((g) => {
    const cents = props.amounts?.[g.id];
    const known = typeof cents === 'number';
    return {
      ...g,
      name: grantName(g.id),
      eligible: known ? cents > 0 : g.tests.every((t) => t.passed),
      amount: known && cents > 0 ? cents / 100 : null,
    };
  });
});
</script>

<template>
  <div v-if="items.length" class="elig" :data-cy="`${cyPrefix}-eligibility`">
    <section v-for="g in groups" :key="g.id" class="elig__grant" :data-cy="`${cyPrefix}-eligibility-grant-${g.id.toLowerCase()}`">
      <div class="elig__head">
        <h4 class="elig__name"><Term v-if="GRANT_TERMS[g.id]" :id="GRANT_TERMS[g.id]">{{ g.name }}</Term><template v-else>{{ g.name }}</template></h4>
        <span class="elig__pill" :class="g.eligible ? 'elig__pill--yes' : 'elig__pill--no'" :data-cy="`${cyPrefix}-eligibility-grant-status-${g.id.toLowerCase()}`">
          {{ g.eligible ? '✓ Eligible' : '✗ Not eligible' }}
        </span>
        <span v-if="g.amount !== null" class="elig__amount text-numeric">{{ formatMoney(g.amount) }}</span>
      </div>
      <ul class="elig__tests list-unstyled mb-0">
        <li v-for="t in g.tests" :key="t.index" :data-cy="`${cyPrefix}-eligibility-item-${t.index}`">
          <span :data-cy="`${cyPrefix}-eligibility-status-${t.index}`">
            <span aria-hidden="true">{{ t.passed ? '✓' : '✗' }}</span>
            <span class="visually-hidden">{{ t.passed ? 'Passed:' : 'Failed:' }}</span>
          </span>
          <span :data-cy="`${cyPrefix}-eligibility-reason-${t.index}`">{{ t.reason }}</span>
          <a v-if="t.sourceUrl" :href="t.sourceUrl" target="_blank" rel="noopener noreferrer" :data-cy="`${cyPrefix}-eligibility-source-${t.index}`">Source<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
        </li>
      </ul>
    </section>
  </div>
  <p v-else class="text-secondary mb-0" :data-cy="`${cyPrefix}-eligibility-empty`">
    No eligibility checks were returned for this path.
  </p>
</template>

<style scoped>
.elig { display: flex; flex-direction: column; gap: var(--space-4); }
.elig__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); }
.elig__name { font-family: var(--font-heading); font-size: 0.9375rem; font-weight: 500; margin: 0; flex: 1 1 auto; }
.elig__pill { padding: 0.125rem 0.625rem; border-radius: var(--radius-pill); font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.elig__pill--yes { background: var(--success-fill); color: var(--success); }
.elig__pill--no { background: var(--danger-fill); color: var(--danger); }
.elig__amount { font-family: var(--font-heading); font-weight: 500; font-size: 1.0625rem; letter-spacing: -0.015em; }
.elig__tests li { font-size: 0.875rem; color: var(--text-secondary); padding: 0.125rem 0; }
.elig__tests li > span:first-child { display: inline-block; width: 1.25rem; }
.elig__tests a { margin-left: 0.375rem; white-space: nowrap; }
</style>
