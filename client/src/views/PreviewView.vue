<script setup>
// The results teaser between the last plan step and Results (Calm "Easier onboarding" board, screens 4 and 5):
// "Working out your numbers…" while the comparison runs, then the "simple" teaser: one panel that says which path fits
// better, with a row per priority picked in step 1 that the engine has a figure for. Each row's verdict is seat 1's
// rule (utils/previewFit.js, D43). The panel names a path only when that path wins every pick that has a winner (ties
// don't count against it); on a split it says each fits some, and when every pick ties, that they come out about the
// same. Picks without a figure are named in the banner instead, as far as Results covers them (near my parents is in
// "grants": the Proximity Housing Grant; resale value is the flat's value in the net position; space is only on the
// Dashboard, so the banner says so). "Edit your answers" opens every answer with Change links (D43).
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { compareReusing } from '../api/client.js';
import PlanReview from '../components/PlanReview.vue';
import { useScenarioStore, WISHES } from '../stores/scenario.js';
import BtoScene from '../components/BtoScene.vue';
import { formatMoney } from '../utils/format.js';
import { isPlanComplete } from '../validation/planValidation.js';
import { PREVIEW_WISHES } from '../constants/planOptions.js';
import { previewFit } from '../utils/previewFit.js';
import { previewPanel } from '../utils/previewPanel.js';

const store = useScenarioStore();
const router = useRouter();

const result = ref(null);
const error = ref(null);
const loading = ref(false);
const hasInputs = computed(() => isPlanComplete(store));

