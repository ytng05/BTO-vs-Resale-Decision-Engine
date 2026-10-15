<script setup>
// Sticky bar at the bottom of My scenarios while compare mode is on.
// Shows how many are picked and the Compare button.
defineProps({
  count: { type: Number, required: true },
  canCompare: { type: Boolean, required: true },
})
const emit = defineEmits(['compare', 'cancel'])
</script>

<template>
  <div class="compare-bar shadow-sm" role="region" aria-label="Compare scenarios" data-cy="compare-bar">
    <div class="container d-flex justify-content-between align-items-center gap-2">
      <span class="small" data-cy="compare-bar-count">
        {{ count }} of 2 selected<span v-if="count < 2"> · pick {{ 2 - count }} more</span>
      </span>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-link btn-sm" data-cy="compare-bar-cancel" @click="emit('cancel')">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="!canCompare"
          data-cy="compare-bar-button"
          @click="emit('compare')"
        >
          Compare ({{ count }})
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.compare-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding: 0.75rem 0;
  background: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
}
</style>