<script setup>
// Steps 2 and 3 of the plan stepper. One component serves both paths:
//   <PathForm choice-key="choiceA" />  (BTO: town list from seeded BTO projects, classification,
//                                       optional project + price slider inside HDB's range)
//   <PathForm choice-key="choiceB" />  (resale: living arrangement + lease band)
// Both paths have an optional renovation budget. Field names follow the store (contract v2/v2.1);
// money is in dollars here and client.js sends cents (D14).
// The path itself ('BTO' / 'RESALE') is fixed in the store, so there is no input for it.
import { computed, onMounted, ref, watch } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { getBtoProjects } from '../api/client.js';
import { formatMoney } from '../utils/format.js';
import {
  TOWNS,
  FLAT_TYPES,
  BTO_FLAT_TYPES,
  CLASSIFICATIONS,
  LIVING_ARRANGEMENTS,
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
// Resale only: defaults to 'NONE', so start the dropdown there.
if (!isBto.value && choice.value.livingArrangement === undefined) {
  choice.value.livingArrangement = 'NONE';
}

const flatTypes = computed(() => (isBto.value ? BTO_FLAT_TYPES : FLAT_TYPES));

// 'patha' / 'pathb', used for element ids and data-cy selectors.
const prefix = computed(() => (props.choiceKey === 'choiceA' ? 'patha' : 'pathb'));
const currentYear = new Date().getFullYear();

const err = (key) => props.errors[key];

// Optional renovation budget: an emptied box goes back to 0 (the contract default).
const renovation = computed({
  get: () => choice.value.renovation ?? '',
  set: (v) => { choice.value.renovation = v === '' || v === null ? 0 : Number(v); },
});

// ---- BTO only: towns and projects from seat 3's GET /api/data/bto-projects ----
// BTO towns are the towns with a recent launch (API_CONTRACT.md: no recent launch, no BTO price).
// If the request fails, fall back to the full town list so the form still works.
const btoTowns = ref(null);
const projects = ref([]);
const projectsError = ref(null);
const loadingProjects = ref(false);

const townOptions = computed(() => {
  if (!isBto.value || !btoTowns.value) return TOWNS;
  return btoTowns.value.map((value) => ({ value, label: toTitleCase(value) }));
});

async function loadProjects() {
  if (!isBto.value) return;
  loadingProjects.value = true;
  projectsError.value = null;
  try {
    const { town, flatType, classification } = choice.value;
    const res = await getBtoProjects({ town: town ?? undefined, flatType: flatType ?? undefined, classification: classification ?? undefined });
    btoTowns.value = res.towns ?? btoTowns.value;
    projects.value = town && flatType ? res.projects : [];
    // Drop a chosen project that no longer matches the town / flat type / classification.
    if (choice.value.btoProjectId && !projects.value.some((p) => p.id === choice.value.btoProjectId)) {
      choice.value.btoProjectId = null;
      choice.value.btoPrice = null;
    }
  } catch {
    projectsError.value = 'BTO projects could not be loaded. You can still continue; the app will use a typical project for the town.';
  } finally {
    loadingProjects.value = false;
  }
}

onMounted(loadProjects);
watch(() => [choice.value.town, choice.value.flatType, choice.value.classification], loadProjects);

const project = computed(() => projects.value.find((p) => p.id === choice.value.btoProjectId) ?? null);
// The chosen flat type's price range in that project, in dollars.
const priceRange = computed(() => {
  const flat = project.value?.flats?.[0];
  return flat ? { min: flat.priceMinCents / 100, max: flat.priceMaxCents / 100 } : null;
});
// Same default the server uses when no price is sent: the exact middle of the range (D26).
const midpoint = computed(() => (priceRange.value ? (priceRange.value.min + priceRange.value.max) / 2 : null));
const shownPrice = computed(() => choice.value.btoPrice ?? midpoint.value);

function onProjectChange() {
  choice.value.btoPrice = null; // new project: back to its midpoint
}
function setPrice(v) {
  choice.value.btoPrice = Number(v);
}
const waitText = (m) => (m == null ? 'waiting time not announced' : `about ${Math.floor(m / 12)} yr ${m % 12} mo wait`);
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
          v-model.number="choice.applicationYear"
          type="number"
          :min="currentYear"
          step="1"
          inputmode="numeric"
          :placeholder="`e.g. ${currentYear}`"
          class="form-control"
          :class="{ 'is-invalid': err('applicationYear') }"
          :aria-invalid="err('applicationYear') ? 'true' : null"
          :data-cy="`${prefix}-year-input`"
        />
        <div class="invalid-feedback">{{ err('applicationYear') }}</div>
      </div>

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
      </div>

      <div class="col-12 col-md-6">
        <label :for="`${prefix}-flat-type`" class="form-label">Flat type</label>
        <select
          :id="`${prefix}-flat-type`"
          v-model="choice.flatType"
          class="form-select"
          :class="{ 'is-invalid': err('flatType') }"
          :aria-invalid="err('flatType') ? 'true' : null"
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
          :aria-invalid="err('classification') ? 'true' : null"
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

      <!-- BTO: optional project and price -->
      <div v-if="isBto" class="col-12" :data-cy="`${prefix}-project-section`">
        <label :for="`${prefix}-project`" class="form-label">BTO project <span class="text-secondary fw-normal">(optional)</span></label>
        <select
          :id="`${prefix}-project`"
          v-model="choice.btoProjectId"
          class="form-select"
          :disabled="!choice.town || !choice.flatType || loadingProjects"
          :aria-describedby="`${prefix}-project-help`"
          :data-cy="`${prefix}-project-select`"
          @change="onProjectChange"
        >
          <option :value="null">Any: use the town's newest {{ choice.flatType ? choice.flatType.toLowerCase() : '' }} launch</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">
            {{ p.name }} ({{ p.launch }}, {{ waitText(p.waitMonths) }})
          </option>
        </select>
        <div :id="`${prefix}-project-help`" class="form-text">
          <template v-if="!choice.town || !choice.flatType">Choose a town and flat type to see real HDB launches.</template>
          <template v-else-if="!loadingProjects && projects.length === 0">No recent {{ choice.classification?.toLowerCase() }} launch for this town and flat type; the app will use a typical waiting time.</template>
          <template v-else>Real projects from HDB's launch tables. Picking one sets the price range and waiting time.</template>
        </div>
        <div v-if="projectsError" class="text-danger small mt-1" role="alert" :data-cy="`${prefix}-project-error`">{{ projectsError }}</div>

        <div v-if="project && priceRange" class="border rounded p-3 mt-3" :data-cy="`${prefix}-price-section`">
          <div class="d-flex justify-content-between small">
            <label :for="`${prefix}-price`" class="fw-semibold">Price you expect to pay (before grants)</label>
            <output :for="`${prefix}-price`" class="fw-semibold text-numeric" :data-cy="`${prefix}-price-value`">{{ formatMoney(shownPrice) }}</output>
          </div>
          <input
            :id="`${prefix}-price`"
            type="range"
            class="form-range"
            :min="priceRange.min"
            :max="priceRange.max"
            step="1000"
            :value="shownPrice"
            :aria-valuetext="formatMoney(shownPrice)"
            :data-cy="`${prefix}-price-slider`"
            @input="setPrice($event.target.value)"
          />
          <div class="d-flex justify-content-between small text-secondary">
            <span>HDB range {{ formatMoney(priceRange.min) }} to {{ formatMoney(priceRange.max) }}</span>
            <a :href="project.sourceUrl" target="_blank" rel="noopener noreferrer">HDB source<span class="visually-hidden"> for {{ project.name }} (opens in a new tab)</span> ↗</a>
          </div>
          <p v-if="choice.btoPrice === null" class="small text-secondary mb-0 mt-1">Using the middle of the range. Lower floors usually cost less.</p>
        </div>
      </div>

      <!-- Resale only -->
      <div v-if="!isBto" class="col-12 col-md-6">
        <label :for="`${prefix}-living`" class="form-label">Living with or near your parents?</label>
        <select
          :id="`${prefix}-living`"
          v-model="choice.livingArrangement"
          class="form-select"
          :class="{ 'is-invalid': err('livingArrangement') }"
          :aria-invalid="err('livingArrangement') ? 'true' : null"
          :aria-describedby="`${prefix}-living-help`"
          :data-cy="`${prefix}-living-select`"
        >
          <option v-for="l in LIVING_ARRANGEMENTS" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
        <div :id="`${prefix}-living-help`" class="form-text">
          Decides whether this resale flat qualifies for the Proximity Housing Grant.
        </div>
        <div class="invalid-feedback">{{ err('livingArrangement') }}</div>
      </div>

      <div v-if="!isBto" class="col-12 col-md-6">
        <label :for="`${prefix}-lease-band`" class="form-label">Remaining lease</label>
        <select
          :id="`${prefix}-lease-band`"
          v-model="choice.leaseBand"
          class="form-select"
          :class="{ 'is-invalid': err('leaseBand') }"
          :aria-invalid="err('leaseBand') ? 'true' : null"
          :data-cy="`${prefix}-lease-band-select`"
        >
          <option :value="null" disabled>Choose the remaining lease</option>
          <option v-for="b in LEASE_BANDS" :key="b.value" :value="b.value">{{ b.label }}</option>
        </select>
        <div class="invalid-feedback">{{ err('leaseBand') }}</div>
      </div>

      <!-- Both paths -->
      <div class="col-12 col-md-6">
        <label :for="`${prefix}-renovation`" class="form-label">Renovation budget <span class="text-secondary fw-normal">(optional)</span></label>
        <div class="input-group has-validation">
          <span class="input-group-text">$</span>
          <input
            :id="`${prefix}-renovation`"
            v-model="renovation"
            type="number"
            min="0"
            step="1000"
            inputmode="numeric"
            placeholder="0"
            :aria-describedby="`${prefix}-renovation-help`"
            :aria-invalid="err('renovation') ? 'true' : null"
            class="form-control"
            :class="{ 'is-invalid': err('renovation') }"
            :data-cy="`${prefix}-renovation-input`"
          />
          <div class="invalid-feedback">{{ err('renovation') }}</div>
        </div>
        <div :id="`${prefix}-renovation-help`" class="form-text">Paid in cash when you get the keys.</div>
      </div>
    </div>
  </div>
</template>