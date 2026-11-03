<script setup>
// A whole-number box for the About you screens: a text input with the phone number keypad (inputmode="numeric"), so
// no spinner, no scroll-to-change and no "e" or "-". Digits only; `grouped` adds thousands commas as the user types
// (5000 shows as 5,000) and keeps the cursor after the same digit. v-model is a number, or null when empty.
// Other attributes (id, class, placeholder, aria-*, data-cy) go on the <input>.
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: Number, default: null },
  grouped: { type: Boolean, default: true },
  maxDigits: { type: Number, default: 9 },
});
const emit = defineEmits(['update:modelValue']);

const show = (digits) => (props.grouped ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : digits);
const display = computed(() => (Number.isFinite(props.modelValue) ? show(String(Math.trunc(props.modelValue))) : ''));

function onInput(event) {
  const el = event.target;
  const caret = el.selectionStart ?? el.value.length;
  const digitsBeforeCaret = el.value.slice(0, caret).replace(/\D/g, '').length;
  const digits = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, props.maxDigits);
  const text = show(digits);
  el.value = text;
  // Put the cursor back after the same number of digits, skipping the commas.
  let pos = 0;
  for (let seen = 0; pos < text.length && seen < digitsBeforeCaret; pos += 1) {
    if (/\d/.test(text[pos])) seen += 1;
  }
  if (document.activeElement === el) el.setSelectionRange(pos, pos);
  emit('update:modelValue', digits === '' ? null : Number(digits));
}
</script>

<template>
  <input v-bind="$attrs" type="text" inputmode="numeric" autocomplete="off" :value="display" @input="onInput" />
</template>
