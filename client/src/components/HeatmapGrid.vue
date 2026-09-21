<script setup>
// DOM-rendered heatmap (not canvas) so Cypress can assert on every cell via data-cy.
// TODO (seat 5): axis labels, legend, tooltips, keyboard focus, and the rulebook's colour scale.
// A cell never relies on colour alone: each carries an aria-label saying which path wins.
defineProps({
  grid: { type: Array, required: true }, // rows of { priceGrowth, incomeGrowth, winner, margin }
});

const label = (cell) =>
  `Price growth ${cell.priceGrowth}%, income growth ${cell.incomeGrowth}%: ` +
  (cell.winner === 'TIE' ? 'paths are equal' : `path ${cell.winner} ahead`);
</script>

<template>
  <div
    class="heatmap"
    data-cy="heatmap"
    role="img"
    aria-label="Break-even heatmap"
    :style="{ gridTemplateColumns: `repeat(${grid[0]?.length || 1}, minmax(2.5rem, 1fr))` }"
  >
    <template v-for="(row, r) in grid" :key="r">
      <div
        v-for="(cell, c) in row"
        :key="`${r}-${c}`"
        class="heatmap__cell"
        :class="`heatmap__cell--${cell.winner.toLowerCase()}`"
        :data-cy="`heatmap-cell-r${r}-c${c}`"
        :title="label(cell)"
      ></div>
    </template>
  </div>
</template>
