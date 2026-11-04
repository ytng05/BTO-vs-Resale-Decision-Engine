<script setup>
// Step 2 of the plan stepper, "About you" (D38): the two buyers, cash savings, and the move-in year when
// the household picked "moving in by a date" in step 1. Asked one question per screen (Calm "Easier onboarding"
// board): `part` is the screen, 0 ages, 1 citizenship and first-timer, 2 incomes, 3 CPF, cash and move-in year.
// Price and income growth, the comparison year and rent while waiting are not asked here: they have defaults and
// are changed on the Dashboard (D35).
// Reads and writes the Pinia store directly; PlanView owns validation and passes errors in: `errors` once the user
// has pressed Next, `liveErrors` always. A field shows its live error once the user has left it (blur), then updates
// as they type, so a half-typed number is not flagged mid-keystroke.
// Field names follow the store (contract v2/v2.1). Money is in dollars here; client.js sends cents.
import Term from './Term.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useScenarioStore } from '../stores/scenario.js';
import { ehgEstimate, getRuleset, getScenario, listScenarios } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { matchingValues, savedValues, suggestionLabel, valueAt } from '../utils/savedProfiles.js';
import { formatMoney } from '../utils/format.js';
import { CITIZENSHIPS, REQUIRED_APPLICANTS, blankApplicant } from '../constants/planOptions.js';
import { cpfLooksHigh } from '../validation/planValidation.js';
import NumberField from './NumberField.vue';
import SavedValueList from './SavedValueList.vue';

const props = defineProps({
  errors: { type: Object, default: () => ({}) },
  liveErrors: { type: Object, default: () => ({}) },
  part: { type: Number, default: 0 },
});

// Buyer 1 is the person filling in the plan, buyer 2 the other buyer (a partner, parent or child).
const WHO = ['You', 'The other buyer'];

const store = useScenarioStore();
const applicants = computed(() => store.profile.applicants);
const currentYear = new Date().getFullYear();

// Autofill, like the browser's own suggestions: each About you number box offers the different answers it had in the
// user's saved scenarios (utils/savedProfiles.js), filtered by what is typed so far. Picking one fills that box only.
// A box is named by the same key as its error ('applicants.0.age', 'cashSavings').
const auth = useAuthStore();
const openField = ref(null); // the box that has the focus, so its suggestions show
const SCENARIOS_TO_CHECK = 10;

// Loads the answers once and keeps them in the store (store.savedProfiles), so going back and forth, or a fresh
// plan, does not fetch them again. A new save or logging out clears them.
onMounted(async function () {
  if (!auth.isLoggedIn || store.savedProfiles !== null) {
    return;
  }
  try {
    const list = (await listScenarios()).scenarios.slice(0, SCENARIOS_TO_CHECK);
    const requests = [];
    for (const s of list) {
      requests.push(getScenario(s.id));
    }
    const profiles = [];
    for (const data of await Promise.all(requests)) {
      profiles.push(data.scenario.profile);
    }
    store.savedProfiles = profiles; // a box already focused shows its suggestions now
  } catch (err) {
    // No suggestions this time rather than an error; it tries again next time.
  }
});

// The suggestions for the focused box: [{ value, label }], empty when there are none.
const suggestions = computed(function () {
  if (openField.value === null) {
    return [];
  }
  const values = matchingValues(savedValues(store.savedProfiles || [], openField.value), valueAt(store.profile, openField.value));
  const options = [];
  for (const value of values) {
    options.push({ value: value, label: suggestionLabel(openField.value, value) });
  }
  return options;
});

function openSuggestions(field) {
  openField.value = field;
}

function closeSuggestions() {
  openField.value = null;
}

// Whether a box's list is showing, and its id for aria-controls (only one list is open at a time).
function listOpen(field) {
  return openField.value === field && suggestions.value.length > 0;
}

function listId(field) {
  if (listOpen(field)) {
    return 'situation-autofill-list';
  }
  return null;
}

// Closes once the focus leaves the box and its list, so the down arrow and Tab can reach the list.
function onFieldFocusOut(event) {
  if (event.currentTarget.contains(event.relatedTarget)) {
    return;
  }
  closeSuggestions();
}

