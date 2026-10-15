// Selection state for "compare mode" on My scenarios: pick exactly two.
import { computed, ref } from 'vue'

export const MAX_COMPARE = 2

export function useComparePicker() {
  const selected = ref([]) // scenario ids, in the order they were picked

  const isSelected = (id) => selected.value.includes(id)
  const isFull = computed(() => selected.value.length >= MAX_COMPARE)
  const canCompare = computed(() => selected.value.length === MAX_COMPARE)

  // A third pick is blocked: the checkbox is disabled instead.
  const isDisabled = (id) => isFull.value && !isSelected(id)

  function toggle(id) {
    if (isSelected(id)) {
      selected.value = selected.value.filter((x) => x !== id)
    } else if (!isFull.value) {
      selected.value = [...selected.value, id]
    }
  }

  function clear() {
    selected.value = []
  }

  // First pick becomes Scenario A, second becomes Scenario B.
  const compareRoute = computed(() =>
    canCompare.value
      ? { path: '/scenarios/compare', query: { a: selected.value[0], b: selected.value[1] } }
      : null,
  )

  return { selected, isSelected, isDisabled, isFull, canCompare, toggle, clear, compareRoute }
}