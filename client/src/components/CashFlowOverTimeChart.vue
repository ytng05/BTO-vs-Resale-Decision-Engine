<script setup>
// Results page: how each path's net position builds up year by year, evaluationStartYear to
// horizonYear (contract v2 yearlyCashFlow, docs/API_CONTRACT.md). Distinct from the financial
// dashboard's CashFlowChart.vue, which breaks down ONE year (the horizon) into its components;
// this one is a time series across years, so you can see the shape of the climb, not just the end point.
// Each year is measured as the engine measures net position (D1): flat value − loan − CPF savings to put back −
// clawback − cash spent so far (utils/netPositionTrend.js). So the last year is the verdict's figure to the cent.
// Hover, touch or arrow keys: a vertical line and a dot on each path follow the pointer, and a readout above the
// chart shows both paths for that year and who is ahead. The readout starts on the last year, so the chart is
// never blank, and returns there when the mouse leaves. Nothing animates on its own; the line moves only as
// the person moves it, and under reduced motion even the draw-in is off.
// Chart.js (MIT), https://www.chartjs.org
// A canvas is invisible to screen readers, so the same numbers are also in a visually hidden table,
// and the canvas carries a one-line aria-label summary (UI.md §3, §11).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { formatMoney } from '../utils/format.js';
import { trendRows } from '../utils/netPositionTrend.js';
import { verdict } from '../utils/resultsVerdict.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  horizonYear: { type: Number, default: null },
});

const canvas = ref(null);
let chart = null;
const activeIndex = ref(null); // index into rows; null until there is data
const usingKeyboard = ref(false);

