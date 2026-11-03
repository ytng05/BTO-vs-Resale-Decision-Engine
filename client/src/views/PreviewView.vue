<script setup>
// The results teaser between the last plan step and Results (Calm "Easier onboarding" board, screens 4 and 5):
// "Working out your numbers…" while the comparison runs, then, for each priority picked in step 1 that the engine
// has a figure for, both paths' figures side by side. Figures only: which path "fits better" is a rule still to be
// written and approved (the VERDICT slot below), so the page does not say. Picks without a figure are listed with a
// pointer to the full comparison. PlanView only sends people here when at least one pick has a figure.
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { compare } from '../api/client.js';
import { useScenarioStore, WISHES } from '../stores/scenario.js';
import BtoScene from '../components/BtoScene.vue';
import { formatMoney } from '../utils/format.js';
import { isPlanComplete } from '../validation/planValidation.js';
import { PREVIEW_WISHES } from '../constants/planOptions.js';

const store = useScenarioStore();
const router = useRouter();

const result = ref(null);
const error = ref(null);
const loading = ref(false);
const hasInputs = computed(() => isPlanComplete(store));

const labelOf = (key) => WISHES.find((w) => w.key === key)?.label ?? key;
const shown = computed(() => store.wishes.filter((k) => PREVIEW_WISHES.includes(k)));
const notShown = computed(() => store.wishes.filter((k) => !PREVIEW_WISHES.includes(k)).map(labelOf));

// "From your answers": the picks, both ages and the incomes added up.
const answers = computed(() => {
  const [a, b] = store.profile.applicants;
  const income = (a?.monthlyIncome ?? 0) + (b?.monthlyIncome ?? 0);
  return [...store.wishes.map(labelOf), `Ages ${a?.age} and ${b?.age}`, `${formatMoney(income)} a month together`];
});

const moveInBy = computed(() => store.profile.constraints?.moveInByYear ?? null);
const yearOf = (date) => Number(String(date ?? '').slice(0, 4)) || null;

// One card per shown pick: each path's figure from the engine (Path A is the BTO, Path B the resale flat).
function sideFor(key, outcome) {
  if (key === 'moveby') {
    const year = yearOf(outcome.timeline?.keyCollectionDate);
    let note = null;
    // The engine's own check (keys year later than the move-in year warns MOVE_IN_DEADLINE_MISSED), made here from
    // the keys year so the note never disagrees with the year beside it.
    if (moveInBy.value && year) note = year > moveInBy.value ? `After your ${moveInBy.value}` : `By your ${moveInBy.value}`;
    return { value: year ? `Keys in ${year}` : '—', note };
  }
  if (key === 'cash') return { value: formatMoney(outcome.cashRequiredAtPurchaseCents / 100), note: 'Cash at purchase' };
  return { value: formatMoney(outcome.loanPrincipalCents / 100), note: 'Loan to take' };
}
const WHY = {
  moveby: 'When each path gets you the keys.',
  cash: 'What each path takes from your savings when you buy, after CPF and grants.',
  monthly: 'How much each path borrows. A bigger loan usually means bigger monthly payments.',
};
const cards = computed(() => {
  const r = result.value;
  if (!r) return [];
  return shown.value.map((key) => ({
    key,
    title: labelOf(key),
    why: WHY[key],
    bto: sideFor(key, r.outcomeA),
    resale: sideFor(key, r.outcomeB),
    // VERDICT (Cadence, not built yet): 'BTO' | 'RESALE' | null, from the rule for this pick. Null shows no label.
    verdict: null,
  }));
});

async function load() {
  error.value = null;
  loading.value = true;
  try {
    result.value = await compare(store);
  } catch (e) {
    error.value = e?.response?.data?.error ?? 'We could not work out your numbers just now.';
  } finally {
    loading.value = false;
  }
}

function editAnswers() {
  store.step = 0;
  router.push('/plan');
}

