<script setup>
// Results page: "Why the gap". Shows where the difference in total position between the two paths
// comes from, one line per part (gapBreakdown in POST /api/compare, D34, docs/API_CONTRACT.md). The data
// arrives with the comparison, so there is nothing to fetch here. The server's lines are signed so positive
// helps Path A; this panel says which path each line favours in words, not only by sign or colour.
// Zero lines are hidden (the contract allows it). data-cy names: docs/CONVENTIONS.md "Gap breakdown".
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';
import { gapRows, gapTotal, grantsText, hiddenLineCount } from '../utils/gapFormat.js';

const props = defineProps({
  gap: { type: Object, default: null }, // result.gapBreakdown
  labelA: { type: String, default: 'BTO' },
  labelB: { type: String, default: 'resale' },
});

const labels = computed(() => ({ labelA: props.labelA, labelB: props.labelB }));
const rows = computed(() => gapRows(props.gap, labels.value));
const total = computed(() => gapTotal(props.gap, labels.value));
const hidden = computed(() => hiddenLineCount(props.gap));
const grants = computed(() => grantsText(props.gap, labels.value));
</script>

<template>
  <div v-if="gap" class="card mb-3" data-cy="results-gap-card">
    <div class="card-body">
      <h2 class="h5">Why the gap</h2>
      <p class="text-secondary">
        Each line is the difference between the two paths in one part of your total position
        <template v-if="gap.horizonYear">in {{ gap.horizonYear }}</template>. The lines add up to the total gap.
      </p>

      <ul v-if="rows.length" class="list-unstyled border-top mb-0" data-cy="results-gap-list">
        <li
          v-for="row in rows"
          :key="row.id"
          class="d-flex align-items-center gap-3 py-2 border-bottom"
          :data-cy="`results-gap-line-${row.id}`"
        >
          <!-- No wrapping of the amount under the label: on a phone a long label wraps inside its own column. -->
          <div class="flex-grow-1">{{ row.label }}</div>
          <div class="text-end flex-shrink-0">
            <div>{{ formatMoney(row.absCents / 100) }}</div>
            <div class="text-caption">{{ row.sideText }}</div>
          </div>
        </li>
      </ul>
      <p v-else class="mb-0" data-cy="results-gap-none">No part of your total position differs between the two paths.</p>

      <div
        v-if="total.text"
        class="d-flex align-items-center gap-3 py-2 fw-semibold"
        data-cy="results-gap-total"
      >
        <div class="flex-grow-1">Total gap</div>
        <div class="text-end">{{ total.text }}</div>
      </div>

      <p v-if="hidden > 0" class="text-caption mb-1" data-cy="results-gap-hidden">
        {{ hidden }} other {{ hidden === 1 ? 'item is' : 'items are' }} the same on both paths, so
        {{ hidden === 1 ? 'it is' : 'they are' }} not shown.
      </p>
      <p class="text-caption mb-0" data-cy="results-gap-note">
        Grants and loan interest have no line of their own: they are already part of the loan, CPF and cash lines.
        <span v-if="grants" data-cy="results-gap-grants">{{ grants }}</span>
      </p>
    </div>
  </div>
</template>
