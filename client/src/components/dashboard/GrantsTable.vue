<script setup>
// Grants for both paths side by side, from outcome.grants in the contract:
// [{ id, amountCents, tests: [{ id, passed, reason, sourceUrl? }] }].
// A grant counts as eligible when it pays out (amountCents > 0). Every test shows its own reason.
// If a test carries a sourceUrl it links to the official rule; the Sources page always lists them all.
// On phones the table stacks (each grant becomes a block with BTO and Resale under it), see .dash-grants.
// Status is written out (✓ / ✗ and words), not shown by colour alone.
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
});

const NAMES = {
  EHG: 'Enhanced CPF Housing Grant',
  FAMILY: 'CPF Housing Grant (Family)',
  PHG: 'Proximity Housing Grant',
};

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);

const rows = computed(() => {
  const ids = [...new Set([...(props.outcomeA.grants ?? []), ...(props.outcomeB.grants ?? [])].map((g) => g.id))];
  const cell = (outcome, id) => {
    const g = (outcome.grants ?? []).find((x) => x.id === id);
    return { eligible: (g?.amountCents ?? 0) > 0, amount: dollars(g?.amountCents ?? 0), tests: g?.tests ?? [] };
  };
  return ids.map((id) => ({ id, name: NAMES[id] ?? id, a: cell(props.outcomeA, id), b: cell(props.outcomeB, id) }));
});
</script>

<template>
  <div>
    <table class="table align-top mb-0 dash-grants" data-cy="dashboard-grants">
      <thead>
        <tr class="small text-secondary">
          <th scope="col" class="fw-semibold">Grant</th>
          <th scope="col" class="fw-semibold">BTO</th>
          <th scope="col" class="fw-semibold">Resale</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :data-cy="`dashboard-grant-${row.id.toLowerCase()}`">
          <th scope="row" class="fw-semibold">{{ row.name }}</th>
          <td v-for="(c, i) in [row.a, row.b]" :key="i" :data-label="i === 0 ? 'BTO' : 'Resale'" :data-cy="`dashboard-grant-${row.id.toLowerCase()}-${i === 0 ? 'bto' : 'resale'}`">
            <span class="grant-pill" :class="c.eligible ? 'grant-pill--yes' : 'grant-pill--no'">
              {{ c.eligible ? '✓ Eligible' : '✗ Not eligible' }}
            </span>
            <div v-if="c.eligible" class="grant-amount text-numeric">{{ formatMoney(c.amount) }}</div>
            <ul class="list-unstyled small text-secondary mb-0 mt-2">
              <li v-for="t in c.tests" :key="t.id" data-cy="dashboard-grant-reason">
                <span aria-hidden="true">{{ t.passed ? '✓' : '✗' }}</span>
                <span class="visually-hidden">{{ t.passed ? 'Passed:' : 'Failed:' }}</span>
                {{ t.reason }}
                <a
                  v-if="t.sourceUrl"
                  :href="t.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cy="dashboard-grant-source-link"
                >Official rule<span class="visually-hidden"> (opens in a new tab)</span> ↗</a>
              </li>
            </ul>
          </td>
        </tr>
        <tr class="fw-semibold">
          <th scope="row">Total grants</th>
          <td class="text-numeric" data-label="BTO" data-cy="dashboard-grants-total-bto">{{ formatMoney(dollars(outcomeA.totalGrantsCents)) }}</td>
          <td class="text-numeric" data-label="Resale" data-cy="dashboard-grants-total-resale">{{ formatMoney(dollars(outcomeB.totalGrantsCents)) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.grant-pill {
  display: inline-block;
  padding: 0.125rem 0.625rem;
  border-radius: var(--radius-pill);
  font-size: 0.8125rem;
  font-weight: 500;
}
.grant-pill--yes { background: var(--success-fill); color: var(--success); }
.grant-pill--no { background: var(--danger-fill); color: var(--danger); }
.grant-amount {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 1.125rem;
  letter-spacing: -0.015em;
  margin-top: 0.25rem;
}
</style>
