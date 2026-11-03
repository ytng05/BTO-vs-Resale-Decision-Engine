<script setup>
// Steps 3 and 4 of the plan stepper (D38). One component serves both paths:
//   <PathForm choice-key="choiceA" />  "Your BTO": town (towns with a recent launch), then the launch (which
//                                       fixes the classification), then the flat types that launch offers
//                                       (GET /api/data/bto-projects), then HDB's price range as a sentence.
//   <PathForm choice-key="choiceB" />  "Resale flat": town, flat type (pre-filled from the BTO step),
//                                       remaining lease, an optional asking price (D39, blank = the median),
//                                       and living with or near parents if picked in step 1.
// Not asked here (D38): the year (defaults to next year) and renovation (0). HDB publishes a price range per launch
// and flat type, not one price (the unit is picked later), so the price defaults to the midpoint and changes on
// the Dashboard (D26).
// Field names follow the store (contract v2/v2.1). The path ('BTO' / 'RESALE') is fixed in the store.
import Term from './Term.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { getBtoProjects, getResalePrice } from '../api/client.js';
import { formatMoney } from '../utils/format.js';
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
// BTO only: the launch the choice resolves to (the user's pick, else the newest), or null, for the step's
// summary card.
const emit = defineEmits(['project']);

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

// Every launch in the town, newest first; a tie goes to Standard, then Plus, then Prime, then by name.
const CLASS_ORDER = { STANDARD: 0, PLUS: 1, PRIME: 2 };
const launchOptions = computed(() =>
  [...townProjects.value].sort((x, y) => String(y.launch).localeCompare(String(x.launch))
    || (CLASS_ORDER[x.classification] ?? 9) - (CLASS_ORDER[y.classification] ?? 9)
    || x.name.localeCompare(y.name)),
);
const activeProject = computed(() => launchOptions.value.find((p) => p.id === choice.value.btoProjectId) ?? null);
watch(activeProject, (p) => { if (isBto.value) emit('project', p); }, { immediate: true });

// Flat types the chosen launch offers (BTO), or all three (resale).
const flatTypeOptions = computed(() => {
  if (!isBto.value) return FLAT_TYPES;
  const offered = new Set((activeProject.value?.flats ?? []).map((f) => f.flatType));
  return BTO_FLAT_TYPES.filter((f) => offered.has(f.value));
});
// HDB's range for the chosen launch and flat type, in cents.
const activeFlat = computed(() => (activeProject.value?.flats ?? []).find((f) => f.flatType === choice.value.flatType) ?? null);
const midpointCents = computed(() => (activeFlat.value ? Math.round((activeFlat.value.priceMinCents + activeFlat.value.priceMaxCents) / 2) : null));

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
const monthYear = (ym) => {
  const [y, m] = String(ym ?? '').split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '';
};
// '4 years', '4½ years', 'under a year': from HDB's waiting time for the launch.
const keysIn = (months) => {
  if (typeof months !== 'number') return '';
  const half = Math.round(months / 6) / 2;
  if (half < 1) return 'keys in under a year';
  const whole = Math.floor(half);
  return `keys in about ${whole}${half > whole ? '½' : ''} year${half === 1 ? '' : 's'}`;
};

let latestRequest = 0;
const loadingTown = ref(false); // a town's launches are on their way: say so, so the step isn't blank meanwhile
async function loadTown() {
  if (!isBto.value) return;
  // Remember which town this request is for, and ignore a reply that a newer request has overtaken
  // (e.g. the first, town-less load arriving after the user has picked a town).
  const town = choice.value.town;
  const id = ++latestRequest;
  loadError.value = null;
  loadingTown.value = Boolean(town); // the first, town-less load (the town list) needs no message
  try {
    const res = await getBtoProjects({ town: town ?? undefined });
    if (id !== latestRequest) return;
    loadingTown.value = false;
    btoTowns.value = res.towns ?? btoTowns.value;
    townProjects.value = town ? (res.projects ?? []).filter((p) => p.town === town) : [];
  } catch {
    if (id !== latestRequest) return;
    loadingTown.value = false;
    loadError.value = 'BTO launches could not be loaded. Check your connection and try again.';
    townProjects.value = [];
  }
  settleBtoChoice();
}

