<script setup>
// Cost lines for both paths side by side, from outcome.costBreakdown in the contract:
// [{ id, label, amountCents, paidFrom: 'CASH' | 'CPF' | 'NONE' }]. Ids include BSD, LEGAL, AGENT,
// RENOVATION, RENT_WHILE_WAITING, LOAN_INTEREST, CPF_ACCRUED_INTEREST and CLAWBACK.
// A line one path doesn't have shows "—". The biggest cost (in the first result) is listed first. Stacks on phones like the grants table (.dash-grants).
import { computed, ref, watch } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { largestFirst, paidFromLabel } from '../../utils/dashboardFormat.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);

const unsorted = computed(() => {
  const linesA = props.outcomeA.costBreakdown ?? [];
  const linesB = props.outcomeB.costBreakdown ?? [];
  const ids = [...new Set([...linesA, ...linesB].map((l) => l.id))];
  const cell = (lines, id) => {
    const l = lines.find((x) => x.id === id);
    return l ? { amount: dollars(l.amountCents), paidFrom: paidFromLabel(l) } : null;
  };
  return ids.map((id) => ({
    id,
    label: [...linesA, ...linesB].find((l) => l.id === id)?.label ?? id,
    a: cell(linesA, id),
    b: cell(linesB, id),
  }));
});

// Biggest cost first, decided once from the first result so rows do not jump while a slider is dragged.
const order = ref([]);
watch(unsorted, (rows) => {
  if (!order.value.length && rows.length) order.value = largestFirst(rows).map((r) => r.id);
}, { immediate: true });
const rows = computed(() => {
  const rank = (id) => { const i = order.value.indexOf(id); return i === -1 ? order.value.length : i; };
  return [...unsorted.value].sort((x, y) => rank(x.id) - rank(y.id));
});
</script>

<template>
  <p v-if="!rows.length" class="text-secondary small mb-0" data-cy="dashboard-costs-empty">No cost breakdown in this result.</p>
  <table v-else class="table align-top mb-0 dash-grants" data-cy="dashboard-costs">
    <thead>
      <tr class="small text-secondary">
        <th scope="col" class="fw-semibold">Cost</th>
        <th scope="col" class="fw-semibold">BTO</th>
        <th scope="col" class="fw-semibold">Resale</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.id" :data-cy="`dashboard-cost-${row.id.toLowerCase()}`">
        <th scope="row" class="fw-semibold">{{ row.label }}</th>
        <td v-for="(c, i) in [row.a, row.b]" :key="i" :data-label="i === 0 ? 'BTO' : 'Resale'">
          <div v-if="c" class="cost-cell">
            <span class="text-numeric">{{ formatMoney(c.amount) }}</span>
            <span v-if="c.paidFrom" class="cost-chip">{{ c.paidFrom }}</span>
          </div>
          <span v-else class="text-secondary">—</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
/* Flex + gap spaces the amount and chip evenly, horizontally and when the chip wraps onto its own line. */
.cost-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
}

.cost-chip {
  display: inline-block;
  margin: 0;
  padding: 0.0625rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--accent-fill-3);
  color: var(--text-primary);
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>