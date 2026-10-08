<script setup>
// One path's Outcome (server/src/engine/types.js): net financial position after N years,
// grants, CPF refund with accrued interest, any subsidy clawback, and the eligibility reasons.
// Wording follows the guardrails: "net financial position after N years", never "profit".
import { formatMoney } from '../utils/format.js';
import EligibilityList from './EligibilityList.vue';

defineProps({
  title: { type: String, required: true }, // e.g. 'Path A: BTO'
  subtitle: { type: String, default: '' }, // e.g. 'Tampines, 4-room, Standard, from 2027'
  outcome: { type: Object, required: true },
  horizonYears: { type: Number, default: null },
  cyPrefix: { type: String, required: true }, // 'results-patha' / 'results-pathb'
});
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
              {{ formatMoney(outcome.netFinancialPosition) }}
            </td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">Enhanced CPF Housing Grant</th>
            <td class="text-end">{{ formatMoney(outcome.grants?.ehg) }}</td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">CPF Housing Grant (Family)</th>
            <td class="text-end">{{ formatMoney(outcome.grants?.familyGrant) }}</td>
          </tr>
          <tr>
            <th scope="row" class="fw-normal">Proximity Housing Grant</th>
            <td class="text-end">{{ formatMoney(outcome.grants?.phg) }}</td>
          </tr>
          <tr>
            <th scope="row">Total grants</th>
            <td class="text-end fw-semibold" :data-cy="`${cyPrefix}-grants-total`">
              {{ formatMoney(outcome.grants?.total) }}
            </td>
          </tr>
          <tr :data-cy="`${cyPrefix}-cpf-refund`">
            <th scope="row" class="fw-normal">CPF refunded on sale, with accrued interest</th>
            <td class="text-end">{{ formatMoney(outcome.cpfRefund?.total) }}</td>
          </tr>
          <tr v-if="outcome.subsidyClawback > 0" :data-cy="`${cyPrefix}-clawback`">
            <th scope="row" class="fw-normal">Subsidy clawback on sale</th>
            <td class="text-end">{{ formatMoney(outcome.subsidyClawback) }}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="h6">Grant eligibility</h3>
      <EligibilityList :items="outcome.eligibility ?? []" :cy-prefix="cyPrefix" />
    </div>
  </div>
</template>