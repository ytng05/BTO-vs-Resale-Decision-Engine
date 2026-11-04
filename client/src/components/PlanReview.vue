<script setup>
// "Check your answers": everything the four plan steps asked, on one screen, before Results. Each section is a card
// with an Edit button that goes back to its step. Shown on /preview (#110), which every plan passes through after the
// last question, so a typo (an extra zero on an income) is caught before it is in every figure.
// Layout: What matters and About you full width; Your BTO and Resale flat side by side (stacked on phones).
import { computed } from 'vue';
import { useScenarioStore, WISHES } from '../stores/scenario.js';
import { CITIZENSHIPS, FLAT_TYPES, LEASE_BANDS, LIVING_ARRANGEMENTS, toTitleCase } from '../constants/planOptions.js';
import { formatMoney } from '../utils/format.js';

const props = defineProps({
  // The BTO launch the plan estimates from (PathForm resolves it on "Your BTO"), for its name.
  btoProject: { type: Object, default: null },
});
const emit = defineEmits(['edit']);

const store = useScenarioStore();

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? '—';
const money = (n) => (typeof n === 'number' ? formatMoney(n) : '—');
const town = (t) => (t ? toTitleCase(t) : '—');

// Step 1: the priorities, as chips.
const wishes = computed(() => store.wishes.map((k) => WISHES.find((w) => w.key === k)?.label ?? k));

// Step 2: one mini card per buyer, then the household totals (what grants and loans actually look at).
const buyers = computed(() => store.profile.applicants.map((a, i) => ({
  title: i === 0 ? 'You' : 'The other buyer', // as the About you questions say
  initial: i === 0 ? 'Y' : 'O',
  rows: [
    ['Age', a.age ?? '—'],
    ['Citizenship', labelOf(CITIZENSHIPS, a.citizenship)],
    ['First-timer', a.firstTimer ? 'Yes' : 'No'],
    ['Monthly income', money(a.monthlyIncome)],
    ['CPF OA balance', money(a.cpfOaBalance)],
  ],
})));

const sum = (key) => {
  const list = store.profile.applicants.map((a) => a[key]).filter((n) => typeof n === 'number');
  return list.length ? list.reduce((x, y) => x + y, 0) : null;
};
const totals = computed(() => [
  ['Income together', sum('monthlyIncome') === null ? '—' : `${money(sum('monthlyIncome'))} a month`],
  ['CPF OA together', money(sum('cpfOaBalance'))],
  ['Cash savings', money(store.profile.cashSavings)],
  ...(store.profile.constraints?.moveInByYear ? [['Move in by', String(store.profile.constraints.moveInByYear)]] : []),
]);

// Steps 3 and 4: the two paths.
const bto = computed(() => [
  ['Town', town(store.choiceA.town)],
  ...(props.btoProject?.name ? [['Launch', props.btoProject.name]] : []),
  ['Flat type', labelOf(FLAT_TYPES, store.choiceA.flatType)],
]);

const resale = computed(() => [
  ['Town', town(store.choiceB.town)],
  ['Flat type', labelOf(FLAT_TYPES, store.choiceB.flatType)],
  ['Remaining lease', labelOf(LEASE_BANDS, store.choiceB.leaseBand)],
  ['Asking price', typeof store.choiceB.resalePrice === 'number' ? money(store.choiceB.resalePrice) : 'Not given: the median of recent sales'],
  // Shown whenever the question was asked (picked in step 1), including "Neither", or set some other way.
  ...(store.wishes.includes('parents') || (store.choiceB.livingArrangement && store.choiceB.livingArrangement !== 'NONE')
    ? [['Your parents', labelOf(LIVING_ARRANGEMENTS, store.choiceB.livingArrangement)]]
    : []),
]);

