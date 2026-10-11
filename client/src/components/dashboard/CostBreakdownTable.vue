<script setup>
// Cost lines for both paths side by side, from outcome.costBreakdown in the contract:
// [{ id, label, amountCents, paidFrom: 'CASH' | 'CPF' | 'NONE' }]. Ids include BSD, LEGAL, AGENT,
// RENOVATION, RENT_WHILE_WAITING, LOAN_INTEREST and CPF_ACCRUED_INTEREST.
// A line one path doesn't have shows "—". Stacks on phones like the grants table (.dash-grants).
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
});

const PAID_FROM = { CASH: 'cash', CPF: 'CPF', NONE: 'owed back later' };
const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);

const rows = computed(() => {
  const linesA = props.outcomeA.costBreakdown ?? [];
  const linesB = props.outcomeB.costBreakdown ?? [];
  const ids = [...new Set([...linesA, ...linesB].map((l) => l.id))];
  const cell = (lines, id) => {
    const l = lines.find((x) => x.id === id);
    return l ? { amount: dollars(l.amountCents), paidFrom: PAID_FROM[l.paidFrom] ?? '' } : null;
  };
  return ids.map((id) => ({
    id,
    label: [...linesA, ...linesB].find((l) => l.id === id)?.label ?? id,
    a: cell(linesA, id),
    b: cell(linesB, id),
  }));
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
          <template v-if="c">
            <span class="text-numeric">{{ formatMoney(c.amount) }}</span>
            <span v-if="c.paidFrom" class="d-block small text-secondary">paid from {{ c.paidFrom }}</span>
          </template>
          <span v-else class="text-secondary">—</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>