// Keep the choice to what the town offers: a launch (the user's, else the newest), its classification, and a
// flat type it offers (5-room if "More space" was picked, else 4-room, else the first).
function settleBtoChoice() {
  if (!choice.value.town) return;
  const launches = launchOptions.value;
  if (!launches.length) return;
  if (!launches.some((p) => p.id === choice.value.btoProjectId)) choice.value.btoProjectId = launches[0].id;
  settleLaunch();
}
function settleLaunch() {
  const p = activeProject.value;
  if (!p) return;
  choice.value.classification = p.classification;
  const types = flatTypeOptions.value.map((f) => f.value);
  if (types.length && !types.includes(choice.value.flatType)) {
    choice.value.flatType = types.includes(preferredFlatType.value) ? preferredFlatType.value
      : types.includes('4 ROOM') ? '4 ROOM' : types[0];
  }
  settlePrice();
}
// A price kept from a saved plan must still sit inside the range (the server refuses it otherwise).
function settlePrice() {
  const f = activeFlat.value;
  const price = choice.value.btoPrice;
  if (price != null && (!f || price * 100 < f.priceMinCents || price * 100 > f.priceMaxCents)) choice.value.btoPrice = null;
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
watch(() => choice.value.btoProjectId, () => { if (isBto.value) settleLaunch(); });
watch(() => choice.value.flatType, () => { if (isBto.value) settlePrice(); });
// A different launch has a different range: start again from its midpoint.
watch(() => choice.value.btoProjectId, (now, before) => { if (isBto.value && before !== undefined && now !== before) choice.value.btoPrice = null; });

// ---- Resale: the median for the town, flat type and lease band, beside the optional asking price (D39) ----
const median = ref(null); // GET /api/data/resale-price summary, or null
let latestMedian = 0;
const medianLoading = ref(false);
async function loadMedian() {
  const { town, flatType, leaseBand } = choice.value;
  const id = ++latestMedian;
  if (isBto.value || !town || !flatType || !leaseBand) {
    median.value = null;
    medianLoading.value = false;
    return;
  }
  medianLoading.value = true;
  try {
    const res = await getResalePrice({ town, flatType, leaseBand });
    if (id === latestMedian) median.value = res?.medianPriceCents ? res : null;
  } catch {
    if (id === latestMedian) median.value = null; // no sales in the band, or offline: no hint rather than a wrong one
  } finally {
    if (id === latestMedian) medianLoading.value = false;
  }
}
watch(() => [choice.value.town, choice.value.flatType, choice.value.leaseBand], loadMedian, { immediate: true });
// Dollars above the median: the cash over valuation, paid in cash.
const overMedian = computed(() => {
  const price = choice.value.resalePrice;
  if (!median.value || typeof price !== 'number') return 0;
  return Math.max(0, Math.round(price - median.value.medianPriceCents / 100));
});

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
    <!-- The BTO step's intro is in PlanView's heading. -->
    <p v-if="!isBto" class="text-secondary">The resale flat you're looking at.</p>

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
        <div v-if="loadingTown" class="form-text mt-1" role="status" :data-cy="`${prefix}-projects-loading`">
          <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Loading launches in {{ toTitleCase(choice.town) }}…
        </div>
        <div v-if="loadError" class="text-danger small mt-1" role="alert" :data-cy="`${prefix}-projects-error`">
          {{ loadError }}
          <button type="button" class="btn btn-link btn-sm p-0 align-baseline" :data-cy="`${prefix}-projects-retry`" @click="loadTown">Try again</button>
        </div>
      </div>

      <!-- BTO: which launch. It fixes the classification and which flat types there are. -->
      <fieldset v-if="isBto && choice.town && launchOptions.length" class="col-12" :data-cy="`${prefix}-project`">
        <legend class="form-label fs-6">Which launch should we estimate from?</legend>
        <div class="chip-group">
          <label v-for="p in launchOptions" :key="p.id" class="chip" :data-cy="`${prefix}-project-${p.id}`">
            <input
              v-model="choice.btoProjectId"
              type="radio"
              class="chip__input"
              :name="`${prefix}-project`"
              :value="p.id"
              :data-cy="`${prefix}-project-${p.id}-input`"
            />
            <span class="chip__face">{{ p.name }} · {{ monthYear(p.launch) }} · {{ labelOf(CLASSIFICATIONS, p.classification) }}</span>
          </label>
        </div>
        <div class="form-text" :data-cy="`${prefix}-project-help`">
          <!-- D40: these launches have closed; one stands in for the launch the user will apply to. -->
          These launches have closed. We use one as an estimate of the price and wait for your own application.
          <template v-if="activeProject">{{ activeProject.name }}: {{ keysIn(activeProject.waitMonths) }} after you apply. </template>
          Plus and Prime flats have a longer <Term id="mop">minimum occupation period</Term> and a <Term id="clawback">subsidy clawback</Term> when sold.
        </div>
        <div v-if="err('classification')" class="invalid-feedback d-block">{{ err('classification') }}</div>
      </fieldset>

      <!-- Flat type -->
      <fieldset v-if="!isBto || activeProject" class="col-12" :data-cy="`${prefix}-flat-type`">
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

      <!-- BTO: the price, as HDB publishes it: a range for the launch and flat type (D26) -->
      <!-- The price the comparison uses, as a figure: easy to miss when it was only a sentence. -->
      <div v-if="isBto && activeFlat" class="col-12">
        <div class="bto-price" :data-cy="`${prefix}-price-basis`">
          <p class="bto-price__label mb-0">Estimated price we'll use</p>
          <p class="bto-price__figure text-numeric mb-1" :data-cy="`${prefix}-price-estimate`">{{ formatMoney(midpointCents / 100) }}</p>
          <p class="bto-price__note mb-0">
            The middle of HDB's range for a {{ labelOf(FLAT_TYPES, choice.flatType).toLowerCase() }} at {{ activeProject.name }}
            ({{ monthYear(activeProject.launch) }}): {{ formatMoney(activeFlat.priceMinCents / 100) }} to
            {{ formatMoney(activeFlat.priceMaxCents / 100) }}. Your own price depends on the launch and the unit you pick; you
            can change it on the dashboard, and the results say at what price the answer would change.
          </p>
        </div>
      </div>

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

      <!-- Resale: the listing's asking price, optional (D39) -->
      <div v-if="!isBto" class="col-12 col-md-6">
        <!-- The (i) sits beside the label, not inside it, so tapping it doesn't focus the field. -->
        <div class="form-label d-flex align-items-center gap-1">
          <label :for="`${prefix}-asking-price`" class="mb-0">Asking price <span class="text-secondary">(optional)</span></label>
          <Term id="asking-price" icon ask="What is the asking price?" />
        </div>
        <div class="input-group has-validation">
          <span class="input-group-text">$</span>
          <input
            :id="`${prefix}-asking-price`"
            v-model.number="choice.resalePrice"
            type="number"
            min="0"
            step="1000"
            inputmode="numeric"
            :placeholder="median ? `e.g. ${Math.round(median.medianPriceCents / 100)}` : 'e.g. 650000'"
            class="form-control"
            :class="{ 'is-invalid': err('resalePrice') }"
            :aria-invalid="err('resalePrice') ? 'true' : null"
            :aria-describedby="`${prefix}-asking-price-help`"
            :data-cy="`${prefix}-asking-price-input`"
          />
          <div class="invalid-feedback">{{ err('resalePrice') }}</div>
        </div>
        <div :id="`${prefix}-asking-price-help`" class="form-text" :data-cy="`${prefix}-asking-price-help`">
          <template v-if="median">
            Leave blank to use the median of recent sales, {{ formatMoney(median.medianPriceCents / 100) }}
            (the middle half sold for {{ formatMoney(median.p25PriceCents / 100) }} to {{ formatMoney(median.p75PriceCents / 100) }}).
          </template>
          <template v-else-if="medianLoading"><span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Looking up recent sales…</template>
          <template v-else>Leave blank to use the median of recent sales.</template>
          <span v-if="overMedian > 0" class="d-block mt-1" :data-cy="`${prefix}-asking-price-cov`">
            {{ formatMoney(overMedian) }} above the median. We treat the median as the <Term id="valuation">valuation</Term>, so that part is paid in cash, not CPF or the loan.
          </span>
        </div>
      </div>

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

<style scoped>
/* "Estimated price we'll use": the BTO price as a figure, on the periwinkle fill the Calm cards use for facts. */
.bto-price { padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--accent-fill-3); }
.bto-price__label { font-size: 0.875rem; color: var(--text-secondary); }
.bto-price__figure { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 500; line-height: 1.15; letter-spacing: -0.02em; }
.bto-price__note { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
</style>
