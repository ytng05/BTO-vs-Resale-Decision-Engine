<script setup>
// Steps 2 and 3 of the plan stepper. One component serves both paths:
//   <PathForm choice-key="choiceA" />  (BTO: adds classification, no Executive flats)
//   <PathForm choice-key="choiceB" />  (resale)
// The path itself ('BTO' / 'RESALE') is fixed in the store, so there is no input for it.
import { computed } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { TOWNS, FLAT_TYPES, BTO_FLAT_TYPES, CLASSIFICATIONS } from '../constants/planOptions.js';

const props = defineProps({
  choiceKey: { type: String, required: true, validator: (v) => v === 'choiceA' || v === 'choiceB' },
  errors: { type: Object, default: () => ({}) },
});

const store = useScenarioStore();
const choice = computed(() => store[props.choiceKey]);
const isBto = computed(() => choice.value.path === 'BTO');
const flatTypes = computed(() => (isBto.value ? BTO_FLAT_TYPES : FLAT_TYPES));

// 'patha' / 'pathb', used for element ids and data-cy selectors.
const prefix = computed(() => (props.choiceKey === 'choiceA' ? 'patha' : 'pathb'));
const currentYear = new Date().getFullYear();

const err = (key) => props.errors[key];
</script>

<template>
  <div :data-cy="`${prefix}-form`">
    <p class="text-secondary">
      <template v-if="isBto">Apply for a new BTO flat and wait for it to be built.</template>
      <template v-else>Buy a resale flat on the open market.</template>
    </p>

    <div class="row g-3">
      <div class="col-12 col-md-6">
        <label :for="`${prefix}-year`" class="form-label">
          {{ isBto ? 'Year you apply' : 'Year you buy' }}
        </label>
        <input
          :id="`${prefix}-year`"
          v-model.number="choice.purchaseYear"
          type="number"
          :min="currentYear"
          step="1"
          inputmode="numeric"
          :placeholder="String(currentYear)"
          class="form-control"
          :class="{ 'is-invalid': err('purchaseYear') }"
          :data-cy="`${prefix}-year-input`"
        />
        <div class="invalid-feedback">{{ err('purchaseYear') }}</div>
      </div>

      <div class="col-12 col-md-6">
        <label :for="`${prefix}-town`" class="form-label">Town</label>
        <select
          :id="`${prefix}-town`"
          v-model="choice.town"
          class="form-select"
          :class="{ 'is-invalid': err('town') }"
          :data-cy="`${prefix}-town-select`"
        >
          <option :value="null" disabled>Choose a town</option>
          <option v-for="t in TOWNS" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <div class="invalid-feedback">{{ err('town') }}</div>
      </div>

      <div class="col-12 col-md-6">
        <label :for="`${prefix}-flat-type`" class="form-label">Flat type</label>
        <select
          :id="`${prefix}-flat-type`"
          v-model="choice.flatType"
          class="form-select"
          :class="{ 'is-invalid': err('flatType') }"
          :data-cy="`${prefix}-flat-type-select`"
        >
          <option :value="null" disabled>Choose a flat type</option>
          <option v-for="f in flatTypes" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
        <div class="invalid-feedback">{{ err('flatType') }}</div>
      </div>

      <div v-if="isBto" class="col-12 col-md-6">
        <label :for="`${prefix}-classification`" class="form-label">Classification</label>
        <select
          :id="`${prefix}-classification`"
          v-model="choice.classification"
          class="form-select"
          :class="{ 'is-invalid': err('classification') }"
          :aria-describedby="`${prefix}-classification-help`"
          :data-cy="`${prefix}-classification-select`"
        >
          <option v-for="c in CLASSIFICATIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <div :id="`${prefix}-classification-help`" class="form-text">
          Plus and Prime flats have a longer minimum occupation period and a subsidy clawback when sold.
        </div>
        <div class="invalid-feedback">{{ err('classification') }}</div>
      </div>
    </div>
  </div>
</template>