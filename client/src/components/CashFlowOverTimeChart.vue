<script setup>
// Results page: how each path's net position builds up year by year, evaluationStartYear to
// horizonYear (contract v2 yearlyCashFlow, docs/API_CONTRACT.md). Distinct from the financial
// dashboard's CashFlowChart.vue, which breaks down ONE year (the horizon) into its components;
// this one is a time series across years, so you can see the shape of the climb, not just the end point.
// netCents per year = marketValueEndCents − loanBalanceEndCents − cpfObligationEndCents (0 before keys,
// since nothing is owned or owed on paper yet). This is a running proxy for net position, not the
// contract's own netPositionCents, which only exists at the horizon and also nets out cash spent and
// clawback — see PathOutcomeCard for that authoritative figure.
// Chart.js (MIT), https://www.chartjs.org
// A canvas is invisible to screen readers, so the same numbers are also in a visually hidden table,
// and the canvas carries a one-line aria-label summary (UI.md §3, §11).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { formatMoney } from '../utils/format.js';

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
// Resale's colour is the pink accent from the design tokens, as on the heatmap and the path cards.
function resaleColour() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent-fill-1').trim();
}

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);
const netOf = (row) => {
  if (!row) return null;
  const { marketValueEndCents, loanBalanceEndCents, cpfObligationEndCents } = row;
  if ([marketValueEndCents, loanBalanceEndCents, cpfObligationEndCents].some((v) => typeof v !== 'number')) return null;
  return dollars(marketValueEndCents - loanBalanceEndCents - cpfObligationEndCents);
};

// Rows keyed by year so the two paths line up even if one series is shorter (different key-collection years).
const rows = computed(() => {
  const byYear = new Map();
  for (const row of props.outcomeA?.yearlyCashFlow ?? []) byYear.set(row.year, { year: row.year, bto: netOf(row) });
  for (const row of props.outcomeB?.yearlyCashFlow ?? []) {
    byYear.set(row.year, { ...(byYear.get(row.year) ?? { year: row.year, bto: null }), resale: netOf(row) });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
});

// Axis labels: S$500k / S$1.2M so they fit on a phone. Tooltips and the table show full amounts.
const short = (v) => {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  return a >= 1e6 ? `${sign}S$${Math.round(a / 1e5) / 10}M` : a >= 1e3 ? `${sign}S$${Math.round(a / 1e3)}k` : `${sign}S$${a}`;
};

const summary = computed(() => {
  const when = props.horizonYear ? ` to ${props.horizonYear}` : '';
  return `Line chart of each path's net position building up year by year${when}. The table after the chart lists every value.`;
});

function data() {
  return {
    labels: rows.value.map((r) => String(r.year)),
    datasets: [
      {
        label: 'BTO',
        data: rows.value.map((r) => r.bto),
        borderColor: themeColour('primary'),
        backgroundColor: themeColour('primary'),
        spanGaps: true,
        tension: 0.15,
      },
      {
        label: 'Resale',
        data: rows.value.map((r) => r.resale),
        borderColor: resaleColour(),
        backgroundColor: resaleColour(),
        spanGaps: true,
        tension: 0.15,
      },
    ],
  };
}

onMounted(() => {
  chart = new Chart(canvas.value, {
    type: 'line',
    data: data(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? false : { duration: 200 },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { ticks: { callback: (v) => short(v), maxTicksLimit: 6 } },
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
  <div data-cy="results-cashflow-trend">
    <div class="dash-chart dash-chart--tall">
      <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
    </div>
    <div class="visually-hidden">
      <table>
        <caption>Net position by year</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">BTO</th><th scope="col">Resale</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.year">
            <th scope="row">{{ r.year }}</th>
            <td>{{ formatMoney(r.bto) }}</td>
            <td>{{ formatMoney(r.resale) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>