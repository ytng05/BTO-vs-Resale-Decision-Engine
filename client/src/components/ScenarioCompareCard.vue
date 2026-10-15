<script setup>
// One saved scenario on the compare page: name, save date, ruleset,
// both paths' net position with the higher one flagged "Ahead",
// and a button to reopen it on /results.
import { computed } from 'vue'
import { aheadPathKey, formatSGD, formatSavedDate, PATH_KEYS, PATH_NAMES } from '../utils/scenarioCompare'

const props = defineProps({
  scenario: { type: Object, required: true },
  letter: { type: String, required: true }, // 'A' or 'B'
  isWinner: { type: Boolean, default: false },
  opening: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const ahead = computed(() => aheadPathKey(props.scenario))

const rows = computed(() =>
  PATH_KEYS.map((key) => {
    const path = props.scenario[key] || {}
    const hasValue = typeof path.netPosition === 'number'
    return {
      key,
      title: `${PATH_NAMES[key]}: ${path.label ?? '—'}`,
      value: hasValue ? formatSGD(path.netPosition) : 'Not fundable',
      hasValue,
      isAhead: ahead.value === key,
    }
  }),
)
</script>

<template>
  <article
    class="card h-100 compare-card"
    :class="{ 'compare-card--winner': isWinner }"
    :data-cy="`compare-card-${letter.toLowerCase()}`"
  >
    <div class="card-body d-flex flex-column">
      <p class="text-uppercase small fw-semibold text-muted mb-1">Scenario {{ letter }}</p>
      <h2 class="h5 mb-1" data-cy="compare-card-name">{{ scenario.name }}</h2>
      <p class="small text-muted mb-3" data-cy="compare-card-meta">
        Saved {{ formatSavedDate(scenario.savedAt) }} · Ruleset {{ scenario.rulesetVersion }} ·
        Horizon {{ scenario.horizonYear }}
      </p>

      <ul class="list-unstyled mb-3">
        <li
          v-for="row in rows"
          :key="row.key"
          class="compare-path d-flex justify-content-between align-items-center"
          :class="{ 'compare-path--ahead': row.isAhead }"
          :data-cy="`compare-path-${row.key}`"
        >
          <span>
            {{ row.title }}
            <span v-if="row.isAhead" class="badge bg-success ms-2" data-cy="compare-ahead-badge">Ahead</span>
          </span>
          <span class="fw-semibold" :class="{ 'text-muted': !row.hasValue }">{{ row.value }}</span>
        </li>
      </ul>

      <p v-if="ahead === 'tie'" class="small text-muted mb-3" data-cy="compare-card-tie">
        Both paths end level.
      </p>

      <button
        type="button"
        class="btn btn-outline-primary mt-auto"
        :disabled="opening"
        data-cy="compare-open-results"
        @click="emit('open', scenario)"
      >
        {{ opening ? 'Opening…' : 'Open full results' }}
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
// TODO(Kaashvi)
.compare-card--winner {
  border-color: var(--bs-primary);
  border-width: 2px;
}
.compare-path {
  padding: 0.6rem 0.75rem;
  border-radius: 0.375rem;
  gap: 0.75rem;
}
.compare-path + .compare-path {
  margin-top: 0.25rem;
}
.compare-path--ahead {
  background: var(--bs-success-bg-subtle);
}
</style>