const labelOf = (key) => WISHES.find((w) => w.key === key)?.label ?? key;
const shown = computed(() => store.wishes.filter((k) => PREVIEW_WISHES.includes(k)));
// The banner: what the full comparison shows, naming the picks the teaser has no figure for.
const ctaText = computed(() => {
  const parts = ['Prices', 'grants', 'loans', ...(store.wishes.includes('value') ? ['resale value'] : [])];
  const list = `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  return store.wishes.includes('space') ? `${list} side by side, and space on the Dashboard` : `${list}, side by side`;
});

const moveInBy = computed(() => store.profile.constraints?.moveInByYear ?? null);
const yearOf = (date) => Number(String(date ?? '').slice(0, 4)) || null;
const SAME_LABEL = { 'same-keys-year': 'Same keys year', 'both-make-date': 'Both make your date', 'within-threshold': 'About the same' };

// What a winning row says: the difference, rounded ("About S$109,000 less to borrow"). Path A is the BTO, B resale.
function winDetail(key, reason, r) {
  if (key === 'moveby') {
    if (reason === 'only-one-makes-date') return `Keys by your ${moveInBy.value}`;
    const n = Math.abs(yearOf(r.outcomeA.timeline?.keyCollectionDate) - yearOf(r.outcomeB.timeline?.keyCollectionDate));
    const sooner = `Keys about ${n} ${n === 1 ? 'year' : 'years'} sooner`; // whole years apart, so "about"
    return reason === 'neither-makes-date' ? `${sooner}, closer to your date` : sooner;
  }
  const field = key === 'cash' ? 'cashRequiredAtPurchaseCents' : 'loanPrincipalCents';
  const gap = formatMoney(Math.round(Math.abs(r.outcomeA[field] - r.outcomeB[field]) / 100 / 1000) * 1000);
  return key === 'cash' ? `About ${gap} less upfront` : `About ${gap} less to borrow`;
}

// One row per shown pick, with the rule's verdict ('bto' | 'resale' | null).
const rows = computed(() => {
  const r = result.value;
  if (!r) return [];
  return shown.value.map((key) => {
    const fit = previewFit(key, r.outcomeA, r.outcomeB, { moveInBy: moveInBy.value });
    let detail;
    if (fit.verdict) detail = winDetail(key, fit.reason, r);
    else if (fit.tie === 'same') detail = SAME_LABEL[fit.reason] ?? 'About the same';
    else detail = 'See the full comparison';
    return { key, title: labelOf(key), verdict: fit.verdict, tie: fit.tie, reason: fit.reason, detail };
  });
});

// The panel's wording (utils/previewPanel.js): one path fits better, a split, or about the same.
const panel = computed(() => previewPanel(rows.value, { moveInBy: moveInBy.value }));
const outcome = computed(() => panel.value.outcome);
// A split shows a column per path, BTO first, and any ties under them.
const PATHS = [
  { id: 'bto', title: 'BTO fits better' },
  { id: 'resale', title: 'Resale fits better' },
];
const columns = computed(() => PATHS.map((p) => ({ ...p, rows: rows.value.filter((row) => row.verdict === p.id) })));
const ties = computed(() => rows.value.filter((row) => !row.verdict));

async function load() {
  store.reviewed = true; // a complete plan has reached the teaser
  error.value = null;
  loading.value = true;
  try {
    result.value = await compareReusing(store); // the same request as the other page reuses its answer
  } catch (e) {
    error.value = e?.response?.data?.error?.message ?? 'We could not work out your numbers just now.';
  } finally {
    loading.value = false;
  }
}

// "Change" in Check your answers: back to that step (and About you screen) of the plan, answers kept. The plan
// has been seen through, so every step is a link there and each screen offers "Back to your results".
function editStep(step, part = 0) {
  store.step = step;
  store.aboutPart = part;
  router.push('/plan');
}

onMounted(() => {
  if (!hasInputs.value) return;
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
        <span v-if="result?.mock" class="preview__pill" data-cy="preview-mock-notice">Showing mock data</span>
      </div>

      <!-- No pick has a figure: the page is the check of every answer. -->
      <template v-if="!rows.length">
        <h1 class="preview__title">Check your answers</h1>
        <section class="preview__review" aria-label="Your answers" data-cy="preview-review">
          <PlanReview :bto-project="result.btoProjectA ?? null" @edit="editStep" />
        </section>
      </template>

      <template v-else>
        <!-- Each path wins something: a heading with one line per path, then a column per path (BTO first) and any
             ties under them. -->
        <section v-if="outcome === 'split'" class="split" aria-labelledby="preview-verdict-title" data-cy="preview-verdict">
          <div class="split__hd">
            <p class="verdict__sub" data-cy="preview-verdict-sub">{{ panel.sub }}</p>
            <h1 id="preview-verdict-title" class="verdict__title" data-cy="preview-verdict-title">{{ panel.title }}</h1>
            <p class="split__summary" data-cy="preview-verdict-summary">{{ panel.summary }}</p>
          </div>
          <div class="split__cols">
            <section
              v-for="col in columns"
              :key="col.id"
              class="split__col"
              :class="`split__col--${col.id}`"
              :aria-labelledby="`preview-col-${col.id}-title`"
              :data-cy="`preview-col-${col.id}`"
            >
              <h2 :id="`preview-col-${col.id}-title`" class="split__col-title">
                <span class="split__icon" aria-hidden="true">
                  <!-- Lucide "building-2" (BTO) / "key-round" (resale) -->
                  <svg v-if="col.id === 'bto'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></svg>
                </span>
                {{ col.title }}
              </h2>
              <ul class="verdict__rows">
                <li v-for="row in col.rows" :key="row.key" class="verdict__row" :data-cy="`preview-card-${row.key}`">
                  <div>
                    <p class="verdict__row-title">{{ row.title }}</p>
                    <p class="verdict__row-detail" :data-cy="`preview-card-${row.key}-detail`">{{ row.detail }}</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
          <ul v-if="ties.length" class="verdict__rows split__ties" data-cy="preview-ties">
            <li v-for="row in ties" :key="row.key" class="verdict__row" :data-cy="`preview-card-${row.key}`">
              <div>
                <p class="verdict__row-title">{{ row.title }}</p>
                <p class="verdict__row-detail" :data-cy="`preview-card-${row.key}-detail`">{{ row.detail }}</p>
              </div>
              <span class="verdict__mark verdict__mark--even" aria-hidden="true" :data-cy="`preview-card-${row.key}-mark`">
                <svg v-if="row.tie === 'same'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 9h14M5 15h14" /></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14" /></svg>
              </span>
            </li>
          </ul>
        </section>

        <section v-else class="verdict" :class="`verdict--${outcome}`" aria-labelledby="preview-verdict-title" data-cy="preview-verdict">
          <div class="verdict__hd">
            <span class="verdict__icon" aria-hidden="true">
              <!-- Lucide "key-round" (resale) / "building-2" (BTO) / "scale" (about the same) -->
              <svg v-if="outcome === 'resale'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></svg>
              <svg v-else-if="outcome === 'bto'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>
            </span>
            <div>
              <p v-if="panel.sub" class="verdict__sub" data-cy="preview-verdict-sub">{{ panel.sub }}</p>
              <h1 id="preview-verdict-title" class="verdict__title" data-cy="preview-verdict-title">{{ panel.title }}</h1>
            </div>
          </div>
          <ul class="verdict__rows">
            <li v-for="row in rows" :key="row.key" class="verdict__row" :data-cy="`preview-card-${row.key}`">
              <div>
                <p class="verdict__row-title">{{ row.title }}</p>
                <p class="verdict__row-detail" :data-cy="`preview-card-${row.key}-detail`">
                  <span v-if="row.verdict" class="visually-hidden">{{ row.verdict === 'bto' ? 'BTO' : 'Resale' }} ahead: </span>{{ row.detail }}
                </p>
              </div>
              <span
                class="verdict__mark"
                :class="row.verdict ? `verdict__mark--${row.verdict}` : 'verdict__mark--even'"
                aria-hidden="true"
                :data-cy="`preview-card-${row.key}-mark`"
              >
                <!-- Lucide "check" for a win; "equal" for a tie; "minus" when not compared here -->
                <svg v-if="row.verdict" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <svg v-else-if="row.tie === 'same'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 9h14M5 15h14" /></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14" /></svg>
              </span>
            </li>
          </ul>
        </section>

        <!-- Every answer, with Change links: the check before Results (D43), one tap away. -->
        <details class="preview__review" data-cy="preview-review">
          <summary class="preview__edit-link">Edit your answers</summary>
          <PlanReview :bto-project="result.btoProjectA ?? null" @edit="editStep" />
        </details>
      </template>

      <div class="preview__cta">
        <!-- A buyer waving (the figure from the plan's scenes) -->
        <svg class="preview__cta-art" width="40" height="58" viewBox="-16 -52 34 54" fill="none" aria-hidden="true">
          <line x1="-3" y1="-15" x2="-3" y2="0" stroke-width="2.4" stroke-linecap="round" style="stroke: var(--text-secondary)" />
          <line x1="3" y1="-15" x2="3" y2="0" stroke-width="2.4" stroke-linecap="round" style="stroke: var(--text-secondary)" />
          <path d="M-5 -33h10l4 19h-18z" stroke-width="1.4" stroke-linejoin="round" style="fill: var(--accent-fill-1); stroke: var(--text-secondary)" />
          <line class="preview__wave" x1="4" y1="-30" x2="13" y2="-44" stroke-width="2.4" stroke-linecap="round" style="stroke: var(--text-secondary)" />
          <circle cx="-5" cy="-46" r="3" style="fill: var(--text-secondary)" />
          <circle cx="0" cy="-40" r="6" stroke-width="1.4" style="fill: var(--bg-surface); stroke: var(--text-secondary)" />
        </svg>
        <p class="preview__cta-text" data-cy="preview-cta-text">{{ ctaText }}</p>
        <RouterLink to="/results" class="btn btn-primary btn-disc preview__cta-btn" data-cy="preview-see-results">
          <span class="btn-disc__disc" aria-hidden="true">
            <!-- Lucide "arrow-right" -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </span>
          See the full comparison
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
.preview__lead { margin: 0; font-size: 15px; color: var(--text-secondary); }
.preview__head { display: flex; flex-direction: column; gap: 16px; }
.preview__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.preview__pill { padding: 6px 12px; border-radius: 999px; background: var(--bg-page); font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.preview__iconbtn {
  width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
  background: var(--bg-page); color: var(--text-primary);
}
.preview__iconbtn:hover { background: var(--accent-fill-3); }
.preview__review { border-top: 0; }
.preview__edit-link {
  display: inline-block; list-style: none; cursor: pointer; font-size: 14px; font-weight: 600;
  text-decoration: underline; text-underline-offset: 3px; margin-bottom: var(--space-3);
}
.preview__edit-link::-webkit-details-marker { display: none; }
.preview__edit-link:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; border-radius: 4px; }

/* Screen 4 */
.preview__working { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; align-items: center; }
@media (min-width: 992px) { .preview__working { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 480px; } }
.preview__working-text { display: flex; flex-direction: column; gap: 16px; }
.preview__art { padding: 24px; border-radius: 28px; background: var(--accent-fill-3); }
.preview__bar { position: relative; height: 8px; border-radius: 4px; background: var(--accent-fill-3); overflow: hidden; max-width: 420px; }
.preview__bar span { position: absolute; inset: 0 auto 0 0; width: 40%; border-radius: 4px; background: var(--text-primary); animation: slide 1.4s ease-in-out infinite; }
@keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }

/* Screen 5 ("simple"): one panel in the winning path's tint, a white row per pick. */
.verdict { display: flex; flex-direction: column; gap: 14px; padding: clamp(16px, 2.4vw, 24px); border-radius: 28px; background: var(--bg-page); }
.verdict--resale { background: var(--accent-tint); }
.verdict--bto { background: var(--indigo-tint); }
.verdict__hd { display: flex; align-items: center; gap: 16px; }
.verdict__icon {
  flex-shrink: 0; width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center;
  background: var(--bg-surface); color: var(--text-secondary); box-shadow: 0 1px 2px rgba(29, 29, 36, 0.06);
}
.verdict--resale .verdict__icon { color: var(--color-berry); }
.verdict--bto .verdict__icon { color: var(--indigo); }
.verdict__sub { margin: 0; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.verdict__title { margin: 0; font-size: clamp(26px, 3.2vw, 38px); font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }
.verdict__rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.verdict__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px 12px 16px; border-radius: 14px; background: var(--bg-surface); }
.verdict__row p { margin: 0; }
.verdict__row-title { font-size: 15px; font-weight: 600; }
.verdict__row-detail { font-size: 13px; color: var(--text-secondary); }
.verdict__mark { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: var(--bg-surface); }
.verdict__mark--resale { background: var(--color-berry); }
.verdict__mark--bto { background: var(--indigo); }
.verdict__mark--even { background: var(--surface-disabled); color: var(--text-secondary); }

/* A split: the heading sits on the card, then one tinted column per path, BTO first; two across from a tablet up. */
.split { display: flex; flex-direction: column; gap: 16px; }
.split__hd { display: flex; flex-direction: column; gap: 6px; }
.split__summary { margin: 0; font-size: 15px; color: var(--text-secondary); }
.split__cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
@media (min-width: 768px) { .split__cols { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.split__col { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 22px; }
.split__col--bto { background: var(--indigo-tint); }
.split__col--resale { background: var(--accent-tint); }
.split__col-title { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 16px; font-weight: 600; }
.split__icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--bg-surface); }
.split__col--bto .split__icon { color: var(--indigo); }
.split__col--resale .split__icon { color: var(--color-berry); }
.split__ties { padding: 10px; border-radius: 22px; background: var(--bg-page); }

.preview__cta {
  display: flex; align-items: center; gap: 16px 20px; padding: 16px 24px; border-radius: 28px; background: var(--accent-tint);
}
.preview__cta-art { flex-shrink: 0; }
.preview__cta-text { flex: 1 1 auto; margin: 0; font-size: 15px; font-weight: 500; }
.preview__wave { transform-box: fill-box; transform-origin: 0 100%; animation: preview-wave 1.6s ease-in-out infinite; }
@keyframes preview-wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-24deg); } }
/* Phones: the figure with the line as a speech bubble, then a full-width button. */
@media (max-width: 575.98px) {
  .preview__cta { flex-wrap: wrap; padding: 0; background: none; gap: 12px; }
  .preview__cta-text { flex: 1 1 0; padding: 8px 12px; border-radius: 12px; background: var(--accent-tint); font-size: 13px; }
  .preview__cta-btn { flex: 1 1 100%; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .preview__bar span { animation: none; width: 100%; opacity: 0.25; }
  .preview__wave { animation: none; }
}
</style>
