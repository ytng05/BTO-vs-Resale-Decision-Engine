<script setup>
// One saved scenario on the compare page: name, save date, ruleset badge, both paths' net position
// with the higher one flagged "Ahead", and a button to reopen it on /results.
// Styles: Bootstrap .card plus .compare-* in styles/_components.scss.
import { computed } from 'vue';
import { aheadPathKey, formatSGD, PATH_KEYS, PATH_NAMES } from '../utils/scenarioCompare.js';
import { formatDate } from '../utils/format.js';

const props = defineProps({
  scenario: { type: Object, required: true },
  letter: { type: String, required: true }, // 'A' or 'B'
  isWinner: { type: Boolean, default: false },
  opening: { type: Boolean, default: false },
});
const emit = defineEmits(['open']);

const ahead = computed(() => aheadPathKey(props.scenario));

const rows = computed(() =>
  PATH_KEYS.map((key) => {
    const path = props.scenario[key] || {};
    const hasValue = typeof path.netPosition === 'number';
    return {
      key,
      title: `${PATH_NAMES[key]}: ${path.label ?? '—'}`,
      value: hasValue ? formatSGD(path.netPosition) : 'Not fundable',
      hasValue,
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
          Saved {{ formatDate(scenario.savedAt) }} · Horizon {{ scenario.horizonYear }}
        </span>
        <span class="badge-version" data-cy="compare-card-ruleset-badge">
          Ruleset {{ scenario.rulesetVersion }}
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