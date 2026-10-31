<script setup>
// Steps 3 and 4 of the plan stepper (D38). One component serves both paths:
//   <PathForm choice-key="choiceA" />  "Your BTO": town (towns with a recent launch), then flat type and
//                                       classification as chips, offering only what that town's launches
//                                       have (GET /api/data/bto-projects), so the choice always resolves.
//   <PathForm choice-key="choiceB" />  "Resale flat": town, flat type (pre-filled from the BTO step),
//                                       remaining lease, and living with or near parents if picked in step 1.
// Not asked here (D38): the year (defaults to next year), renovation (0), and the BTO project and price
// (the server uses the town's newest launch at its midpoint, D26). They change on the Dashboard or later.
// Field names follow the store (contract v2/v2.1). The path ('BTO' / 'RESALE') is fixed in the store.
import { computed, onMounted, ref, watch } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { getBtoProjects } from '../api/client.js';
import {
  TOWNS,
  FLAT_TYPES,
  BTO_FLAT_TYPES,
  CLASSIFICATIONS,
  LEASE_BANDS,
  toTitleCase,
} from '../constants/planOptions.js';

const props = defineProps({
  choiceKey: { type: String, required: true, validator: (v) => v === 'choiceA' || v === 'choiceB' },
  errors: { type: Object, default: () => ({}) },
});

const store = useScenarioStore();
const choice = computed(() => store[props.choiceKey]);
const isBto = computed(() => choice.value.path === 'BTO');
// 'patha' / 'pathb', used for element ids and data-cy selectors.
const prefix = computed(() => (props.choiceKey === 'choiceA' ? 'patha' : 'pathb'));
const err = (key) => props.errors[key];
// '4 ROOM' -> '4-room', 'PLUS' -> 'plus': stable data-cy suffixes.
const slug = (v) => String(v).toLowerCase().replace(/\s+/g, '-');

// "More space" picked in step 1: suggest a 5-room rather than a 4-room.
const preferredFlatType = computed(() => (store.wishes.includes('space') ? '5 ROOM' : '4 ROOM'));

// ---- BTO: towns, flat types and classifications from the seeded launches ----
const btoTowns = ref(null);
const townProjects = ref([]); // every launch in the chosen town
const loadError = ref(null);

const townOptions = computed(() => {
  if (!isBto.value || !btoTowns.value) return TOWNS;
  return btoTowns.value.map((value) => ({ value, label: toTitleCase(value) }));
});

// Flat types offered by at least one launch in the town (BTO), or all three (resale).
const flatTypeOptions = computed(() => {
  if (!isBto.value) return FLAT_TYPES;
  const offered = new Set(townProjects.value.flatMap((p) => (p.flats ?? []).map((f) => f.flatType)));
  return BTO_FLAT_TYPES.filter((f) => offered.has(f.value));
});
// Classifications offered for the chosen flat type in the town.
const classificationOptions = computed(() => {
  const offered = new Set(
    townProjects.value
      .filter((p) => (p.flats ?? []).some((f) => f.flatType === choice.value.flatType))
      .map((p) => p.classification),
  );
  return CLASSIFICATIONS.filter((c) => offered.has(c.value));
});

let latestRequest = 0;
async function loadTown() {
  if (!isBto.value) return;
  // Remember which town this request is for, and ignore a reply that a newer request has overtaken
  // (e.g. the first, town-less load arriving after the user has picked a town).
  const town = choice.value.town;
  const id = ++latestRequest;
  loadError.value = null;
  try {
    const res = await getBtoProjects({ town: town ?? undefined });
    if (id !== latestRequest) return;
    btoTowns.value = res.towns ?? btoTowns.value;
    townProjects.value = town ? (res.projects ?? []).filter((p) => p.town === town) : [];
  } catch {
    if (id !== latestRequest) return;
    loadError.value = 'BTO launches could not be loaded. Check your connection and try again.';
    townProjects.value = [];
  }
  settleBtoChoice();
}

// Keep the flat type and classification to what the town offers; fill a sensible default.
function settleBtoChoice() {
  if (!choice.value.town) return;
  const types = flatTypeOptions.value.map((f) => f.value);
  if (types.length && !types.includes(choice.value.flatType)) {
    choice.value.flatType = types.includes(preferredFlatType.value) ? preferredFlatType.value
      : types.includes('4 ROOM') ? '4 ROOM' : types[0];
  }
  const classes = classificationOptions.value.map((c) => c.value);
  if (classes.length && !classes.includes(choice.value.classification)) {
    choice.value.classification = classes.includes('STANDARD') ? 'STANDARD' : classes[0];
  }
  // The project and price are the server's pick now (D38); clear any left over from a saved plan.
  choice.value.btoProjectId = null;
  choice.value.btoPrice = null;
}

onMounted(() => {
  if (isBto.value) {
    loadTown();
  } else if (!choice.value.flatType) {
    // Most people compare like for like: start the resale flat type at the BTO one.
    choice.value.flatType = store.choiceA.flatType ?? preferredFlatType.value;
  }
});
watch(() => choice.value.town, () => { if (isBto.value) loadTown(); });
watch(() => choice.value.flatType, () => { if (isBto.value) settleBtoChoice(); });

