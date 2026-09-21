<script setup>
defineProps({
  version: { type: String, required: true },
  status: { type: String, default: 'TEMPLATE' },
  effectiveDate: { type: String, default: null },
});
</script>

<template>
  <span class="badge text-bg-light border" data-cy="ruleset-badge">
    Ruleset {{ version }}<span v-if="effectiveDate"> (dated {{ effectiveDate }})</span>
    <span v-if="status === 'TEMPLATE'"> - not yet verified</span>
  </span>
</template>