// The assumptions not asked in the stepper (D38), said once before Results so nothing is hidden.
const pctText = (f) => `${Math.round((f ?? 0) * 1000) / 10}%`;
const assumptions = computed(() => [
  `Apply in ${store.choiceA.applicationYear}`,
  `Prices +${pctText(store.assumptions.annualPriceGrowth)} a year`,
  `Incomes +${pctText(store.assumptions.annualIncomeGrowth)} a year`,
]);
</script>

<template>
  <div class="plan-review" data-cy="plan-review">
    <div class="row g-3">
      <!-- 1 What matters -->
      <div class="col-12">
        <section class="review-card" aria-labelledby="review-0" data-cy="plan-review-step-1">
          <div class="review-card__head">
            <span class="review-card__num" aria-hidden="true">1</span>
            <h3 id="review-0" class="review-card__title">What matters most</h3>
            <button type="button" class="review-card__edit" data-cy="plan-review-change-1" @click="emit('edit', 0)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
              Edit<span class="visually-hidden"> What matters most</span>
            </button>
          </div>
          <div v-if="wishes.length" class="review-chips">
            <span v-for="w in wishes" :key="w" class="review-chip">{{ w }}</span>
          </div>
          <p v-else class="review-empty">
            None picked yet. That's fine: this step is optional.
            <button type="button" class="btn btn-link p-0 align-baseline" @click="emit('edit', 0)">Add priorities</button>
          </p>
        </section>
      </div>

      <!-- 2 About you -->
      <div class="col-12">
        <section class="review-card" aria-labelledby="review-1" data-cy="plan-review-step-2">
          <div class="review-card__head">
            <span class="review-card__num" aria-hidden="true">2</span>
            <h3 id="review-1" class="review-card__title">About you</h3>
            <button type="button" class="review-card__edit" data-cy="plan-review-change-2" @click="emit('edit', 1)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
              Edit<span class="visually-hidden"> About you</span>
            </button>
          </div>
          <div class="row g-3">
            <div v-for="b in buyers" :key="b.title" class="col-12 col-md-6">
              <div class="review-buyer">
                <div class="review-buyer__head">
                  <span class="review-buyer__avatar" aria-hidden="true">{{ b.initial }}</span>
                  <h4 class="review-buyer__title">{{ b.title }}</h4>
                </div>
                <dl class="review-list">
                  <div v-for="[k, v] in b.rows" :key="k" class="review-row"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
                </dl>
              </div>
            </div>
          </div>
          <dl class="review-totals">
            <div v-for="[k, v] in totals" :key="k" class="review-total"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
          </dl>
        </section>
      </div>

      <!-- 3 Your BTO and 4 Resale flat, side by side with a "vs" between them -->
      <div class="col-12">
        <div class="row g-3 review-paths">
          <div class="col-12 col-md-6">
            <section class="review-card review-card--bto" aria-labelledby="review-2" data-cy="plan-review-step-3">
              <div class="review-card__head">
                <span class="review-card__num" aria-hidden="true">3</span>
                <h3 id="review-2" class="review-card__title">Your BTO</h3>
                <button type="button" class="review-card__edit" data-cy="plan-review-change-3" @click="emit('edit', 2)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
                  Edit<span class="visually-hidden"> Your BTO</span>
                </button>
              </div>
              <dl class="review-list">
                <div v-for="[k, v] in bto" :key="k" class="review-row"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
              </dl>
            </section>
          </div>
          <div class="col-12 col-md-6">
            <section class="review-card review-card--resale" aria-labelledby="review-3" data-cy="plan-review-step-4">
              <div class="review-card__head">
                <span class="review-card__num" aria-hidden="true">4</span>
                <h3 id="review-3" class="review-card__title">Resale flat</h3>
                <button type="button" class="review-card__edit" data-cy="plan-review-change-4" @click="emit('edit', 3)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
                  Edit<span class="visually-hidden"> Resale flat</span>
                </button>
              </div>
              <dl class="review-list">
                <div v-for="[k, v] in resale" :key="k" class="review-row"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
              </dl>
            </section>
          </div>
          <span class="review-vs" aria-hidden="true">vs</span>
        </div>
      </div>
    </div>

    <!-- The assumptions, as chips -->
    <div class="review-defaults" data-cy="plan-review-defaults">
      <span class="review-defaults__label">We assume</span>
      <span v-for="a in assumptions" :key="a" class="review-chip review-chip--plain">{{ a }}</span>
      <span class="review-defaults__note">You can change these on the Dashboard.</span>
    </div>
  </div>
