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
import NumberField from './NumberField.vue';
import WhyWeAsk from './WhyWeAsk.vue';
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
  btoKeysYear,
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

// Flat types the chosen launch offers (BTO), or all three (resale). The BTO step shows all three, the ones the
// launch doesn't offer greyed out (offeredTypes), so the choice doesn't seem to be missing.
const offeredTypes = computed(() => new Set((activeProject.value?.flats ?? []).map((f) => f.flatType)));
const flatTypeOptions = computed(() => {
  if (!isBto.value) return FLAT_TYPES;
  return BTO_FLAT_TYPES.filter((f) => offeredTypes.value.has(f.value));
});
// "Only 4-room in this launch." / "Only 4-room and 5-room in this launch.", when one or more types are missing.
const offeredHint = computed(() => {
  const offered = flatTypeOptions.value.map((f) => f.label.toLowerCase());
  if (!activeProject.value || offered.length === BTO_FLAT_TYPES.length || !offered.length) return null;
  return `Only ${offered.join(' and ')} in this launch.`;
});
// Newest first, so the first launch is the one we pick for you.
const newestId = computed(() => launchOptions.value[0]?.id ?? null);
// "Use a different launch" starts open when the user already picked another one.
const launchesOpen = ref(false);
watch(() => [choice.value.btoProjectId, newestId.value], ([id, newest]) => {
  if (id && newest && id !== newest) launchesOpen.value = true;
}, { immediate: true });
// HDB's range for the chosen launch and flat type, in cents.
const activeFlat = computed(() => (activeProject.value?.flats ?? []).find((f) => f.flatType === choice.value.flatType) ?? null);
const midpointCents = computed(() => (activeFlat.value ? Math.round((activeFlat.value.priceMinCents + activeFlat.value.priceMaxCents) / 2) : null));

