<script setup>
// One path's Outcome (server/src/engine/evaluate.contract.js): net position after N years,
// grants, CPF refund with accrued interest, any subsidy clawback, and the eligibility reasons.
// Wording follows the guardrails: "net financial position after N years", never "profit".
// All Outcome money fields are integer cents (the contract); this component is the one place
// that converts to dollars, right before formatMoney().
import { computed } from 'vue';
import { formatMoney } from '../utils/format.js';
import EligibilityList from './EligibilityList.vue';

const props = defineProps({
  title: { type: String, required: true }, // e.g. 'Path A: BTO'
  subtitle: { type: String, default: '' }, // e.g. 'Tampines, 4-room, Standard, from 2027'
  outcome: { type: Object, required: true },
  horizonYears: { type: Number, default: null },
  cyPrefix: { type: String, required: true }, // 'results-patha' / 'results-pathb'
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : cents);

const grantCents = (id) => props.outcome.grants?.find((g) => g.id === id)?.amountCents ?? 0;

const cpfRefundTotalCents = computed(
  () => (props.outcome.cpfRefundPrincipalCents ?? 0) + (props.outcome.cpfAccruedInterestCents ?? 0),
);

// Flattened for EligibilityList, which renders one line per test regardless of which grant it's under.
const eligibilityItems = computed(() =>
  (props.outcome.grants ?? []).flatMap((g) =>
    (g.tests ?? []).map((t) => ({ grant: g.id, passed: t.passed, reason: t.reason })),
  ),
);
</script>

<template>
  <div class="card h-100" :data-cy="`${cyPrefix}-card`">
    <div class="card-body">
      <h2 class="h5">{{ title }}</h2>
      <p v-if="subtitle" class="text-secondary">{{ subtitle }}</p>

      <table class="table table-sm mb-4">
        <tbody>
          <tr>
            <th scope="row" class="fw-normal">
              Net financial position<template v-if="horizonYears"> after {{ horizonYears }} years</template>
            </th>
            <td class="text-end fw-semibold" :data-cy="`${cyPrefix}-net-position`">
              {{ formatMoney(dollars(outcome.netPositionCents)) }}
            </td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">Enhanced CPF Housing Grant</th>
            <td class="text-end">{{ formatMoney(dollars(grantCents('EHG'))) }}</td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">CPF Housing Grant (Family)</th>
            <td class="text-end">{{ formatMoney(dollars(grantCents('FAMILY'))) }}</td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">Proximity Housing Grant</th>
            <td class="text-end">{{ formatMoney(dollars(grantCents('PHG'))) }}</td>
          </tr>
          <tr>
            <th scope="row">Total grants</th>
            <td class="text-end fw-semibold" :data-cy="`${cyPrefix}-grants-total`">
              {{ formatMoney(dollars(outcome.totalGrantsCents)) }}
            </td>
          </tr>
          <tr :data-cy="`${cyPrefix}-cpf-refund`">
            <th scope="row" class="fw-normal">CPF refunded on sale, with accrued interest</th>
            <td class="text-end">{{ formatMoney(dollars(cpfRefundTotalCents)) }}</td>
          </tr>
          <tr v-if="outcome.clawbackCents > 0" :data-cy="`${cyPrefix}-clawback`">
            <th scope="row" class="fw-normal">Subsidy clawback on sale</th>
            <td class="text-end">{{ formatMoney(dollars(outcome.clawbackCents)) }}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="h6">Grant eligibility</h3>
      <EligibilityList :items="eligibilityItems" :cy-prefix="cyPrefix" />
    </div>
  </div>
</template>