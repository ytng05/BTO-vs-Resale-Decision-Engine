<script setup>
// One saved scenario on the compare page: name, save date, ruleset badge, both paths' net position
// with the higher one flagged "Ahead", and a button to reopen it on /results.
// Styles: Bootstrap .card plus .compare-* in styles/_components.scss.
//
// Expects the compare shape produced by toCompareScenario() in api/scenarioCompare.js:
//   { id, name, savedAt, horizonYear, rulesetVersion,
//     pathA: { label, netPosition, reason?, loanShortfall?, cashShortfall? }, pathB: { ...same } }
// Money is in DOLLARS. netPosition is null only together with reason NO_RESULT
// (nothing saved, a mock result, or an older contract shape).
// evaluate() always returns a net position, so shortfalls never hide the figure; they add a note:
//   loanShortfall  the loan is over the limit (dollars short)
//   cashShortfall  cash plus retained OA can't cover the payment at purchase
//                  (CASH_SHORTFALL_AT_PURCHASE): dollars short if known, or true
import { computed } from 'vue';
import { aheadPathKey, PATH_KEYS, PATH_NAMES } from '../utils/scenarioCompare.js';
import { formatDate, formatMoney } from '../utils/format.js';

const props = defineProps({
  scenario: { type: Object, required: true },
  letter: { type: String, required: true }, // 'A' or 'B'
  isWinner: { type: Boolean, default: false },
  opening: { type: Boolean, default: false },
});
const emit = defineEmits(['open']);

const ahead = computed(() => aheadPathKey(props.scenario));

function cashNote(cashShortfall) {
  if (typeof cashShortfall === 'number') return `Not enough cash at purchase, short by ${formatMoney(cashShortfall)}`;
  if (cashShortfall === true) return 'Not enough cash at purchase';
  return null;
}

const rows = computed(() =>
  PATH_KEYS.map((key) => {
    const path = props.scenario[key] || {};
    const hasValue = typeof path.netPosition === 'number';
    return {
      key,
      title: `${PATH_NAMES[key]}: ${path.label ?? '—'}`,
      value: hasValue ? formatMoney(path.netPosition) : 'No result saved',
      hasValue,
      // A capped loan or a cash shortfall still has a real figure (evaluate() only warns),
      // so the figure is shown with a note.
      loanNote: typeof path.loanShortfall === 'number'
        ? `Loan over the limit, short by ${formatMoney(path.loanShortfall)}`
        : null,
      cashNote: cashNote(path.cashShortfall),
      isAhead: ahead.value === key,
    };
  }),
);
</script>

<template>
  <article
    class="card h-100"
    :class="{ 'compare-card--winner': isWinner }"
    :data-cy="`compare-card-${letter.toLowerCase()}`"
  >
    <div class="card-body d-flex flex-column">
      <p class="text-caption text-uppercase fw-semibold mb-1">Scenario {{ letter }}</p>
      <h2 class="h4 mb-2" data-cy="compare-card-name">{{ scenario.name }}</h2>
      <p class="d-flex flex-wrap align-items-center gap-2 mb-3" data-cy="compare-card-meta">
        <span class="text-caption">
          Saved {{ formatDate(scenario.savedAt) }} · Horizon {{ scenario.horizonYear ?? '—' }}
        </span>
        <span class="badge-version" data-cy="compare-card-ruleset-badge">
          Ruleset {{ scenario.rulesetVersion ?? '—' }}
        </span>
      </p>

      <ul class="list-unstyled mb-3">
        <li
          v-for="row in rows"
          :key="row.key"
          class="compare-path"
          :class="{ 'compare-path--ahead': row.isAhead }"
          :data-cy="`compare-path-${row.key}`"
        >
          <span class="d-flex flex-wrap align-items-center gap-2">
            {{ row.title }}
            <span v-if="row.isAhead" class="badge-status--success" data-cy="compare-ahead-badge">
              Ahead
            </span>
          </span>
          <span class="compare-path__value" :class="{ 'text-secondary': !row.hasValue }">{{ row.value }}</span>
          <span v-if="row.loanNote" class="text-caption text-secondary d-block" data-cy="compare-loan-shortfall">
            {{ row.loanNote }}
          </span>
          <span v-if="row.cashNote" class="text-caption text-secondary d-block" data-cy="compare-cash-shortfall">
            {{ row.cashNote }}
          </span>
        </li>
      </ul>

      <p v-if="ahead === 'tie'" class="text-caption mb-3" data-cy="compare-card-tie">
        Both paths end level.
      </p>

      <button
        type="button"
        class="btn btn-outline-secondary mt-auto"
        :disabled="opening"
        data-cy="compare-open-results-button"
        @click="emit('open', scenario)"
      >
        {{ opening ? 'Opening…' : 'Open full results' }}
      </button>
    </div>
  </article>
</template>