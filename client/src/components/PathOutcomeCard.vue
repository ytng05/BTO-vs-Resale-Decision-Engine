<script setup>
// One path's Outcome (server/src/engine/evaluate.contract.js): net financial position at the horizon (D1, no sale),
// shown as "net position" with its definition and a short gloss, how it adds up (flat value, loan, CPF to put back, clawback, cash spent), the grants, and the eligibility
// reasons. Wording follows the guardrails: "net financial position at the horizon",
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
  ahead: { type: Boolean, default: false }, // true on the path with the higher net position: outlined and tagged in words
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : cents);

// How the big figure adds up (D1): flat value − loan − CPF savings to put back (with interest) − clawback − cash
// spent. These are the contract's own parts of netPositionCents, so they always sum to it. The CPF line is the
// savings refund only: grants are not a debt (D1), unlike the deprecated cpfRefundPrincipalCents totals.
const cpfToPutBackCents = computed(
  () => (props.outcome.cpfSavingsRefundPrincipalCents ?? 0) + (props.outcome.cpfSavingsAccruedInterestCents ?? 0),
);
const breakdown = computed(() => {
  const o = props.outcome;
  if (typeof o.marketValueAtHorizonCents !== 'number') return [];
  return [
    { id: 'value', label: "The flat's value", cents: o.marketValueAtHorizonCents, sign: '' },
    { id: 'loan', label: 'Loan still owed', cents: o.outstandingLoanAtHorizonCents, sign: '−' },
    { id: 'cpf-refund', label: 'CPF to put back, with interest', term: 'accrued-interest', cents: cpfToPutBackCents.value, sign: '−' },
    ...(o.clawbackCents > 0 ? [{ id: 'clawback', label: 'Subsidy clawback', term: 'clawback', cents: o.clawbackCents, sign: '−' }] : []),
    { id: 'cash', label: 'Cash spent on the flat and rent', cents: o.housingCashSpentCents, sign: '−' },
  ];
});

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
  <div class="card h-100" :class="[`dash-card--${tone}`, { 'compare-card--winner': ahead }]" :data-cy="`${cyPrefix}-card`">
    <div class="card-body">
      <h2 class="h5 mb-1 d-flex flex-wrap align-items-center gap-2">
        <span><span class="dash-dot" :class="`dash-dot--${tone}`" aria-hidden="true"></span>{{ title }}</span>
        <span v-if="ahead" class="path-ahead" :data-cy="`${cyPrefix}-ahead-tag`">Ahead<template v-if="horizonYear"> in {{ horizonYear }}</template></span>
      </h2>
      <p v-if="subtitle" class="text-secondary small mb-3">{{ subtitle }}</p>

      <p class="text-secondary small mb-0">
        <Term id="net-position">Net position</Term><template v-if="horizonYear"> in {{ horizonYear }}</template>:
        what this path leaves you with, after costs
      </p>
      <p class="path-net text-numeric mb-3" :data-cy="`${cyPrefix}-net-position`">{{ formatMoney(dollars(outcome.netPositionCents)) }}</p>

      <!-- The same parts, and the same order, as the Dashboard's "How the net position adds up". -->
      <dl v-if="breakdown.length" class="path-list mb-2" :data-cy="`${cyPrefix}-breakdown`">
        <div v-for="b in breakdown" :key="b.id" :data-cy="`${cyPrefix}-${b.id}`">
          <dt><Term v-if="b.term" :id="b.term">{{ b.label }}</Term><template v-else>{{ b.label }}</template></dt>
          <dd class="text-numeric">{{ b.sign }}{{ formatMoney(dollars(b.cents)) }}</dd>
        </div>
        <div class="path-list__total">
          <dt>Net position<template v-if="horizonYear"> in {{ horizonYear }}</template></dt>
          <dd class="text-numeric">{{ formatMoney(dollars(outcome.netPositionCents)) }}</dd>
        </div>
      </dl>
      <p class="text-secondary small mb-4" :data-cy="`${cyPrefix}-grants-total`">
        Grants of {{ formatMoney(dollars(outcome.totalGrantsCents)) }} are already in these figures: they lowered the loan
        and the cash you paid.
      </p>

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
.path-list__total { border-top: 1px solid var(--text-primary) !important; }
.path-list__total dt { color: var(--text-primary); font-weight: 500; }
.path-list dd { margin: 0; text-align: right; font-weight: 500; white-space: nowrap; }
.path-ahead {
  padding: 0 0.625rem;
  border-radius: var(--radius-pill);
  background: var(--success-fill);
  color: var(--success);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.path-subhead {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
}
</style>