const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
const monthYear = (ym) => {
  const [y, m] = String(ym ?? '').split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' }) : '';
};
// '4 yrs', '4½ yrs': the short form, for the launch list.
const yrsToKeys = (months) => {
  if (typeof months !== 'number') return '';
  const half = Math.round(months / 6) / 2;
  if (half < 1) return 'under a year to keys';
  const whole = Math.floor(half);
  return `${whole}${half > whole ? '½' : ''} yrs to keys`;
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

    <!-- Your BTO (Calm board): town, then the launch we estimate from (the newest, or another), then flat type. -->
    <div v-if="isBto" class="pf">
      <div class="pf__field">
        <label :for="`${prefix}-town`" class="pf__label">Town</label>
        <select
          :id="`${prefix}-town`"
          v-model="choice.town"
          class="form-select pf__select"
          :class="{ 'is-invalid': err('town') }"
          :aria-invalid="err('town') ? 'true' : null"
          :data-cy="`${prefix}-town-select`"
        >
          <option :value="null" disabled>Choose a town</option>
          <option v-for="t in townOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <div v-if="err('town')" class="invalid-feedback d-block">{{ err('town') }}</div>
        <div v-if="loadingTown" class="form-text" role="status" :data-cy="`${prefix}-projects-loading`">
          <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Loading launches in {{ toTitleCase(choice.town) }}…
        </div>
        <div v-if="loadError" class="text-danger small" role="alert" :data-cy="`${prefix}-projects-error`">
          {{ loadError }}
          <button type="button" class="btn btn-link btn-sm p-0 align-baseline" :data-cy="`${prefix}-projects-retry`" @click="loadTown">Try again</button>
        </div>
      </div>

      <!-- The launch. These launches have closed (D40): one stands in for the price and wait of your own. -->
      <div v-if="activeProject" class="est" :data-cy="`${prefix}-project`">
        <div class="est__line">
          <span class="est__ic" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3d4a8f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21v-9h7v9M8 15h1M8 18h1M16 21V4M16 4H9M16 4l4 3M9 4v4" /></svg>
          </span>
          <p :data-cy="`${prefix}-project-help`">
            We'll estimate from <b>{{ activeProject.name }}</b>, a past launch<br />
            <span class="est__meta">
              {{ monthYear(activeProject.launch) }} ·
              <button
                v-if="activeProject.classification !== 'STANDARD'"
                type="button"
                class="est__cls"
                :popovertarget="`${prefix}-cls-tip`"
              >{{ labelOf(CLASSIFICATIONS, activeProject.classification) }}</button>
              <template v-else>{{ labelOf(CLASSIFICATIONS, activeProject.classification) }}</template>
              <template v-if="btoKeysYear(choice.applicationYear, activeProject.waitMonths)"> · keys around {{ btoKeysYear(choice.applicationYear, activeProject.waitMonths) }}</template>
            </span>
            <!-- The price the comparison uses: the middle of HDB's range for this launch and flat type (D26). -->
            <template v-if="activeFlat">
              <br /><span class="est__meta" :data-cy="`${prefix}-price-basis`">
                Price used: <strong class="est__price" :data-cy="`${prefix}-price-estimate`">{{ formatMoney(midpointCents / 100) }}</strong>, the middle of HDB's
                <span class="est__range">{{ formatMoney(activeFlat.priceMinCents / 100) }}–{{ formatMoney(activeFlat.priceMaxCents / 100).replace('S$', '') }} range</span>
              </span>
            </template>
          </p>
          <div :id="`${prefix}-cls-tip`" popover class="est__tip">
            {{ labelOf(CLASSIFICATIONS, activeProject.classification) }} flats have a longer minimum occupation period than
            Standard ones, and some of the subsidy is paid back when you sell.
          </div>
        </div>
        <details v-if="launchOptions.length > 1" class="est__more" :open="launchesOpen" @toggle="launchesOpen = $event.target.open">
          <summary :data-cy="`${prefix}-project-more`">
            {{ launchesOpen ? 'Keep this launch' : 'Use a different launch' }}
            <svg class="est__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <fieldset class="launches">
            <legend class="visually-hidden">Launch to estimate from</legend>
            <label v-for="p in launchOptions" :key="p.id" class="launch" :data-cy="`${prefix}-project-${p.id}`">
              <input
                v-model="choice.btoProjectId"
                type="radio"
                class="visually-hidden"
                :name="`${prefix}-project`"
                :value="p.id"
                :data-cy="`${prefix}-project-${p.id}-input`"
              />
              <span class="launch__face">
                <span>
                  <b>{{ p.name }}</b>
                  <small>{{ monthYear(p.launch) }} · {{ labelOf(CLASSIFICATIONS, p.classification) }} · {{ yrsToKeys(p.waitMonths) }}</small>
                </span>
                <span v-if="p.id === newestId" class="launch__new">Newest</span>
              </span>
            </label>
          </fieldset>
        </details>
        <div v-if="err('classification')" class="invalid-feedback d-block">{{ err('classification') }}</div>
      </div>

      <!-- Flat type: all three, the ones this launch doesn't offer greyed out. -->
      <fieldset v-if="activeProject" class="pf__field" :data-cy="`${prefix}-flat-type`">
        <legend class="pf__label">Flat type</legend>
        <div class="choice-row">
          <label v-for="f in BTO_FLAT_TYPES" :key="f.value" class="choice" :data-cy="`${prefix}-flat-type-${slug(f.value)}`">
            <input
              v-model="choice.flatType"
              type="radio"
              class="visually-hidden"
              :name="`${prefix}-flat-type`"
              :value="f.value"
              :disabled="!offeredTypes.has(f.value)"
              :data-cy="`${prefix}-flat-type-${slug(f.value)}-input`"
            />
            <span class="choice__face">{{ f.label }}</span>
          </label>
        </div>
        <p v-if="offeredHint" class="pf__hint" :data-cy="`${prefix}-flat-type-hint`">{{ offeredHint }}</p>
        <div v-if="err('flatType')" class="invalid-feedback d-block">{{ err('flatType') }}</div>
      </fieldset>
    </div>

    <!-- Resale flat (same controls as Your BTO): town, flat type, remaining lease, asking price, parents. -->
    <div v-else class="pf">
      <!-- SLOT: "Have a listing? Find it by postal code or address" goes here, first, once feature/resale-flat-search is
           merged to main; the fields below then sit under a small "Or pick by hand" label. -->
      <div class="pf__field">
        <label :for="`${prefix}-town`" class="pf__label">Town</label>
        <select
          :id="`${prefix}-town`"
          v-model="choice.town"
          class="form-select pf__select"
          :class="{ 'is-invalid': err('town') }"
          :aria-invalid="err('town') ? 'true' : null"
          :data-cy="`${prefix}-town-select`"
        >
          <option :value="null" disabled>Choose a town</option>
          <option v-for="t in townOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <div v-if="err('town')" class="invalid-feedback d-block">{{ err('town') }}</div>
      </div>

      <fieldset class="pf__field" :data-cy="`${prefix}-flat-type`">
        <legend class="pf__label">Flat type</legend>
        <div class="choice-row">
          <label v-for="f in flatTypeOptions" :key="f.value" class="choice" :data-cy="`${prefix}-flat-type-${slug(f.value)}`">
            <input
              v-model="choice.flatType"
              type="radio"
              class="visually-hidden"
              :name="`${prefix}-flat-type`"
              :value="f.value"
              :data-cy="`${prefix}-flat-type-${slug(f.value)}-input`"
            />
            <span class="choice__face">{{ f.label }}</span>
          </label>
        </div>
        <div v-if="err('flatType')" class="invalid-feedback d-block">{{ err('flatType') }}</div>
      </fieldset>

      <fieldset class="pf__field" :data-cy="`${prefix}-lease-band`">
        <legend class="pf__label">Remaining lease (years)</legend>
        <div class="choice-row choice-row--five">
          <label v-for="b in LEASE_BANDS" :key="b.value" class="choice" :data-cy="`${prefix}-lease-band-${b.value}`">
            <input
              v-model="choice.leaseBand"
              type="radio"
              class="visually-hidden"
              :name="`${prefix}-lease-band`"
              :value="b.value"
              :aria-label="b.label"
              :data-cy="`${prefix}-lease-band-${b.value}-input`"
            />
            <span class="choice__face" aria-hidden="true">{{ b.value.replace('-', '–') }}</span>
          </label>
        </div>
        <p class="pf__hint">Check the listing.</p>
        <WhyWeAsk :id="`${prefix}-lease-why`" text="It sets the price we look up, the loan limit and how much CPF you can use." />
        <div v-if="err('leaseBand')" class="invalid-feedback d-block">{{ err('leaseBand') }}</div>
      </fieldset>

      <!-- The listing's asking price, optional (D39) -->
      <div class="pf__field">
        <label :for="`${prefix}-asking-price`" class="pf__label">Asking price <span class="pf__optional">(optional)</span></label>
        <div class="pf__box" :class="{ 'pf__box--invalid': err('resalePrice') }">
          <span class="pf__unit" aria-hidden="true">S$</span>
          <NumberField
            :id="`${prefix}-asking-price`"
            v-model="choice.resalePrice"
            class="pf__input"
            :class="{ 'is-invalid': err('resalePrice') }"
            :aria-invalid="err('resalePrice') ? 'true' : null"
            :aria-describedby="`${prefix}-asking-price-help`"
            :data-cy="`${prefix}-asking-price-input`"
          />
        </div>
        <div v-if="err('resalePrice')" class="invalid-feedback d-block">{{ err('resalePrice') }}</div>
        <!-- One line for the box's state: empty, what blank means; above the median, the cash it takes (D39). -->
        <p v-if="choice.resalePrice == null" :id="`${prefix}-asking-price-help`" class="pf__hint" :data-cy="`${prefix}-asking-price-help`">
          <template v-if="median">Leave blank to use recent sales (median {{ formatMoney(median.medianPriceCents / 100) }}).</template>
          <template v-else-if="medianLoading"><span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Looking up recent sales…</template>
          <template v-else>Leave blank to use recent sales.</template>
        </p>
        <div
          v-else-if="overMedian > 0"
          :id="`${prefix}-asking-price-help`"
          class="alert alert-info small py-2 mb-0 pf__note"
          role="status"
          aria-live="polite"
          :data-cy="`${prefix}-asking-price-cov`"
        >
          <!-- Lucide "info" -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
          <span>{{ formatMoney(overMedian) }} above the <Term id="valuation">median</Term>. That part is paid in cash, not CPF or the loan.</span>
        </div>
      </div>

      <!-- Living with or near parents (only if picked in step 1) -->
      <fieldset v-if="askParents" class="pf__field" :data-cy="`${prefix}-living`">
        <legend class="pf__label">Your parents</legend>
        <div class="choice-row choice-row--wrap">
          <label v-for="l in LIVING" :key="l.value" class="choice" :data-cy="`${prefix}-living-${slug(l.value)}`">
            <input
              v-model="choice.livingArrangement"
              type="radio"
              class="visually-hidden"
              :name="`${prefix}-living`"
              :value="l.value"
              :data-cy="`${prefix}-living-${slug(l.value)}-input`"
            />
            <span class="choice__face">{{ l.label }}</span>
          </label>
        </div>
        <p class="pf__hint">For the Proximity Housing Grant on a resale flat. You declare this; the map is for reference only.</p>
        <div v-if="err('livingArrangement')" class="invalid-feedback d-block">{{ err('livingArrangement') }}</div>
      </fieldset>
    </div>
  </div>
</template>

<style scoped>
/* Your BTO and Resale flat (Calm boards). Picked choices are pink with a dark border, as on About you. */
.pf { display: flex; flex-direction: column; gap: 26px; }
.pf__field { margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pf__field > legend { float: none; width: auto; padding: 0; margin: 0 0 8px; }
.pf__label { margin: 0; font-size: 16px; font-weight: 600; }
.pf__select { height: 56px; border-radius: 14px; border: 1.5px solid #dfe2ea; font-size: 17px; font-weight: 500; padding-inline: 16px 44px; }
.pf__select:focus { border-color: #dfe2ea; box-shadow: none; outline: 2px solid #1d1d24; outline-offset: 2px; }
.pf__hint { margin: 0; font-size: 14px; color: var(--text-secondary, #5f6373); }

.est { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; border-radius: 20px; background: #f3f5fb; }
.est__line { display: flex; gap: 14px; align-items: flex-start; }
.est__ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; background: #e3e6f4; display: grid; place-items: center; }
.est__line p { margin: 0; font-size: 16px; line-height: 1.5; }
.est__meta { font-size: 15px; color: var(--text-secondary, #5f6373); }
.est__price { color: var(--text-primary, #1d1d24); font-weight: 600; } /* the figure the comparison uses (#107) */
.est__range { white-space: nowrap; } /* the range never splits at its dash */
.est__cls {
  padding: 0; border: 0; background: none; font: inherit; font-weight: 600; color: var(--text-primary, #1d1d24);
  text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer;
}
.est__cls:focus-visible { outline: 2px solid #1d1d24; outline-offset: 2px; border-radius: 4px; }
.est__tip {
  margin: auto; max-width: 320px; padding: 16px 18px; border: 0; border-radius: 16px;
  background: #1d1d24; color: #ffffff; font-size: 14px; line-height: 1.45; box-shadow: 0 16px 40px rgba(29, 29, 36, 0.25);
}
.est__tip::backdrop { background: rgba(29, 29, 36, 0.12); }
.est__more summary {
  display: inline-flex; align-items: center; gap: 6px; width: max-content; margin-left: 54px; cursor: pointer; list-style: none;
  font-size: 15px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px;
}
.est__more summary::-webkit-details-marker { display: none; }
.est__more summary:focus-visible { outline: 2px solid #1d1d24; outline-offset: 3px; border-radius: 4px; }
.est__chev { transition: transform 0.15s; }
.est__more[open] .est__chev { transform: rotate(180deg); }
.launches { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 0 54px; padding: 0; border: 0; }
.launch { position: relative; display: block; margin: 0; }
.launch__face {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; cursor: pointer;
  border-radius: 14px; border: 1.5px solid #dfe2ea; background: #ffffff;
}
.launch:hover .launch__face { border-color: #b9bfcd; }
.launch input:checked + .launch__face { background: #fdf0f6; border-color: #1d1d24; }
.launch input:focus-visible + .launch__face { outline: 2px solid #1d1d24; outline-offset: 3px; }
.launch b { display: block; font-size: 15px; font-weight: 600; }
.launch small { font-size: 13px; color: var(--text-secondary, #5f6373); }
.launch__new { padding: 3px 9px; border-radius: 999px; background: #f3f3f5; color: var(--text-secondary, #5f6373); font-size: 12px; font-weight: 600; white-space: nowrap; }

.choice-row { display: flex; gap: 8px; }
.choice-row--wrap { flex-wrap: wrap; }
.choice-row--wrap .choice { flex: 1 1 160px; }
.pf__optional { font-weight: 400; color: var(--text-secondary, #5f6373); }
.pf__note { display: flex; gap: 10px; align-items: flex-start; }
.pf__note svg { flex-shrink: 0; margin-top: 1px; }
.pf__box {
  display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; border-radius: 14px;
  border: 1.5px solid #dfe2ea; background: #ffffff; transition: border-color 0.15s, box-shadow 0.15s;
}
.pf__box:focus-within { border-color: #1d1d24; box-shadow: 0 0 0 4px var(--color-blush, #fbd5e5); }
.pf__box--invalid { border-color: var(--bs-form-invalid-border-color, #dc3545); }
.pf__unit { font-size: 16px; font-weight: 500; color: var(--text-secondary, #5f6373); }
.pf__input { flex: 1; min-width: 0; padding: 0; border: 0; outline: none; background: transparent; font-size: 18px; font-weight: 600; color: var(--text-primary, #1d1d24); }
/* Five lease bands on one row from a small laptop up; two rows on phones. */
@media (max-width: 575.98px) {
  .choice-row--five { flex-wrap: wrap; }
  .choice-row--five .choice { flex: 1 1 calc(33% - 8px); }
}
.choice { position: relative; flex: 1 1 0; min-width: 0; margin: 0; } /* three across at every width */
.choice__face {
  display: flex; align-items: center; justify-content: center; height: 54px; padding: 0 12px; cursor: pointer;
  border-radius: 14px; border: 1.5px solid #dfe2ea; background: #ffffff; font-size: 16px; font-weight: 500; white-space: nowrap;
}
.choice:hover .choice__face { border-color: #b9bfcd; }
.choice input:checked + .choice__face { background: #fdf0f6; border-color: #1d1d24; }
.choice input:disabled + .choice__face { background: #f7f8fa; color: #6b7080; border-style: dashed; cursor: not-allowed; }
.choice input:focus-visible + .choice__face { outline: 2px solid #1d1d24; outline-offset: 3px; }
@media (max-width: 767.98px) {
  .est__more summary, .launches { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .est__chev { transition: none; }
}
</style>