// ---- Resale: living with or near parents, shown when picked in step 1 or already set ----
const askParents = computed(() => store.wishes.includes('parents') || choice.value.livingArrangement !== 'NONE');
const LIVING = [
  { value: 'WITH', label: 'Living with them' },
  { value: 'NEAR', label: 'Within 4 km of them' },
  { value: 'NONE', label: 'Neither' },
];
</script>

<template>
  <div :data-cy="`${prefix}-form`">
    <p class="text-secondary">
      <template v-if="isBto">The new flat you'd apply for. We compare it as if you apply next year; you can change that on the dashboard.</template>
      <template v-else>The resale flat you're looking at.</template>
    </p>

    <div class="row g-4">
      <div class="col-12 col-md-6">
        <label :for="`${prefix}-town`" class="form-label">Town</label>
        <select
          :id="`${prefix}-town`"
          v-model="choice.town"
          class="form-select"
          :class="{ 'is-invalid': err('town') }"
          :aria-invalid="err('town') ? 'true' : null"
          :aria-describedby="isBto ? `${prefix}-town-help` : undefined"
          :data-cy="`${prefix}-town-select`"
        >
          <option :value="null" disabled>Choose a town</option>
          <option v-for="t in townOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <div v-if="isBto" :id="`${prefix}-town-help`" class="form-text">Towns with a recent BTO launch.</div>
        <div class="invalid-feedback">{{ err('town') }}</div>
        <div v-if="loadError" class="text-danger small mt-1" role="alert" :data-cy="`${prefix}-projects-error`">{{ loadError }}</div>
      </div>

      <!-- Flat type -->
      <fieldset class="col-12" :data-cy="`${prefix}-flat-type`">
        <legend class="form-label fs-6">Flat type</legend>
        <p v-if="isBto && !choice.town" class="form-text mt-0">Choose a town to see the flat types on offer.</p>
        <div v-else class="chip-group">
          <label v-for="f in flatTypeOptions" :key="f.value" class="chip" :data-cy="`${prefix}-flat-type-${slug(f.value)}`">
            <input
              v-model="choice.flatType"
              type="radio"
              class="chip__input"
              :name="`${prefix}-flat-type`"
              :value="f.value"
              :data-cy="`${prefix}-flat-type-${slug(f.value)}-input`"
            />
            <span class="chip__face">{{ f.label }}</span>
          </label>
        </div>
        <div v-if="err('flatType')" class="invalid-feedback d-block">{{ err('flatType') }}</div>
      </fieldset>

      <!-- BTO: classification -->
      <fieldset v-if="isBto && choice.town" class="col-12" :data-cy="`${prefix}-classification`">
        <legend class="form-label fs-6">Classification</legend>
        <div class="chip-group" :aria-describedby="`${prefix}-classification-help`">
          <label v-for="c in classificationOptions" :key="c.value" class="chip" :data-cy="`${prefix}-classification-${slug(c.value)}`">
            <input
              v-model="choice.classification"
              type="radio"
              class="chip__input"
              :name="`${prefix}-classification`"
              :value="c.value"
              :data-cy="`${prefix}-classification-${slug(c.value)}-input`"
            />
            <span class="chip__face">{{ c.label }}</span>
          </label>
        </div>
        <div :id="`${prefix}-classification-help`" class="form-text">
          Only what this town's launches offer. Plus and Prime have a longer minimum occupation period and a subsidy clawback when sold.
        </div>
        <div v-if="err('classification')" class="invalid-feedback d-block">{{ err('classification') }}</div>
      </fieldset>

      <!-- Resale: remaining lease -->
      <fieldset v-if="!isBto" class="col-12" :data-cy="`${prefix}-lease-band`">
        <legend class="form-label fs-6">Remaining lease</legend>
        <div class="chip-group">
          <label v-for="b in LEASE_BANDS" :key="b.value" class="chip" :data-cy="`${prefix}-lease-band-${b.value}`">
            <input
              v-model="choice.leaseBand"
              type="radio"
              class="chip__input"
              :name="`${prefix}-lease-band`"
              :value="b.value"
              :data-cy="`${prefix}-lease-band-${b.value}-input`"
            />
            <span class="chip__face">{{ b.label }}</span>
          </label>
        </div>
        <div class="form-text">From the listing. It sets the price we look up, the loan limit and how much CPF you can use.</div>
        <div v-if="err('leaseBand')" class="invalid-feedback d-block">{{ err('leaseBand') }}</div>
      </fieldset>

      <!-- Resale: living with or near parents (only if picked in step 1) -->
      <fieldset v-if="!isBto && askParents" class="col-12" :data-cy="`${prefix}-living`">
        <legend class="form-label fs-6">Your parents</legend>
        <div class="chip-group">
          <label v-for="l in LIVING" :key="l.value" class="chip" :data-cy="`${prefix}-living-${slug(l.value)}`">
            <input
              v-model="choice.livingArrangement"
              type="radio"
              class="chip__input"
              :name="`${prefix}-living`"
              :value="l.value"
              :data-cy="`${prefix}-living-${slug(l.value)}-input`"
            />
            <span class="chip__face">{{ l.label }}</span>
          </label>
        </div>
        <div class="form-text">For the Proximity Housing Grant on a resale flat. You declare this; the map is for reference only.</div>
        <div v-if="err('livingArrangement')" class="invalid-feedback d-block">{{ err('livingArrangement') }}</div>
      </fieldset>
    </div>
  </div>
</template>
