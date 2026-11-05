<script setup>
// The Dashboard's warnings, below the summary: a red banner for a warning that overturns the answer (the household
// is above HDB's new-flat income ceiling, so it couldn't buy this BTO that year, D36), then "Before you trust these
// numbers": the rest, one per code, merged across paths. Warnings already said in a card are left out
// (groupWarnings in utils/dashboardSummary.js). Keeps the tested hook dashboard-warnings on the notes list.
import { computed } from 'vue';

const props = defineProps({
  blocking: { type: Array, default: () => [] },
  notes: { type: Array, default: () => [] },
  applicationYear: { type: Number, default: null },
});
const emit = defineEmits(['jump-whatif']);
const year = computed(() => (props.applicationYear ? ` in ${props.applicationYear}` : ''));
const summary = computed(() => props.notes.map((n) => n.label).join(' · '));
</script>

<template>
  <div v-if="blocking.length || notes.length" class="dash-notes">
    <section v-if="blocking.length" id="dashboard-critical" class="dash-critical" role="alert" tabindex="-1" data-cy="dashboard-critical">
      <span class="dash-critical__icon" aria-hidden="true">!</span>
      <div class="dash-critical__body">
        <h2 class="dash-critical__title">You couldn't buy this BTO{{ year }}: your income is above HDB's new-flat ceiling</h2>
        <p v-for="b in blocking" :key="b.code" class="mb-0">{{ b.text }} The BTO figures on this page show what it would look like if you could.</p>
        <div class="dash-critical__links">
          <button type="button" class="btn btn-link p-0 fw-semibold" data-cy="dashboard-critical-whatif" @click="emit('jump-whatif')">Try a later year in What if ›</button>
          <RouterLink to="/sources#income-eligibility" class="fw-semibold" data-cy="dashboard-critical-sources">See the ceiling on Sources ›</RouterLink>
        </div>
      </div>
    </section>

    <details v-if="notes.length" class="dash-trust" open>
      <summary class="dash-trust__summary">
        <span>
          <strong>Before you trust these numbers, please note:</strong>
          <small>{{ summary }}</small>
        </span>
        <svg class="dash-trust__chevron" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </summary>
      <ul class="dash-trust__list list-unstyled mb-0" data-cy="dashboard-warnings">
        <li v-for="n in notes" :key="n.code" :data-cy="`dashboard-note-${n.code}`">
          <span class="dash-trust__tag">{{ n.label }}</span>
          <span>{{ n.text }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.dash-notes { display: flex; flex-direction: column; gap: var(--space-4); }
.dash-critical { display: flex; gap: var(--space-4); align-items: flex-start; padding: var(--space-5) clamp(20px, 3vw, 28px); border-radius: var(--radius-md); background: var(--danger-fill); border: 1.5px solid var(--danger-border); }
.dash-critical:focus { outline: 2px solid var(--danger); outline-offset: 2px; }
.dash-critical__icon { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--danger); color: var(--on-primary); font-weight: 700; font-size: 1.25rem; }
.dash-critical__body { display: flex; flex-direction: column; gap: var(--space-2); color: var(--text-secondary); }
.dash-critical__title { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--danger-strong); }
.dash-critical__links { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.dash-trust { border-radius: var(--radius-md); background: var(--bg-surface); box-shadow: var(--shadow-sm); }
.dash-trust__summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) clamp(20px, 3vw, 28px); cursor: pointer; list-style: none; }
.dash-trust__summary::-webkit-details-marker { display: none; }
.dash-trust__summary strong { display: block; font-size: 1.0625rem; font-weight: 600; }
.dash-trust__summary small { display: block; color: var(--text-secondary); font-size: 0.875rem; }
.dash-trust__summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: var(--radius-md); }
.dash-trust__chevron { flex: none; transition: transform var(--duration-base) var(--ease-out); }
.dash-trust[open] .dash-trust__chevron { transform: rotate(180deg); }
.dash-trust__list { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 clamp(20px, 3vw, 28px) var(--space-5); }
.dash-trust__list li { display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--bg-page); color: var(--text-secondary); font-size: 0.9375rem; }
.dash-trust__tag { flex: none; padding: 0.125rem 0.625rem; border-radius: var(--radius-pill); background: var(--dash-bto-tint); color: var(--dash-bto); font-size: 0.8125rem; font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .dash-trust__chevron { transition: none; } }
</style>