onMounted(() => {
  if (!hasInputs.value) return;
  if (!shown.value.length) {
    router.replace('/results');
    return;
  }
  load();
});
</script>

<template>
  <section class="preview card" data-cy="preview">
    <div v-if="!hasInputs" data-cy="preview-empty">
      <h1 class="preview__title">No plan to compare yet</h1>
      <p class="preview__lead">Enter your situation and both paths first.</p>
      <RouterLink to="/plan" class="btn btn-primary">Start planning</RouterLink>
    </div>

    <!-- Screen 4: while the comparison runs. No made-up percentages: an indeterminate bar until it is back. -->
    <div v-else-if="loading" class="preview__working" data-cy="preview-loading" aria-busy="true">
      <div class="preview__working-text">
        <h1 class="preview__title" role="status">Working out your numbers…</h1>
        <p class="preview__lead">Grants, loans and both flats, for what matters to you.</p>
        <div class="preview__bar" aria-hidden="true"><span></span></div>
      </div>
      <div class="preview__art"><BtoScene :wishes="store.wishes" /></div>
    </div>

    <div v-else-if="error" data-cy="preview-error">
      <h1 class="preview__title">Something went wrong</h1>
      <p class="preview__lead">{{ error }}</p>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline-secondary" @click="load">Try again</button>
        <RouterLink to="/results" class="btn btn-primary">See the full comparison</RouterLink>
      </div>
    </div>

    <!-- Screen 5: the teaser -->
    <template v-else-if="result">
      <div class="preview__top">
        <RouterLink to="/plan" class="preview__iconbtn" aria-label="Back to your answers" data-cy="preview-back">
          <!-- Lucide "chevron-left" -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </RouterLink>
      </div>
      <div class="preview__head">
        <h1 class="preview__title">How BTO and resale compare on what matters to you</h1>
        <div class="preview__answers">
          <span class="preview__answers-label">From your answers:</span>
          <span v-for="a in answers" :key="a" class="preview__chip">{{ a }}</span>
          <button type="button" class="btn btn-link preview__edit" data-cy="preview-edit" @click="editAnswers">Edit</button>
        </div>
      </div>

      <div class="preview__cards">
        <article v-for="c in cards" :key="c.key" class="fit-card" :data-cy="`preview-card-${c.key}`">
          <div class="fit-card__hd">
            <h2 class="fit-card__title">{{ c.title }}</h2>
            <!-- VERDICT slot: shows only once the rule for this pick exists (c.verdict). -->
            <span v-if="c.verdict" class="fit-card__verdict">{{ c.verdict === 'BTO' ? 'BTO fits better' : 'Resale fits better' }}</span>
          </div>
          <div class="fit-card__sides">
            <div class="fit-card__side fit-card__side--bto" :data-cy="`preview-card-${c.key}-bto`">
              <span class="fit-card__path">BTO</span>
              <span class="fit-card__value">{{ c.bto.value }}</span>
              <span v-if="c.bto.note" class="fit-card__note">{{ c.bto.note }}</span>
            </div>
            <div class="fit-card__side fit-card__side--resale" :data-cy="`preview-card-${c.key}-resale`">
              <span class="fit-card__path">Resale</span>
              <span class="fit-card__value">{{ c.resale.value }}</span>
              <span v-if="c.resale.note" class="fit-card__note">{{ c.resale.note }}</span>
            </div>
          </div>
          <p class="fit-card__why">{{ c.why }}</p>
        </article>
      </div>
      <p v-if="notShown.length" class="preview__lead" data-cy="preview-not-shown">
        {{ notShown.join(', ') }}: see the full comparison for {{ notShown.length === 1 ? 'this' : 'these' }}.
      </p>

      <div class="preview__cta">
        <div>
          <p class="preview__cta-title">Ready to see the full numbers?</p>
          <p class="preview__lead">Prices, grants, loans and where the two paths cross, side by side.</p>
        </div>
        <RouterLink to="/results" class="btn btn-primary btn-disc" data-cy="preview-see-results">
          <span class="btn-disc__disc" aria-hidden="true">
            <!-- Lucide "arrow-right" -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </span>
          See my full comparison
        </RouterLink>
      </div>
    </template>
  </section>
