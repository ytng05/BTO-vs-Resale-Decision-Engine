<script setup>
// How each path's net position adds up in the comparison year (contract v2, D1 — no sale):
//   net = flat value − loan still owed − CPF to pay back (+ interest) − clawback − cash spent on housing.
// Positive bars are what you own, negative bars what you owe or spent. Values from the Outcome (cents).
// Chart.js (MIT), https://www.chartjs.org
// A canvas is invisible to screen readers, so the same numbers are also in a visually hidden table,
// and the canvas carries a one-line aria-label summary (UI.md §3, §11).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  horizonYear: { type: Number, default: null },
});

const canvas = ref(null);
let chart = null;

// Colours come from the Bootstrap theme (set from the design tokens), so no hex lives in this file.
function themeColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bs-${name}`).trim();
}

const neg = (c) => (typeof c === 'number' ? -c : null);
function sum(...cents) {
  return cents.every((c) => typeof c !== 'number') ? null : cents.reduce((s, c) => s + (c ?? 0), 0);
}

const ITEMS = [
  { label: 'Flat value', get: (o) => o.marketValueAtHorizonCents },
  { label: 'Loan still owed', get: (o) => neg(o.outstandingLoanAtHorizonCents) },
  { label: 'CPF to pay back + interest', get: (o) => neg(sum(o.cpfRefundPrincipalCents, o.cpfAccruedInterestCents)) },
  { label: 'Subsidy clawback (Plus/Prime)', get: (o) => neg(o.clawbackCents), hideWhenZero: true },
  { label: 'Cash spent on housing', get: (o) => neg(o.housingCashSpentCents) },
  { label: 'Net position', get: (o) => o.netPositionCents },
];

// Axis labels: S$500k / S$1.2M so they fit on a phone. Tooltips and the table show full amounts.
const short = (v) => {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  return a >= 1e6 ? `${sign}S$${Math.round(a / 1e5) / 10}M` : a >= 1e3 ? `${sign}S$${Math.round(a / 1e3)}k` : `${sign}S$${a}`;
};
const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);

const rows = computed(() => ITEMS.map((item) => ({
  label: item.label,
  hideWhenZero: item.hideWhenZero,
  bto: dollars(item.get(props.outcomeA)),
  resale: dollars(item.get(props.outcomeB)),
})).filter((r) => (r.bto !== null || r.resale !== null) && !(r.hideWhenZero && !r.bto && !r.resale)));

const summary = computed(() => {
  const when = props.horizonYear ? ` in ${props.horizonYear}` : '';
  return `Bar chart of how each path's net position adds up${when}. The table after the chart lists every value.`;
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
        <caption>How each path's net position adds up</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">BTO</th><th scope="col">Resale</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.label"><th scope="row">{{ r.label }}</th><td>{{ formatMoney(r.bto) }}</td><td>{{ formatMoney(r.resale) }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>