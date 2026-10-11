<script setup>
// Break-even heatmap: which path ends ahead for each combination of price growth and income growth.
// Rendered as an HTML table (not canvas) so screen readers get real row/column headers and Cypress
// can assert on every cell via data-cy (docs/UI.md §3, §14).
// Colour is never the only signal: every cell has an aria-label and title in words, and a legend.
import { computed, ref } from 'vue';
import { axes, nearestCell } from '../utils/heatmap.js';
import { formatMoney, formatPercent } from '../utils/format.js';

const props = defineProps({
  grid: { type: Array, required: true }, // rows of { annualPriceGrowth, annualIncomeGrowth, winner, marginCents } — money in cents
  userPoint: { type: Object, default: null },
  labelA: { type: String, default: 'BTO' },
  labelB: { type: String, default: 'Resale' },
  horizonYear: { type: Number, default: null },
});

const axis = computed(() => axes(props.grid));
const you = computed(() => nearestCell(props.grid, props.userPoint));

// Show the highest income growth at the top, like a normal chart's y-axis.
// `r` stays the row's index in the data, so data-cy names match the API grid.
const rowsTopDown = computed(() => props.grid.map((row, r) => ({ row, r })).reverse());

const nameOf = (winner) => (winner === 'A' ? props.labelA : props.labelB);

function cellLabel(cell) {
  const where = `Price growth ${formatPercent(cell.annualPriceGrowth)}, income growth ${formatPercent(cell.annualIncomeGrowth)}`;
  if (cell.winner === 'TIE') return `${where}: both paths end level.`;
  return `${where}: ${nameOf(cell.winner)} ends ahead by ${formatMoney(Math.abs(cell.marginCents) / 100)}.`;
}

const isYou = (r, c) => you.value && you.value.row === r && you.value.col === c;

// Tap/click/keyboard equivalent of hovering (UI.md §12: no hover-only interactions).
// Until the user picks a square, the detail line describes their own assumptions' square.
const picked = ref(null);
const selected = computed(() => picked.value ?? (you.value ? { row: you.value.row, col: you.value.col } : null));
const isSelected = (r, c) => selected.value && selected.value.row === r && selected.value.col === c;
const selectedText = computed(() => {
  if (!selected.value) return 'Select a square to see which path ends ahead and by how much.';
  const cell = props.grid[selected.value.row]?.[selected.value.col];
  if (!cell) return '';
  const prefix = isYou(selected.value.row, selected.value.col) ? 'Your assumptions. ' : '';
  return prefix + cellLabel(cell);
});
</script>

<template>
  <figure class="heatmap mb-0" data-cy="heatmap">
    <div class="table-responsive">
      <table class="heatmap__table">
        <caption class="visually-hidden">
          Which path ends with the higher net financial position<template v-if="horizonYear">
            at {{ horizonYear }}</template>,
          for each combination of yearly flat price growth (columns) and income growth (rows).
        </caption>
        <thead>
          <tr>
            <td></td>
            <th :colspan="axis.priceGrowth.length" scope="colgroup" class="heatmap__axis small fw-normal">
              Flat price growth per year
            </th>
          </tr>
          <tr>
            <th scope="col" class="heatmap__corner">
              <span class="small fw-normal">Income growth</span>
            </th>
            <th
              v-for="(pg, c) in axis.priceGrowth"
              :key="`col-${c}`"
              scope="col"
              class="heatmap__axis heatmap__axis--col small"
            >
              {{ formatPercent(pg) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ row, r } in rowsTopDown" :key="`row-${r}`">
            <th scope="row" class="heatmap__axis heatmap__axis--row small">{{ formatPercent(row[0].annualIncomeGrowth) }}</th>
            <td
              v-for="(cell, c) in row"
              :key="`${r}-${c}`"
              class="heatmap__cell"
              :class="[`heatmap__cell--${cell.winner.toLowerCase()}`, { 'heatmap__cell--you': isYou(r, c) }]"
              :data-cy="`heatmap-cell-r${r}-c${c}`"
              :title="cellLabel(cell)"
            >
              <button
                type="button"
                class="heatmap__hit"
                :class="{ 'heatmap__hit--selected': isSelected(r, c) }"
                :aria-label="isYou(r, c) ? `Your assumptions. ${cellLabel(cell)}` : cellLabel(cell)"
                :aria-pressed="isSelected(r, c) ? 'true' : 'false'"
                :data-cy="`heatmap-button-r${r}-c${c}`"
                @click="picked = { row: r, col: c }"
              >
                <span v-if="isYou(r, c)" class="heatmap__you small" data-cy="heatmap-user-marker" aria-hidden="true">You</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-3 mb-0" aria-live="polite" data-cy="heatmap-selected-detail">{{ selectedText }}</p>

    <figcaption class="mt-3">
      <ul class="heatmap__legend small list-unstyled d-flex flex-wrap gap-3 mb-0" data-cy="heatmap-legend">
        <li class="d-flex align-items-center gap-2">
          <span class="heatmap__swatch heatmap__cell--a" aria-hidden="true"></span>{{ labelA }} ahead
        </li>
        <li class="d-flex align-items-center gap-2">
          <span class="heatmap__swatch heatmap__cell--b" aria-hidden="true"></span>{{ labelB }} ahead
        </li>
        <li class="d-flex align-items-center gap-2">
          <span class="heatmap__swatch heatmap__cell--tie" aria-hidden="true"></span>Level
        </li>
        <li v-if="you" class="d-flex align-items-center gap-2">
          <span class="heatmap__you small" aria-hidden="true">You</span>Your assumptions
        </li>
      </ul>
      <p v-if="you?.outside" class="text-secondary small mt-2 mb-0" data-cy="heatmap-outside-note">
        Your assumptions are outside the range shown, so the marker sits on the nearest edge.
      </p>
    </figcaption>
  </figure>
</template>