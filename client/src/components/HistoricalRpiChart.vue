<script setup>
// Results page: HDB's Resale Price Index over time (GET /api/data/rpi, docs/API_CONTRACT.md), with an
// era filter (5y/10y/20y/all) so the shape of the trend is readable at different zoom levels. This is
// background market context, not part of the plan comparison itself — it doesn't depend on the user's
// inputs, so it fetches and renders independently of /api/compare and the rest of the results page.
// "Historical only, not a forecast" (the contract's own words) — the annual-growth figures shown are
// measured back from the latest quarter, never projected forward; the heatmap/chart elsewhere make
// the same point about price-growth assumptions not being predictions.
// Chart.js (MIT), https://www.chartjs.org
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { getRpi } from '../api/client.js';
import { formatPercent } from '../utils/format.js';

const data = ref(null);
const loading = ref(true);
const error = ref(null);
const era = ref('10y'); // '5y' | '10y' | '20y' | 'all'

const ERA_OPTIONS = [
  { value: '5y', label: '5 years', years: 5 },
  { value: '10y', label: '10 years', years: 10 },
  { value: '20y', label: '20 years', years: 20 },
  { value: 'all', label: 'All', years: null },
];

async function load() {
  loading.value = true;
  error.value = null;
  try {
    data.value = await getRpi();
  } catch (e) {
    error.value = e?.response?.data?.error?.message || 'The Resale Price Index could not be loaded.';
  } finally {
    loading.value = false;
  }
}

// 'YYYY-Qn' -> a comparable integer (quarter count since year 0), so "N years back" is just -4N.
const quarterValue = (q) => {
  const [y, n] = q.split('-Q').map(Number);
  return y * 4 + (n - 1);
};

const filteredSeries = computed(() => {
  const series = data.value?.series ?? [];
  const opt = ERA_OPTIONS.find((o) => o.value === era.value);
  if (!opt?.years || series.length === 0) return series;
  const cutoff = quarterValue(series[series.length - 1].quarter) - opt.years * 4;
  return series.filter((row) => quarterValue(row.quarter) >= cutoff);
});

const growthForEra = computed(() => {
  if (era.value === 'all') return null;
  return data.value?.historicalAnnualGrowth?.[era.value] ?? null;
});

const summary = computed(() => {
  const opt = ERA_OPTIONS.find((o) => o.value === era.value);
  return `Line chart of HDB's Resale Price Index over ${opt?.label.toLowerCase() ?? 'the selected period'}. The table after the chart lists every quarter.`;
});

const canvas = ref(null);
let chart = null;

function themeColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bs-${name}`).trim();
}

function chartData() {
  return {
    labels: filteredSeries.value.map((r) => r.quarter),
    datasets: [
      {
        label: 'Resale Price Index',
        data: filteredSeries.value.map((r) => r.index),
        borderColor: themeColour('primary'),
        backgroundColor: themeColour('primary'),
        pointRadius: filteredSeries.value.length > 40 ? 0 : 2,
        tension: 0.15,
      },
    ],
  };
}

function render() {
  if (!canvas.value) return;
  if (chart) {
    chart.data = chartData();
    chart.update();
    return;
  }
  chart = new Chart(canvas.value, {
    type: 'line',
    data: chartData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? false : { duration: 200 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Index: ${ctx.parsed.y}` } },
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { ticks: { maxTicksLimit: 6 } },
      },
    },
  });
}

onMounted(async () => {
  await load();
  render();
});
watch(filteredSeries, () => render());
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="card mb-3" data-cy="results-rpi-card">
    <div class="card-body">
      <h2 class="h5">Resale Price Index over time</h2>
      <p class="text-secondary">
        HDB's official resale price trend ({{ data?.base ?? '…' }}). Historical only, not a prediction of
        future prices.
      </p>

      <div v-if="loading" data-cy="results-rpi-loading" aria-busy="true">
        <span class="visually-hidden" role="status">Loading the Resale Price Index...</span>
        <div class="skeleton results-skeleton results-skeleton--card" aria-hidden="true"></div>
      </div>

      <div v-else-if="error" class="alert alert-danger" role="alert" data-cy="results-rpi-error">
        <p class="mb-2">{{ error }}</p>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-cy="results-rpi-retry-button" @click="load">
          Try again
        </button>
      </div>

      <template v-else-if="data">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <div class="btn-group" role="group" aria-label="Time period" data-cy="results-rpi-era-filter">
            <button
              v-for="opt in ERA_OPTIONS"
              :key="opt.value"
              type="button"
              class="btn btn-sm"
              :class="era === opt.value ? 'btn-primary' : 'btn-outline-secondary'"
              :aria-pressed="era === opt.value ? 'true' : 'false'"
              :data-cy="`results-rpi-era-${opt.value}`"
              @click="era = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <p v-if="growthForEra !== null" class="text-secondary small mb-0" data-cy="results-rpi-growth">
            {{ formatPercent(growthForEra) }}/yr over the last {{ era }}
          </p>
        </div>

        <div class="dash-chart">
          <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
        </div>
        <div class="visually-hidden">
          <table>
            <caption>Resale Price Index by quarter</caption>
            <thead><tr><th scope="col">Quarter</th><th scope="col">Index</th></tr></thead>
            <tbody>
              <tr v-for="r in filteredSeries" :key="r.quarter">
                <th scope="row">{{ r.quarter }}</th>
                <td>{{ r.index }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="data.mock" class="text-caption mt-2 mb-0" data-cy="results-rpi-mock-notice">Showing mock data.</p>
      </template>
    </div>
  </div>
</template>