// Colours come from the Bootstrap theme (set from the design tokens), so no hex lives in this file.
function themeColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bs-${name}`).trim();
}
// Path colours from the design tokens (_tokens.scss: --path-bto, --path-resale-bar), as on the readout's dots, the
// path cards, the heatmap and the Dashboard's charts.
function pathColour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Rows keyed by year so the two paths line up even if one series is shorter (different key-collection years).
const rows = computed(() => trendRows(props.outcomeA, props.outcomeB));

const lastIndex = computed(() => rows.value.length - 1);
const active = computed(() => rows.value[activeIndex.value ?? lastIndex.value] ?? null);
const isLast = computed(() => (activeIndex.value ?? lastIndex.value) === lastIndex.value);
// Who is ahead in the year shown, in words (colour is never the only signal). The verdict's own rules (level under
// S$500, too close to call within 2%, D42), so the last year reads the same as the headline.
const leadText = computed(() => {
  const r = active.value;
  if (!r || typeof r.bto !== 'number' || typeof r.resale !== 'number') return '';
  const v = verdict({ netPositionCents: Math.round(r.bto * 100) }, { netPositionCents: Math.round(r.resale * 100) });
  if (v.winner === 'level') return 'About level';
  const lead = `${v.winner === 'bto' ? 'BTO' : 'Resale'} is ${formatMoney(v.gapCents / 100)} ahead`;
  return v.close ? `${lead}, too close to call` : lead;
});

function setIndex(i) {
  if (!rows.value.length) return;
  activeIndex.value = Math.max(0, Math.min(rows.value.length - 1, i));
}
function onKeydown(e) {
  const i = activeIndex.value ?? lastIndex.value;
  const moves = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: lastIndex.value };
  if (!(e.key in moves)) return;
  e.preventDefault();
  usingKeyboard.value = true;
  setIndex(moves[e.key]);
}
function onPointerLeave(e) {
  if (e.pointerType === 'mouse') activeIndex.value = lastIndex.value; // touch keeps the last spot touched
}

// Draws the guide line and a dot on each path at the active year. A plugin, not DOM, so it stays glued to the canvas.
const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(c) {
    const i = activeIndex.value;
    if (i === null || i === undefined) return;
    const { ctx, chartArea } = c;
    const first = c.getDatasetMeta(0).data[i];
    if (!first) return;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const ring = themeColour('white'); // the dot's outline, so it stands out from the line
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(first.x, chartArea.top);
    ctx.lineTo(first.x, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    c.data.datasets.forEach((ds, d) => {
      const pt = c.getDatasetMeta(d).data[i];
      if (!pt || pt.skip || !Number.isFinite(pt.y)) return;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = ds.borderColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ring;
      ctx.stroke();
    });
    ctx.restore();
  },
};

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
        borderColor: pathColour('--path-bto'),
        backgroundColor: pathColour('--path-bto'),
        spanGaps: true,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 0, // the crosshair draws the dots
      },
      {
        label: 'Resale',
        data: rows.value.map((r) => r.resale),
        borderColor: pathColour('--path-resale-bar'),
        backgroundColor: pathColour('--path-resale-bar'),
        spanGaps: true,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };
}

onMounted(() => {
  activeIndex.value = lastIndex.value >= 0 ? lastIndex.value : null;
  chart = new Chart(canvas.value, {
    type: 'line',
    data: data(),
    plugins: [crosshair],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? false : { duration: 200 },
      interaction: { mode: 'index', intersect: false },
      onHover: (event, _elements, c) => {
        const hit = c.getElementsAtEventForMode(event, 'index', { intersect: false }, false);
        if (hit.length) { usingKeyboard.value = false; setIndex(hit[0].index); }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { enabled: false }, // the readout above the chart replaces it
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
  activeIndex.value = lastIndex.value >= 0 ? lastIndex.value : null;
  chart.update();
});
watch(activeIndex, () => chart?.draw());

onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div data-cy="results-cashflow-trend">
    <!-- The readout: both paths for the year under the pointer. Read aloud only while using the keyboard. -->
    <div v-if="active" class="trend-readout" data-cy="results-trend-readout" :aria-live="usingKeyboard ? 'polite' : 'off'">
      <p class="trend-readout__year mb-1">
        <strong data-cy="results-trend-year">{{ active.year }}</strong>
        <span v-if="isLast && horizonYear === active.year" class="text-caption"> (the comparison year)</span>
      </p>
      <dl class="trend-readout__values mb-1">
        <div>
          <dt><span class="dash-dot dash-dot--bto" aria-hidden="true"></span>BTO</dt>
          <dd class="text-numeric" data-cy="results-trend-bto">{{ formatMoney(active.bto) }}</dd>
        </div>
        <div>
          <dt><span class="dash-dot dash-dot--resale" aria-hidden="true"></span>Resale</dt>
          <dd class="text-numeric" data-cy="results-trend-resale">{{ formatMoney(active.resale) }}</dd>
        </div>
      </dl>
      <p v-if="leadText" class="trend-readout__lead mb-0" data-cy="results-trend-lead">{{ leadText }}</p>
    </div>

    <!-- Focusable so the arrow keys work; pan-y keeps vertical page scrolling while a finger scrubs sideways. -->
    <div
      class="dash-chart dash-chart--tall trend-stage"
      tabindex="0"
      role="group"
      aria-label="Chart of the two paths over time. Use the left and right arrow keys to move between years."
      data-cy="results-trend-stage"
      @keydown="onKeydown"
      @pointerleave="onPointerLeave"
    >
      <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
    </div>
    <p class="text-caption mt-2 mb-0 d-print-none">Hover, touch or use the arrow keys to compare any year.</p>
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

<style scoped>
.trend-readout {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--accent-fill-2);
}
.trend-readout__values { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); margin: 0; }
.trend-readout__values > div { display: flex; align-items: baseline; gap: var(--space-2); }
.trend-readout__values dt { font-weight: 400; color: var(--text-secondary); }
.trend-readout__values dd { margin: 0; font-weight: 600; }
.trend-readout__lead { font-weight: 500; }
.trend-stage { touch-action: pan-y; border-radius: var(--radius-sm); }
.trend-stage canvas { cursor: crosshair; }
.trend-stage:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>