// Down arrow in a box: into its list.
function focusFirstSuggestion(event) {
  const first = event.target.closest('.big-field').querySelector('.autofill__item');
  if (first) {
    event.preventDefault();
    first.focus();
  }
}

// Esc in the list: back to the box, with the list closed.
function backToField(inputId) {
  document.getElementById(inputId).focus();
  closeSuggestions();
}

function pickSuggestion(value) {
  const parts = openField.value.split('.');
  if (parts.length === 1) {
    store.profile[parts[0]] = value;
  } else {
    store.profile.applicants[Number(parts[1])][parts[2]] = value;
  }
  closeSuggestions();
}

// The contract models exactly two buyers (API_CONTRACT.md), so always show two.
while (store.profile.applicants.length < REQUIRED_APPLICANTS) {
  store.profile.applicants.push(blankApplicant());
}
if (!store.profile.constraints) store.profile.constraints = { moveInByYear: null };

// Shown when picked in step 1, or when a saved plan already has a year.
const askMoveIn = computed(() => store.wishes.includes('moveby') || store.profile.constraints.moveInByYear != null);

// Fields the user has left at least once: their live errors show from then on.
const left = ref(new Set());
const leave = (key) => { left.value = new Set(left.value).add(key); };
const err = (key) => props.errors[key] ?? (left.value.has(key) ? props.liveErrors[key] : undefined);
// "At least one of you needs to be a Singapore Citizen" shows as soon as both are PR, not only after Next.
const bothPr = computed(() => applicants.value.every((a) => a.citizenship === 'PR'));

// The two incomes added up, once both are in.
const incomeTotal = computed(() => {
  const [a, b] = applicants.value;
  return typeof a?.monthlyIncome === 'number' && typeof b?.monthlyIncome === 'number' ? a.monthlyIncome + b.monthlyIncome : null;
});

// ---- Early EHG estimate from seat 2's grant rules (POST /api/grants), once both buyers' ages and
// incomes are in. Projected to the plan's application year, as Results works it out, so the two agree.
// Worded as an estimate: the flat comes later. Hidden on mock data.
// ---- Income ceilings (D36): the household's income in the application year, each buyer grown and rounded to the
// cent as the engine does (D13), against the ruleset's limits for buying a BTO flat and for an HDB loan. At the
// limit passes. Above the BTO limit this leads, and the EHG estimate is not shown (it would be the smaller point).
const ceilings = ref(null); // { bto, loan } in dollars a month, from the ruleset
getRuleset().then((r) => {
  const bto = r?.rules?.eligibility?.newFlatIncomeCeiling?.family;
  const loan = r?.rules?.loans?.hdbLoanIncomeCeiling?.family;
  if (typeof bto === 'number' && typeof loan === 'number') ceilings.value = { bto, loan };
}).catch(() => {}); // no ruleset: no ceiling message, the EHG estimate as before
const projection = computed(() => {
  if (incomeTotal.value === null) return null;
  const year = store.choiceA.applicationYear ?? currentYear + 1;
  const years = Math.max(0, year - currentYear);
  const growth = store.assumptions.annualIncomeGrowth ?? 0;
  const income = applicants.value.reduce((sum, a) => sum + Math.round(a.monthlyIncome * (1 + growth) ** years * 100) / 100, 0);
  return { year, years, income, growthPct: Math.round(growth * 1000) / 10 };
});
const overBto = computed(() => Boolean(ceilings.value && projection.value && projection.value.income > ceilings.value.bto));
const overLoan = computed(() => Boolean(ceilings.value && projection.value && projection.value.income > ceilings.value.loan));

