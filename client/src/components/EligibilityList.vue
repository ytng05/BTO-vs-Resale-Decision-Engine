<script setup>
// One line per eligibility test, each with its own reason (docs/UI.md §8 "Explanation / reason blocks").
// Status is written out ("Eligible" / "Not eligible"), not shown by colour alone.
defineProps({
  items: { type: Array, default: () => [] }, // [{ grant, passed, reason }], flattened from Outcome.grants[].tests by PathOutcomeCard
  cyPrefix: { type: String, required: true }, // e.g. 'results-patha'
});

const GRANT_NAMES = {
  EHG: 'Enhanced CPF Housing Grant',
  FAMILY_GRANT: 'CPF Housing Grant (Family)',
  PHG: 'Proximity Housing Grant',
};
const grantName = (code) => GRANT_NAMES[code] ?? code;
</script>

<template>
  <ul v-if="items.length" class="mb-0 ps-3" :data-cy="`${cyPrefix}-eligibility`">
    <li v-for="(item, i) in items" :key="`${item.grant}-${i}`" class="mb-2" :data-cy="`${cyPrefix}-eligibility-item-${i}`">
      {{ grantName(item.grant) }}:
      <span
        class="fw-semibold"
        :class="item.passed ? 'text-success' : 'text-danger'"
        :data-cy="`${cyPrefix}-eligibility-status-${i}`"
      >{{ item.passed ? 'Eligible' : 'Not eligible' }}</span>
      <br />
      <span class="text-secondary" :data-cy="`${cyPrefix}-eligibility-reason-${i}`">{{ item.reason }}</span>
    </li>
  </ul>
  <p v-else class="text-secondary mb-0" :data-cy="`${cyPrefix}-eligibility-empty`">
    No eligibility checks were returned for this path.
  </p>
</template>