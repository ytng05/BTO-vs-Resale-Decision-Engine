<script setup>
// A number box for the About you screens: a text input with the phone number keypad (inputmode="decimal" when
// decimals are allowed, else "numeric"), so no spinner, no scroll-to-change and no "e" or "-". `grouped` adds
// thousands commas as the user types (5000 shows as 5,000) and keeps the cursor after the same character.
// `decimals` (money: 2) keeps up to that many digits after a point, typed or pasted, so "45,123.67" from the CPF
// app is 45,123.67; with 0 (ages, years) the part after a point is shown while typing but not used, and goes on
// leaving the field (30.5 is 30), so it is never joined on (45,123.67 is never 4,512,367).
// v-model is a number, or null when empty. Other attributes (id, class, placeholder, aria-*, data-cy) go on the <input>.
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: Number, default: null },
  grouped: { type: Boolean, default: true },
  maxDigits: { type: Number, default: 9 },
  decimals: { type: Number, default: 0 },
});
const emit = defineEmits(['update:modelValue']);

const group = (digits) => (props.grouped ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : digits);
const display = computed(() => {
  if (!Number.isFinite(props.modelValue)) return '';
  const [whole, frac] = String(props.modelValue).split('.');
  return group(whole) + (props.decimals && frac ? `.${frac.slice(0, props.decimals)}` : '');
});

// Characters that survive formatting: digits and the point.
const kept = (ch) => /\d/.test(ch) || ch === '.';

// Leaving the field shows the number as stored (drops a whole-number field's ".5", a trailing point).
function onBlur(event) {
  event.target.value = display.value;
}

function onInput(event) {
  const el = event.target;
  const caret = el.selectionStart ?? el.value.length;
  const point = el.value.indexOf('.');
  const before = point === -1 ? el.value : el.value.slice(0, point);
  const after = point === -1 ? '' : el.value.slice(point + 1);
  const whole = before.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, props.maxDigits);
  const shown = after.replace(/\D/g, '').slice(0, Math.max(props.decimals, 2));
  const frac = shown.slice(0, props.decimals); // the part the number uses: none for whole numbers
  const text = group(whole) + (point === -1 ? '' : `.${shown}`);
  // Put the cursor back after the same number of kept characters, skipping the commas.
  const keptBeforeCaret = [...el.value.slice(0, caret)].filter(kept).length;
  el.value = text;
  let pos = 0;
  for (let seen = 0; pos < text.length && seen < keptBeforeCaret; pos += 1) {
    if (kept(text[pos])) seen += 1;
  }
  if (document.activeElement === el) el.setSelectionRange(pos, pos);
  if (whole === '' && !frac) return emit('update:modelValue', null);
  return emit('update:modelValue', Number(`${whole || '0'}${frac ? `.${frac}` : ''}`));
}
</script>

<template>
  <input v-bind="$attrs" type="text" :inputmode="decimals ? 'decimal' : 'numeric'" autocomplete="off" :value="display" @input="onInput" @blur="onBlur" />
</template>
