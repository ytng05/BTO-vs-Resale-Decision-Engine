<script setup>
// One path's Outcome (server/src/engine/evaluate.contract.js): net financial position at the
// horizon (D1 — no sale), grants, CPF owed back with accrued interest, any subsidy clawback, and
// the eligibility reasons. Wording follows the guardrails: "net financial position at the horizon",
// never "profit", never "on sale" (v2 measures everything at horizonYear, there is no sale).
// All Outcome money fields are integer cents (the contract); this component is the one place
// that converts to dollars, right before formatMoney().
// Layout (Calm, UI.md §8): the path is named with a dot AND its title (colour is never the only signal),
// the net position is the big figure, the totals sit in a short list, and the grants are listed
// once each with a single status (EligibilityList).
import Term from './Term.vue';
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';
import EligibilityList from './EligibilityList.vue';

const props = defineProps({
  title: { type: String, required: true }, // e.g. 'Path A: BTO'
  subtitle: { type: String, default: '' }, // e.g. 'Tampines, 4-room, Standard, from 2027'
  outcome: { type: Object, required: true },
  horizonYear: { type: Number, default: null },
  cyPrefix: { type: String, required: true }, // 'results-patha' / 'results-pathb'
  tone: { type: String, default: 'bto' }, // 'bto' (ink) | 'resale' (pink): matches the charts and the Dashboard
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : cents);

const cpfOwedTotalCents = computed(
  () => (props.outcome.cpfRefundPrincipalCents ?? 0) + (props.outcome.cpfAccruedInterestCents ?? 0),
);

// Flattened for EligibilityList, which groups the tests back under their grant.
// sourceUrl is kept so the UI can link each reason to its official source.
const eligibilityItems = computed(() =>
  (props.outcome.grants ?? []).flatMap((g) =>
    (g.tests ?? []).map((t) => ({ grant: g.id, passed: t.passed, reason: t.reason, sourceUrl: t.sourceUrl })),
  ),
);

// What each grant pays out (cents), so a grant's status says whether it applies, as on the Dashboard.
const grantAmounts = computed(() =>
  Object.fromEntries((props.outcome.grants ?? []).map((g) => [g.id, g.amountCents ?? 0])),
);
</script>

<template>
  <div class="card h-100" :class="`dash-card--${tone}`" :data-cy="`${cyPrefix}-card`">
    <div class="card-body">
      <h2 class="h5 mb-1"><span class="dash-dot" :class="`dash-dot--${tone}`" aria-hidden="true"></span>{{ title }}</h2>
      <p v-if="subtitle" class="text-secondary small mb-3">{{ subtitle }}</p>

      <p class="text-secondary small mb-0">
        Net financial position<template v-if="horizonYear"> at {{ horizonYear }}</template>
      </p>
      <p class="path-net text-numeric mb-4" :data-cy="`${cyPrefix}-net-position`">{{ formatMoney(dollars(outcome.netPositionCents)) }}</p>

      <dl class="path-list mb-4">
        <div>
          <dt>Total grants</dt>
          <dd class="text-numeric" :data-cy="`${cyPrefix}-grants-total`">{{ formatMoney(dollars(outcome.totalGrantsCents)) }}</dd>
        </div>
        <div :data-cy="`${cyPrefix}-cpf-refund`">
          <dt>CPF owed back at the horizon, with accrued interest</dt>
          <dd class="text-numeric">{{ formatMoney(dollars(cpfOwedTotalCents)) }}</dd>
        </div>
        <div v-if="outcome.clawbackCents > 0" :data-cy="`${cyPrefix}-clawback`">
          <dt><Term id="clawback">Subsidy clawback</Term> at the horizon</dt>
          <dd class="text-numeric">{{ formatMoney(dollars(outcome.clawbackCents)) }}</dd>
        </div>
      </dl>

      <h3 class="path-subhead">Grants and why</h3>
      <EligibilityList :items="eligibilityItems" :amounts="grantAmounts" :cy-prefix="cyPrefix" />
    </div>
  </div>
</template>

<style scoped>
.path-net {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 2.25rem;
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.path-list > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.875rem;
}
.path-list dt { font-weight: 400; color: var(--text-secondary); }
.path-list dd { margin: 0; text-align: right; font-weight: 500; white-space: nowrap; }
.path-subhead {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
}
</style>