</template>

<style scoped>
.plan-review { display: flex; flex-direction: column; gap: var(--space-5); }

/* ---- cards ---- */
.review-card {
  height: 100%;
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.review-card:hover { border-color: var(--accent-fill-1); box-shadow: 0 10px 28px rgba(240, 138, 182, 0.18); }
.review-card--bto { background: var(--indigo-tint); }
.review-card--resale { background: var(--accent-tint); }

.review-card__head { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.review-card__num { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--accent-fill-2); display: grid; place-items: center; font-size: 14px; font-weight: 600; }
.review-card--bto .review-card__num { background: var(--indigo-tint-strong); color: var(--indigo); }
.review-card__title { margin: 0; font-size: 18px; font-weight: 600; }
.review-card--bto .review-card__title { color: var(--indigo); }
.review-card--resale .review-card__title { color: var(--color-berry); }

/* Edit button: a small pill with a pencil, pink on hover. */
.review-card__edit {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.review-card__edit svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.review-card__edit:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); color: var(--color-berry); }
.review-card__edit:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

/* ---- rows ---- */
.review-list { margin: 0; }
.review-row { display: flex; justify-content: space-between; gap: var(--space-3); padding: 6px 0; font-size: 15px; }
.review-row + .review-row { border-top: 1px solid var(--border-subtle); }
.review-row dt { font-weight: 400; color: var(--text-secondary); }
.review-row dd { margin: 0; text-align: right; font-weight: 500; font-variant-numeric: tabular-nums; }

/* ---- step 1 ---- */
.review-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.review-chip { padding: 6px 14px; border-radius: var(--radius-pill); background: var(--accent-tint); color: var(--color-berry); font-size: 14px; font-weight: 500; }
.review-empty { margin: 0; color: var(--text-secondary); }

/* ---- step 2 ---- */
.review-buyer { height: 100%; padding: var(--space-4); border-radius: var(--radius-sm); background: var(--bg-page); }
.review-buyer__head { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.review-buyer__avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-surface); display: grid; place-items: center; font-size: 13px; font-weight: 600; }
.review-buyer__title { margin: 0; font-size: 15px; font-weight: 600; }
/* Household totals: one highlighted strip under the two buyers. */
.review-totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--accent-tint);
}
.review-total dt { font-size: 13px; font-weight: 400; color: var(--text-secondary); }
.review-total dd { margin: 0; font-size: 18px; font-weight: 600; color: var(--color-berry); font-variant-numeric: tabular-nums; }

/* ---- steps 3 and 4: "vs" badge between the two cards (side by side only) ---- */
.review-paths { position: relative; }
.review-vs { display: none; }
@media (min-width: 768px) {
  .review-vs {
    display: grid;
    place-items: center;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    margin: -12px 0 0 -20px; /* -12px allows for the row's gutter at the top */
    border-radius: 50%;
    background: var(--text-primary);
    color: var(--on-primary);
    font-size: 13px;
    font-weight: 600;
  }
}

/* ---- assumptions ---- */
.review-defaults { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.review-defaults__label { font-size: 14px; color: var(--text-secondary); margin-right: var(--space-1); }
.review-chip--plain { background: var(--bg-page); color: var(--text-primary); }
.review-defaults__note { flex-basis: 100%; font-size: 13px; color: var(--text-secondary); }

@media (prefers-reduced-motion: reduce) {
  .review-card, .review-card__edit { transition: none; }
}
</style>