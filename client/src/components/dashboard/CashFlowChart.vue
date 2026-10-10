<script setup>
// Money in and money out for both paths, side by side, from the contract's Outcome fields (cents).
// Chart.js (MIT), https://www.chartjs.org
// A canvas is invisible to screen readers, so the same numbers are also in a visually hidden table,
// and the canvas carries a one-line aria-label summary (UI.md §3, §11).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  holdingYears: { type: Number, default: null },
});

const canvas = ref(null);
let chart = null;

// Colours come from the Bootstrap theme (set from the design tokens), so no hex lives in this file.
function themeColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bs-${name}`).trim();
}

const ITEMS = [
  { label: 'Cash paid at purchase', get: (o) => o.cashRequiredAtPurchaseCents },
  { label: 'CPF used at purchase', get: (o) => o.cpfUsedAtPurchaseCents },
  { label: 'Housing loan', get: (o) => o.loanPrincipalCents },
  { label: 'Loan interest paid', get: (o) => o.totalInterestPaidCents },
  { label: 'Grants received', get: (o) => o.totalGrantsCents },
  { label: 'Sale price', get: (o) => o.salePriceCents },
  { label: 'Loan still owed at sale', get: (o) => o.outstandingLoanAtSaleCents },
  { label: 'CPF refunded + interest', get: (o) => sum(o.cpfRefundPrincipalCents, o.cpfAccruedInterestCents) },
  { label: 'Selling costs', get: (o) => o.transactionCostsCents },
  { label: 'Grant clawback', get: (o) => o.clawbackCents },
];

function sum(...cents) {
  return cents.every((c) => typeof c !== 'number') ? null : cents.reduce((s, c) => s + (c ?? 0), 0);
}
// Axis labels: S$500k / S$1.2M so they fit on a phone. Tooltips and the table show full amounts.
const short = (v) => (Math.abs(v) >= 1e6 ? `S$${Math.round(v / 1e5) / 10}M` : Math.abs(v) >= 1e3 ? `S$${Math.round(v / 1e3)}k` : `S$${v}`);
const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);

const rows = computed(() => ITEMS.map((item) => ({
  label: item.label,
  bto: dollars(item.get(props.outcomeA)),
  resale: dollars(item.get(props.outcomeB)),
})).filter((r) => r.bto !== null || r.resale !== null));

const summary = computed(() => {
  const when = props.holdingYears ? ` after ${props.holdingYears} years` : '';
  return `Bar chart of money in and out for each path${when}. The table after the chart lists every value.`;
});

function data() {
  return {
    labels: rows.value.map((r) => r.label),
    datasets: [
      { label: 'BTO', data: rows.value.map((r) => r.bto), backgroundColor: themeColour('primary'), borderRadius: 4 },
      { label: 'Resale', data: rows.value.map((r) => r.resale), backgroundColor: themeColour('warning'), borderRadius: 4 },
    ],
  };
}

onMounted(() => {
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: data(),
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? false : { duration: 200 },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.x)}` } },
      },
      scales: {
        x: { ticks: { callback: (v) => short(v), maxTicksLimit: 5 } },
      },
    },
  });
});

watch(() => [props.outcomeA, props.outcomeB], () => {
  if (!chart) return;
  chart.data = data();
  chart.update();
});

onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div data-cy="dashboard-cashflow">
    <div class="dash-chart dash-chart--tall">
      <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
    </div>
    <div class="visually-hidden">
    <table>
      <caption>Money in and out for each path</caption>
      <thead><tr><th scope="col">Item</th><th scope="col">BTO</th><th scope="col">Resale</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.label"><th scope="row">{{ r.label }}</th><td>{{ formatMoney(r.bto) }}</td><td>{{ formatMoney(r.resale) }}</td></tr>
      </tbody>
    </table>
    </div>
  </div>
</template>