const ehg = ref(null); // { cents, reason, year, growthPct, years } or null
const ehgLoading = ref(false); // the estimate is on its way: a quiet status line, not a blank gap
const ready = computed(() => applicants.value.length === REQUIRED_APPLICANTS && applicants.value.every(
  (a) => Number.isInteger(a.age) && a.age >= 18 && typeof a.monthlyIncome === 'number' && a.monthlyIncome >= 0,
));
let timer = null;
let requestId = 0;
async function refreshEhg() {
  if (!ready.value) { ehg.value = null; ehgLoading.value = false; return; }
  const id = ++requestId;
  ehgLoading.value = true;
  try {
    const res = await ehgEstimate(store);
    if (id !== requestId) return; // a newer edit is already on its way
    const grant = res.mock ? null : res.grants?.find((g) => g.id === 'EHG');
    if (!grant) { ehg.value = null; return; }
    const band = grant.tests.find((t) => t.id === 'EHG_INCOME_BAND' && t.passed);
    const failed = grant.tests.find((t) => !t.passed);
    ehg.value = {
      cents: grant.amountCents,
      reason: (grant.amountCents > 0 ? band : failed)?.reason ?? '',
      year: res.applicationYear,
      years: res.years,
      growthPct: Math.round((store.assumptions.annualIncomeGrowth ?? 0) * 1000) / 10,
      // Household income in the application year, each buyer grown and rounded to the cent as the engine does (D13).
      income: applicants.value.reduce((sum, a) => sum
        + Math.round(a.monthlyIncome * (1 + (store.assumptions.annualIncomeGrowth ?? 0)) ** res.years * 100) / 100, 0),
    };
  } catch {
    if (id === requestId) ehg.value = null; // the hint is a bonus: no error message for it
  } finally {
    if (id === requestId) ehgLoading.value = false;
  }
}
watch(
  () => applicants.value.map((a) => [a.age, a.citizenship, a.firstTimer, a.monthlyIncome]),
  () => { clearTimeout(timer); timer = setTimeout(refreshEhg, 400); },
  { deep: true, immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div data-cy="situation-form" :data-part="part">
    <!-- 0 · How old are you both? -->
    <div v-if="part === 0" class="pair">
      <div v-for="(a, i) in applicants" :key="a.id ?? i" class="big-field" :data-cy="`situation-buyer-${i + 1}`" @focusout="onFieldFocusOut">
        <label :for="`buyer-${i}-age`" class="big-field__label">{{ WHO[i] }}</label>
        <div class="big-box">
          <NumberField
            :id="`buyer-${i}-age`"
            v-model="a.age"
            :grouped="false"
            :max-digits="3"
            :aria-invalid="err(`applicants.${i}.age`) ? 'true' : null"
            :aria-describedby="err(`applicants.${i}.age`) ? `buyer-${i}-age-error` : null"
            class="big-box__input"
            :class="{ 'is-invalid': err(`applicants.${i}.age`) }"
            :data-cy="`situation-buyer-${i + 1}-age-input`"
            @blur="leave(`applicants.${i}.age`)"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="String(listOpen(`applicants.${i}.age`))"
            :aria-controls="listId(`applicants.${i}.age`)"
            @focus="openSuggestions(`applicants.${i}.age`)"
            @keydown.down="focusFirstSuggestion"
            @keydown.esc="closeSuggestions"
          />
          <SavedValueList
            id="situation-autofill-list"
            v-if="listOpen(`applicants.${i}.age`)"
            :options="suggestions"
            @pick="pickSuggestion"
            @close="backToField(`buyer-${i}-age`)"
          />
        </div>
        <div v-if="err(`applicants.${i}.age`)" :id="`buyer-${i}-age-error`" class="invalid-feedback d-block" :data-cy="`situation-buyer-${i + 1}-age-error`">{{ err(`applicants.${i}.age`) }}</div>
      </div>
    </div>

    <!-- 1 · Who is buying? Per person: citizenship (two radio buttons) and first-timer (a switch with Yes / No). -->
    <template v-else-if="part === 1">
      <div class="who">
        <fieldset v-for="(a, i) in applicants" :key="a.id ?? i" class="who__person" :data-cy="`situation-buyer-${i + 1}`">
          <legend class="who__legend">{{ WHO[i] }}</legend>
          <div class="who__group">
            <span :id="`buyer-${i}-citizenship-label`" class="who__label">Citizenship</span>
            <div class="cit" role="radiogroup" :aria-labelledby="`buyer-${i}-citizenship-label`">
              <label v-for="c in CITIZENSHIPS" :key="c.value" class="cit__opt" :class="{ 'cit__opt--wide': c.value === 'SC' }">
                <input
                  v-model="a.citizenship"
                  class="visually-hidden"
                  type="radio"
                  :name="`buyer-${i}-citizenship`"
                  :value="c.value"
                  :data-cy="`situation-buyer-${i + 1}-citizenship-${c.value}`"
                />
                <span class="cit__face">{{ c.value === 'PR' ? 'PR' : c.label }}</span>
              </label>
            </div>
            <div v-if="err(`applicants.${i}.citizenship`)" class="invalid-feedback d-block" :data-cy="`situation-buyer-${i + 1}-citizenship-error`">{{ err(`applicants.${i}.citizenship`) }}</div>
          </div>
          <div class="who__group">
            <span class="who__label"><span :id="`buyer-${i}-first-timer-label`">First-timer</span> <span :id="`buyer-${i}-first-timer-hint`" class="who__hint">Never had an HDB subsidy</span></span>
            <label class="switch">
              <input
                v-model="a.firstTimer"
                class="visually-hidden"
                type="checkbox"
                role="switch"
                :aria-labelledby="`buyer-${i}-first-timer-label`"
                :aria-describedby="`buyer-${i}-first-timer-hint`"
                :data-cy="`situation-buyer-${i + 1}-first-timer-switch`"
              />
              <span class="switch__track" aria-hidden="true"><span class="switch__knob"></span></span>
              <span class="switch__state" aria-hidden="true">{{ a.firstTimer ? 'Yes' : 'No' }}</span>
            </label>
          </div>
        </fieldset>
      </div>
      <!-- Shown as soon as the second PR is picked, cleared as soon as either is a citizen. -->
      <p class="who__error" aria-live="polite" data-cy="situation-applicants-error">
        <template v-if="bothPr">At least one of you needs to be a Singapore Citizen.</template>
        <template v-else-if="err('applicants')">{{ err('applicants') }}</template>
      </p>
    </template>

    <!-- 2 · What do you each earn a month? The total, then the early EHG estimate. -->
    <template v-else-if="part === 2">
      <div class="pair">
                <div v-for="(a, i) in applicants" :key="a.id ?? i" class="big-field" :data-cy="`situation-buyer-${i + 1}`" @focusout="onFieldFocusOut">
          <label :for="`buyer-${i}-income`" class="big-field__label">{{ WHO[i] }}</label>
          <div class="big-box">
            <span class="big-box__unit" aria-hidden="true">S$</span>
            <NumberField
              :id="`buyer-${i}-income`"
              v-model="a.monthlyIncome" :decimals="2"
              :aria-invalid="err(`applicants.${i}.monthlyIncome`) ? 'true' : null"
              class="big-box__input"
              :class="{ 'is-invalid': err(`applicants.${i}.monthlyIncome`) }"
              :data-cy="`situation-buyer-${i + 1}-income-input`"
              @blur="leave(`applicants.${i}.monthlyIncome`)"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="String(listOpen(`applicants.${i}.monthlyIncome`))"
              :aria-controls="listId(`applicants.${i}.monthlyIncome`)"
              @focus="openSuggestions(`applicants.${i}.monthlyIncome`)"
              @keydown.down="focusFirstSuggestion"
              @keydown.esc="closeSuggestions"
            />
            <SavedValueList
              id="situation-autofill-list"
              v-if="listOpen(`applicants.${i}.monthlyIncome`)"
              :options="suggestions"
              @pick="pickSuggestion"
              @close="backToField(`buyer-${i}-income`)"
            />
          </div>
          <div v-if="err(`applicants.${i}.monthlyIncome`)" class="invalid-feedback d-block" :data-cy="`situation-buyer-${i + 1}-income-error`">{{ err(`applicants.${i}.monthlyIncome`) }}</div>
        </div>
      </div>
      <p class="big-field__help">Before CPF. Enter 0 if not working.</p>
      <p v-if="incomeTotal !== null" class="big-field__total" aria-live="polite" data-cy="situation-income-total">Together: {{ formatMoney(incomeTotal) }} a month</p>

      <!-- Above the BTO income limit in the year they apply: that leads, instead of the EHG estimate (D36). -->
      <div v-if="overBto" class="alert alert-warning small py-2 mb-0" role="status" aria-live="polite" data-cy="situation-ceiling-hint">
        <strong>If you apply in {{ projection.year }}, your income would be above the {{ formatMoney(ceilings.bto) }} a month limit for buying a BTO flat.</strong>
        <template v-if="projection.years > 0"> With {{ projection.growthPct }}% yearly pay rises, you'd earn about {{ formatMoney(projection.income) }} a month together by then.</template>
        You can still compare resale flats, which have no income limit<template v-if="overLoan">, but you'd need a bank loan instead of an HDB loan</template>.
        The comparison still works out the BTO flat, and the dashboard warns that you couldn't buy it that year<template v-if="overLoan">. Its figures assume an HDB loan, as bank loans aren't modelled yet</template>.
      </div>
      <div v-else-if="overLoan" class="alert alert-warning small py-2 mb-0" role="status" aria-live="polite" data-cy="situation-loan-ceiling-hint">
        <strong>If you apply in {{ projection.year }}, your income would be above the {{ formatMoney(ceilings.loan) }} a month limit for an HDB loan,</strong>
        so you'd need a bank loan. The comparison's figures still assume an HDB loan, as bank loans aren't modelled yet.
      </div>

      <!-- Early estimate: the EHG in the application year, incomes grown as on Results (D38). Not above the BTO limit. -->
      <template v-if="!overBto">
      <div v-if="ehgLoading && !ehg" class="form-text" role="status" data-cy="situation-ehg-loading">
        <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Checking your housing grant…
      </div>
      <div v-if="ehg" class="alert alert-info small py-2 mb-0" role="status" aria-live="polite" data-cy="situation-ehg-hint">
        <template v-if="ehg.cents > 0">
          <strong>If you apply in {{ ehg.year }}, you could get {{ formatMoney(ehg.cents / 100) }} from the <Term id="ehg">Enhanced CPF Housing Grant</Term>.</strong>
          That's based on your household income then: about {{ formatMoney(ehg.income) }} a month<template v-if="ehg.years > 0">, if your pay rises {{ ehg.growthPct }}% a year</template>.
        </template>
        <template v-else>
          <strong>If you apply in {{ ehg.year }}, you probably won't get the <Term id="ehg">Enhanced CPF Housing Grant</Term>.</strong>
          {{ ehg.reason }}<template v-if="ehg.years > 0"> This assumes your pay rises {{ ehg.growthPct }}% a year.</template>
        </template>
        We'll confirm all your grants once you choose your flats.
      </div>
      </template>
    </template>

    <!-- 3 · What have you saved? CPF Ordinary Account for each, then the household's cash and move-in year. -->
    <div v-else class="groups">
      <fieldset class="choice-set">
        <legend class="big-field__group">CPF Ordinary Account</legend>
        <div class="pair">
                    <div v-for="(a, i) in applicants" :key="a.id ?? i" class="big-field" :data-cy="`situation-buyer-${i + 1}`" @focusout="onFieldFocusOut">
            <label :for="`buyer-${i}-cpf`" class="big-field__label">{{ WHO[i] }}</label>
            <div class="big-box">
              <span class="big-box__unit" aria-hidden="true">S$</span>
              <NumberField
                :id="`buyer-${i}-cpf`"
                v-model="a.cpfOaBalance" :decimals="2"
                :aria-invalid="err(`applicants.${i}.cpfOaBalance`) ? 'true' : null"
                :aria-describedby="cpfLooksHigh(a.age, a.cpfOaBalance) ? `buyer-${i}-cpf-high` : null"
                class="big-box__input"
                :class="{ 'is-invalid': err(`applicants.${i}.cpfOaBalance`) }"
                :data-cy="`situation-buyer-${i + 1}-cpf-input`"
                @blur="leave(`applicants.${i}.cpfOaBalance`)"
                role="combobox"
                aria-autocomplete="list"
                :aria-expanded="String(listOpen(`applicants.${i}.cpfOaBalance`))"
                :aria-controls="listId(`applicants.${i}.cpfOaBalance`)"
                @focus="openSuggestions(`applicants.${i}.cpfOaBalance`)"
                @keydown.down="focusFirstSuggestion"
                @keydown.esc="closeSuggestions"
              />
              <SavedValueList
                id="situation-autofill-list"
                v-if="listOpen(`applicants.${i}.cpfOaBalance`)"
                :options="suggestions"
                @pick="pickSuggestion"
                @close="backToField(`buyer-${i}-cpf`)"
              />
            </div>
            <div v-if="err(`applicants.${i}.cpfOaBalance`)" class="invalid-feedback d-block" :data-cy="`situation-buyer-${i + 1}-cpf-error`">{{ err(`applicants.${i}.cpfOaBalance`) }}</div>
            <!-- A soft check: probably a typo, but it never blocks Next (cpfLooksHigh in planValidation.js). -->
            <p v-else-if="cpfLooksHigh(a.age, a.cpfOaBalance)" :id="`buyer-${i}-cpf-high`" class="big-field__warn" :data-cy="`situation-buyer-${i + 1}-cpf-high`">
              That's higher than usual. Double&#8209;check?
            </p>
          </div>
        </div>
      </fieldset>
      <div class="pair">
                <div class="big-field" @focusout="onFieldFocusOut">
          <label for="cash-savings" class="big-field__group">Cash savings (both of you)</label>
          <div class="big-box">
            <span class="big-box__unit" aria-hidden="true">S$</span>
            <NumberField
              id="cash-savings"
              v-model="store.profile.cashSavings" :decimals="2"
              aria-describedby="cash-savings-help"
              :aria-invalid="err('cashSavings') ? 'true' : null"
              class="big-box__input"
              :class="{ 'is-invalid': err('cashSavings') }"
              data-cy="situation-cash-savings-input"
              @blur="leave('cashSavings')"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="String(listOpen('cashSavings'))"
              :aria-controls="listId('cashSavings')"
              @focus="openSuggestions('cashSavings')"
              @keydown.down="focusFirstSuggestion"
              @keydown.esc="closeSuggestions"
            />
            <SavedValueList
              id="situation-autofill-list"
              v-if="listOpen('cashSavings')"
              :options="suggestions"
              @pick="pickSuggestion"
              @close="backToField('cash-savings')"
            />
          </div>
          <p v-if="!err('cashSavings')" id="cash-savings-help" class="big-field__help">Enter 0 if none.</p>
          <div v-if="err('cashSavings')" class="invalid-feedback d-block">{{ err('cashSavings') }}</div>
        </div>
        <div v-if="askMoveIn" class="big-field">
          <label for="move-in-by" class="big-field__group">Must move in by <span class="big-field__optional">(optional)</span></label>
          <div class="big-box">
            <NumberField
              id="move-in-by"
              v-model="store.profile.constraints.moveInByYear"
              :grouped="false"
              :max-digits="4"
              aria-describedby="move-in-by-help"
              :aria-invalid="err('moveInByYear') ? 'true' : null"
              class="big-box__input"
              :class="{ 'is-invalid': err('moveInByYear') }"
              data-cy="situation-move-in-by-input"
              @blur="leave('moveInByYear')"
            />
          </div>
          <p id="move-in-by-help" class="big-field__help">We'll tell you if a path's keys come later than this. Leave blank for no deadline.</p>
          <div v-if="err('moveInByYear')" class="invalid-feedback d-block">{{ err('moveInByYear') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Calm "Easier onboarding" board: big answer boxes, the two buyers side by side (stacked on narrow screens). */
[data-cy="situation-form"] { display: flex; flex-direction: column; gap: 16px; }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.pair--stack { grid-template-columns: minmax(0, 1fr); gap: 20px; }
.big-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.big-field__label { margin: 0; font-size: 15px; font-weight: 600; }
.big-field__help { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.45; }
.big-box {
  display: flex; align-items: center; gap: 10px; height: 64px; box-sizing: border-box; padding: 0 18px;
  border-radius: 16px; background: var(--bg-surface); border: 1.5px solid var(--border);
  transition: border-color 0.15s, box-shadow 0.15s;
}
/* The transparent outline shows in Windows high-contrast mode, which drops box-shadow. */
.big-box:focus-within { border-color: var(--text-primary); box-shadow: 0 0 0 4px var(--accent-fill-2); outline: 2px solid transparent; }
.big-box:has(.is-invalid) { border-color: var(--danger); }
.big-box__input {
  flex: 1; min-width: 0; padding: 0; border: 0; outline: none; background: transparent;
  font-size: 22px; font-weight: 600; color: var(--text-primary);
  appearance: textfield; -moz-appearance: textfield;
}
.big-box__input::-webkit-inner-spin-button,
.big-box__input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.big-box__unit { font-size: 16px; font-weight: 500; color: var(--text-secondary); }
.big-field__group { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
.big-field__optional { font-weight: 400; color: var(--text-secondary); } /* = PathForm's pf__optional */
legend.big-field__group { margin-bottom: 12px; }
/* What have you saved?: CPF, cash and the move-in year read as separate groups, 24px apart. */
.groups { display: flex; flex-direction: column; gap: 24px; }
.groups > .pair { row-gap: 24px; }
.big-field__total { margin: 0; font-size: 16px; font-weight: 600; }
.big-field__warn { margin: 0; font-size: 14px; color: var(--warning); }
.choice-set { margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.choice-set > legend { float: none; width: auto; padding: 0; }
/* Who is buying? (Cadence's spec, 3 Nov 2026): two people side by side, stacked below 768px. */
.who { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
@media (max-width: 767.98px) { .who { grid-template-columns: minmax(0, 1fr); } }
.who__person { margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
/* A legend is not a flex item, so the fieldset's gap does not reach it: its own 12px below. */
.who__legend { float: none; width: auto; margin: 0 0 12px; padding: 0; font-size: 15px; font-weight: 600; } /* = big-field__label */
.who__group { display: flex; flex-direction: column; gap: 8px; }
.who__label { font-size: 15px; font-weight: 600; }
.who__hint { font-weight: 400; color: var(--text-secondary); }
.cit { display: flex; gap: 8px; }
.cit__opt { flex: 1 1 0; min-width: 0; margin: 0; }
.cit__opt--wide { flex-grow: 1.8; }
.cit__face {
  display: grid; place-items: center; height: 54px; padding: 0 10px; border-radius: 14px; cursor: pointer;
  background: var(--bg-surface); border: 1.5px solid var(--border); color: var(--text-primary);
  font-size: 16px; font-weight: 500; text-align: center; white-space: nowrap;
  transition: border-color 0.15s, background-color 0.15s;
}
.cit__opt:hover .cit__face { border-color: var(--border-strong); }
.cit__opt input:checked + .cit__face { background: var(--accent-tint); border-color: var(--text-primary); }
.cit__opt input:focus-visible + .cit__face { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.switch { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; margin: 0; cursor: pointer; align-self: flex-start; }
.switch__track { position: relative; flex-shrink: 0; width: 50px; height: 30px; border-radius: 15px; background: var(--border-strong); transition: background-color 0.15s; }
.switch__knob {
  position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg-surface);
  box-shadow: 0 1px 3px rgba(29, 29, 36, 0.25); transition: transform 0.15s;
}
.switch input:checked + .switch__track { background: var(--text-primary); }
.switch input:checked + .switch__track .switch__knob { transform: translateX(20px); }
.switch input:focus-visible + .switch__track { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.switch__state { font-size: 15px; font-weight: 600; }
.who__error { margin: 0; min-height: 0; font-size: 14px; color: var(--danger); }
.who__error:empty { display: none; }
/* Phones: a size down, so a six-figure CPF balance fits its box in full. */
@media (max-width: 575.98px) {
  .big-box { height: 56px; padding: 0 14px; }
  .big-box__input { font-size: 19px; }
}
@media (prefers-reduced-motion: reduce) {
  .big-box, .cit__face, .switch__track, .switch__knob { transition: none; }
}
/* Autofill: each box's suggestion list (SavedValueList.vue) hangs just under it */
.big-box { position: relative; }

</style>