<script setup>
// Sticky bar shown on My scenarios while compare mode is on: how many are ticked, Compare and Cancel.
// ScenariosView passes the count and whether two are picked; it handles navigation (@compare) and
// leaving compare mode (@cancel). Normal-size buttons (not btn-sm) so they are easy to tap on a phone.
const props = defineProps({
  count: { type: Number, required: true }, // scenarios ticked so far (0-2)
  canCompare: { type: Boolean, default: false }, // true once exactly two are ticked
});
const emit = defineEmits(['compare', 'cancel']);
</script>

<template>
  <div
    class="sticky-bottom bg-body border-top py-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
    data-cy="compare-bar"
  >
    <span class="text-secondary" role="status" aria-live="polite" data-cy="compare-bar-count">
      {{ props.count }} of 2 selected
    </span>
    <div class="d-flex gap-2">
      <button
        type="button"
        class="btn btn-outline-secondary"
        data-cy="compare-bar-cancel-button"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!props.canCompare"
        data-cy="compare-bar-compare-button"
        @click="emit('compare')"
      >
        Compare
      </button>
    </div>
  </div>
</template>