</template>

<style scoped>
.preview {
  border: 0; border-radius: 36px; padding: 32px clamp(20px, 4vw, 48px) 36px;
  box-shadow: 0 1px 2px rgba(29, 29, 36, 0.05), 0 20px 40px rgba(60, 64, 90, 0.08);
  display: flex; flex-direction: column; gap: 28px;
}
.preview__title { margin: 0; font-size: clamp(26px, 2.8vw, 36px); font-weight: 500; letter-spacing: -0.025em; line-height: 1.15; }
.preview__lead { margin: 0; font-size: 15px; color: var(--text-secondary, #5f6373); }
.preview__head { display: flex; flex-direction: column; gap: 16px; }
.preview__top { display: flex; }
.preview__iconbtn {
  width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
  background: #f3f3f5; color: var(--text-primary, #1d1d24);
}
.preview__iconbtn:hover { background: var(--color-periwinkle, #e9ecf6); }
.preview__answers { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.preview__answers-label { font-size: 14px; color: var(--text-secondary, #5f6373); margin-right: 4px; }
.preview__chip { padding: 8px 14px; border-radius: 999px; background: #f3f3f5; font-size: 14px; font-weight: 500; }
.preview__edit { padding: 0 4px; font-size: 14px; font-weight: 600; }

/* Screen 4 */
.preview__working { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; align-items: center; }
@media (min-width: 992px) { .preview__working { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 480px; } }
.preview__working-text { display: flex; flex-direction: column; gap: 16px; }
.preview__art { padding: 24px; border-radius: 28px; background: var(--color-periwinkle, #e9ecf6); }
.preview__bar { position: relative; height: 8px; border-radius: 4px; background: var(--color-periwinkle, #e9ecf6); overflow: hidden; max-width: 420px; }
.preview__bar span { position: absolute; inset: 0 auto 0 0; width: 40%; border-radius: 4px; background: var(--text-primary, #1d1d24); animation: slide 1.4s ease-in-out infinite; }
@keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }

/* Screen 5: one card per pick, BTO in indigo and resale in rose as on the board. */
.preview__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.fit-card {
  display: flex; flex-direction: column; gap: 14px; padding: 20px 22px 22px;
  border-radius: 22px; border: 1.5px solid #e6e8ef; background: var(--color-white, #ffffff);
}
.fit-card__hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.fit-card__title { margin: 0; font-size: 18px; font-weight: 600; }
.fit-card__verdict { padding: 5px 12px; border-radius: 999px; background: var(--color-blush, #fbd5e5); font-size: 13px; font-weight: 600; white-space: nowrap; }
.fit-card__sides { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fit-card__side { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 16px; }
.fit-card__side--bto { background: #f3f5fb; }
.fit-card__side--resale { background: #fdf4f8; }
.fit-card__path { font-size: 13px; font-weight: 600; }
.fit-card__side--bto .fit-card__path { color: #3d4a8f; }
.fit-card__side--resale .fit-card__path { color: #b23a72; }
.fit-card__value { font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
.fit-card__note { font-size: 13px; color: var(--text-secondary, #5f6373); }
.fit-card__why { margin: 0; font-size: 14px; color: var(--text-secondary, #5f6373); line-height: 1.45; }

.preview__cta {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px 24px;
  padding: 20px 24px; border-radius: 28px; background: #fdf0f6;
}
.preview__cta p { margin: 0; }
.preview__cta-title { font-size: 18px; font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .preview__bar span { animation: none; width: 100%; opacity: 0.25; }
}
</style>
