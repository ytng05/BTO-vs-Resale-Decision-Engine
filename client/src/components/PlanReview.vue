<script setup>
// "Check your answers": everything the four plan steps asked, on one screen, before Results. Each section has a
// Change button that goes back to its step; PlanView shows this after the last step instead of going straight to
// Results, so a typo (an extra zero on an income) is caught before it is in every figure.
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

const wishes = computed(() => (store.wishes.length
  ? store.wishes.map((k) => WISHES.find((w) => w.key === k)?.label ?? k).join(', ')
  : 'None picked'));

const buyers = computed(() => store.profile.applicants.map((a, i) => ({
  title: `Buyer ${i + 1}`,
  rows: [
    ['Age', a.age ?? '—'],
    ['Citizenship', labelOf(CITIZENSHIPS, a.citizenship)],
    ['First-timer', a.firstTimer ? 'Yes' : 'No'],
    ['Monthly income', money(a.monthlyIncome)],
    ['CPF OA balance', money(a.cpfOaBalance)],
  ],
})));

const household = computed(() => [
  ['Cash savings', money(store.profile.cashSavings)],
  ...(store.profile.constraints?.moveInByYear ? [['Move in by', String(store.profile.constraints.moveInByYear)]] : []),
]);

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
const defaultsText = computed(() => `We compare as if you apply in ${store.choiceA.applicationYear}, with flat prices growing ${pctText(store.assumptions.annualPriceGrowth)} and incomes ${pctText(store.assumptions.annualIncomeGrowth)} a year. You can change these on the Dashboard.`);

const SECTIONS = computed(() => [
  { step: 0, title: 'What matters most', rows: [['Your priorities', wishes.value]] },
  { step: 1, title: 'About you', groups: buyers.value, rows: household.value },
  { step: 2, title: 'Your BTO', rows: bto.value },
  { step: 3, title: 'Resale flat', rows: resale.value },
]);
</script>

<template>
  <div class="plan-review" data-cy="plan-review">
    <section v-for="s in SECTIONS" :key="s.step" class="plan-review__section" :aria-labelledby="`review-${s.step}`" :data-cy="`plan-review-step-${s.step + 1}`">
      <div class="plan-review__head">
        <h3 :id="`review-${s.step}`" class="plan-review__title">{{ s.title }}</h3>
        <button type="button" class="btn btn-link btn-sm p-0" :data-cy="`plan-review-change-${s.step + 1}`" @click="emit('edit', s.step)">
          Change<span class="visually-hidden"> {{ s.title }}</span>
        </button>
      </div>
      <div v-if="s.groups" class="plan-review__groups">
        <div v-for="g in s.groups" :key="g.title">
          <h4 class="plan-review__group-title">{{ g.title }}</h4>
          <dl class="plan-review__list">
            <div v-for="[k, v] in g.rows" :key="k" class="plan-review__row"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
          </dl>
        </div>
      </div>
      <dl class="plan-review__list">
        <div v-for="[k, v] in s.rows" :key="k" class="plan-review__row"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
      </dl>
    </section>
    <p class="plan-review__defaults small text-secondary mb-0" data-cy="plan-review-defaults">{{ defaultsText }}</p>
  </div>
</template>

<style scoped>
.plan-review { display: flex; flex-direction: column; gap: var(--space-4); }
.plan-review__section { padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.plan-review__section:last-child { border-bottom: 0; padding-bottom: 0; }
.plan-review__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
.plan-review__title { margin: 0; font-size: 1rem; font-weight: 600; }
.plan-review__groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: var(--space-3); margin-bottom: var(--space-2); }
.plan-review__group-title { margin: 0 0 var(--space-1); font-size: 0.875rem; font-weight: 600; }
.plan-review__list { margin: 0; }
.plan-review__row { display: flex; justify-content: space-between; gap: var(--space-3); padding: 2px 0; font-size: 0.9375rem; }
.plan-review__row dt { font-weight: 400; color: var(--text-secondary); }
.plan-review__row dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
</style>
