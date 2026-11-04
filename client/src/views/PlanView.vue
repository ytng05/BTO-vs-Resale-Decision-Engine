<script setup>
import { computed, nextTick, ref } from 'vue';
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { useScenarioStore, STEPS } from '../stores/scenario.js';
import AppStepper from '../components/AppStepper.vue';
import ErrorSummary from '../components/ErrorSummary.vue';
import SituationForm from '../components/SituationForm.vue';
import PathForm from '../components/PathForm.vue';
import WishesForm from '../components/WishesForm.vue';
import EstateScene from '../components/EstateScene.vue';
import BtoScene from '../components/BtoScene.vue';
import AboutYouScene from '../components/AboutYouScene.vue';
import AgesScene from '../components/AgesScene.vue';
import IncomeScene from '../components/IncomeScene.vue';
import WhyWeAsk from '../components/WhyWeAsk.vue';
import ResaleScene from '../components/ResaleScene.vue';
import { useAuthStore } from '../stores/auth.js';
import { ABOUT_PARTS, isPlanComplete, validateAboutPart, validateStep } from '../validation/planValidation.js';
import { LEASE_BANDS, btoKeysYear } from '../constants/planOptions.js';

const store = useScenarioStore();
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// "Start planning" and the navbar's Plan link come here with ?new=1. If the plan in memory is already saved (and not
// changed since), start a fresh one, so the next scenario starts empty and About you can offer the saved details.
// A plan that is not saved yet is kept, so wandering off to another page does not lose it (Home's "Keep my plan").
// "Change inputs" / "Edit inputs" link to plain /plan, so they always keep the plan.
if (route.query.new) {
  if (store.savedId !== null && store.inputsKey === store.savedKey) {
    store.reset();
  }
  router.replace({ path: '/plan' });
}

// The track shows the four input steps (Results is the page after them), with step 1 shortened to fit.
const TRACK = STEPS.slice(0, -1).map((s, i) => (i === 0 ? 'What matters' : s));
const HEADINGS = ['What matters most in your next home?', STEPS[1], 'Which BTO are you eyeing?', 'Which resale flat are you looking at?'];
// "About you" is asked over four screens, one question each (Calm "Easier onboarding" board). The store still has
// one step for it; `aboutPart` is the screen, kept in the store so a Change link can open a given screen. Back from
// "Your BTO" lands on its last screen (back() below).
const aboutPart = computed({ get: () => store.aboutPart, set: (v) => { store.aboutPart = v; } });
const lastAboutPart = ABOUT_PARTS.length - 1;
const onAbout = computed(() => store.step === 1);
// Each screen's question, and one plain line on why it is asked. Only the savings screen needs a lead.
const ABOUT_HEADS = [
  { title: 'How old are you both?', why: 'Each age affects grants and how long your loan can run.' },
  { title: 'Who is buying?', why: 'Citizenship and whether you have had an HDB housing subsidy before decide which grants you can get.' },
  { title: 'What do you each earn a month?', why: 'Grants and the BTO income ceiling depend on what you each earn.' },
  { title: 'What have you saved?', lead: 'Check the CPF app, or estimate.', why: 'Your CPF and cash decide how much you can pay upfront.' },
];
const aboutHead = computed(() => ABOUT_HEADS[aboutPart.value]);
// "Who is buying?" has no illustration (Cadence's spec).
const hasArt = computed(() => !(onAbout.value && aboutPart.value === 1));
// The track: About you asks the most, so its segment is widest and fills a screen at a time (the board has 1, 4, 2, 2; What matters needs 2.5 to fit its label on a laptop).
const TRACK_WEIGHTS = [2.5, 4, 2, 2];
const trackFill = computed(() => (onAbout.value ? (aboutPart.value + 1) / ABOUT_PARTS.length : 1));
// The two buyers' incomes added up, for the income scene's bubble, once both are in.
const incomeTotal = computed(() => {
  const incomes = store.profile.applicants.map((a) => a.monthlyIncome);
  return incomes.length === 2 && incomes.every((v) => typeof v === 'number') ? incomes[0] + incomes[1] : null;
});
const isLastInput = computed(() => store.step === STEPS.length - 2);
const nextLabel = computed(() => (isLastInput.value ? 'See results' : 'Next'));

// Errors are always computed, but only shown after the user tries to continue,
// so a fresh form is not covered in red before they have typed anything.
const attempted = ref(false);
const errors = computed(() => (onAbout.value ? validateAboutPart(aboutPart.value, store.profile) : validateStep(store.step, store)));
const isStepValid = computed(() => Object.keys(errors.value).length === 0);
const shownErrors = computed(() => (attempted.value ? errors.value : {}));

// Steps 2 to 4 share the Calm "Plan your BTO" layout: two columns straight under the nav, the step's illustration on the
// left (with a summary of the choice on "Your BTO") and the form card on the right. Step 1 sits on the estate scene.
const isSideStep = computed(() => store.step > 0);
const isBtoStep = computed(() => store.step === 2);
// The resale scene's lease bubble: '80 to 89 years' becomes '80 to 89', as the scene adds "years left".
const leaseLabel = computed(() => LEASE_BANDS.find((b) => b.value === store.choiceB.leaseBand)?.label.replace(/ years$/, '') ?? null);
const firstName = computed(() => auth.user?.name?.trim().split(/\s+/)[0] ?? '');
// The launch PathForm resolves the choice to; its range and wait fill the summary card.
const btoProject = ref(null);
// Keys year for the scene's bubble: application (1 January) plus HDB's waiting time for the launch (D7).
const keysYear = computed(() => btoKeysYear(store.choiceA.applicationYear, btoProject.value?.waitMonths));

// Same check when the Plan link is clicked while already on the plan (the page is reused, so the code above does not
// run again): fresh plan if this one is saved, then drop the ?new=1.
onBeforeRouteUpdate(function (to) {
  if (!to.query.new) {
    return true;
  }
  if (store.savedId !== null && store.inputsKey === store.savedKey) {
    store.reset();
    aboutPart.value = 0;
    attempted.value = false;
  }
  return { path: '/plan', replace: true };
});

const summary = ref(null);
const form = ref(null);

// Moving between phases (user testing, 3 Nov 2026): the stepper links to every step reached so far (every step once
// the plan has reached the results teaser), and after that each screen offers "Back to your results", so an edit
// doesn't mean pressing Next through every question after it.
const reachable = computed(() => (store.reviewed ? STEPS.length - 2 : store.furthest));
const showBackToResults = computed(() => store.reviewed && !isLastInput.value);

// Back to the top of the form card, with focus on its title, when the card's content changes in place.
async function toCardTop() {
  await nextTick();
  const title = form.value?.querySelector('.plan-card__title');
  form.value?.scrollIntoView({ block: 'start' });
  title?.setAttribute('tabindex', '-1');
  title?.focus({ preventScroll: true });
}

// Shows this screen's problems. About you's screens are short, so no summary: the cursor goes to the first box to
// fix. Longer steps focus the summary, which lists every problem, each a link to its field.
async function showErrors() {
  attempted.value = true;
  await nextTick();
  if (onAbout.value) document.querySelector('[data-cy="plan-form"] .is-invalid')?.focus();
  else summary.value?.focus();
}

// The first screen with something still to answer, or null when the plan is complete.
function firstIncomplete() {
  if (isPlanComplete(store)) return null;
  const part = ABOUT_PARTS.findIndex((_, i) => Object.keys(validateAboutPart(i, store.profile)).length);
  if (part !== -1) return { step: 1, part };
  const step = [2, 3].find((i) => Object.keys(validateStep(i, store)).length);
  return step ? { step, part: 0 } : null;
}

// Off to the results teaser, unless an answer is missing: then to the first screen that needs one, with its
// problems shown.
async function toResults() {
  const gap = firstIncomplete();
  if (!gap) {
    router.push('/preview');
    return;
  }
  store.step = gap.step;
  aboutPart.value = gap.part;
  await toCardTop();
  showErrors();
}

// "Back to your results": this screen must be right first, as with Next.
function backToResults() {
  if (!isStepValid.value) {
    showErrors();
    return;
  }
  attempted.value = false;
  toResults();
}

// A step in the stepper: back to any step freely; forward only once this screen is right, as with Next.
function goTo(step) {
  if (step === store.step) return;
  if (step > store.step && !isStepValid.value) {
    showErrors();
    return;
  }
  attempted.value = false;
  aboutPart.value = 0;
  store.step = step;
  toCardTop();
}

async function next() {
  if (!isStepValid.value) {
    showErrors();
    return;
  }

  attempted.value = false;
  if (onAbout.value && aboutPart.value < lastAboutPart) {
    aboutPart.value += 1;
    toCardTop();
    return;
  }
  if (isLastInput.value) {
    // Last input step done: /preview, which checks the answers (and shows the picks' figures) before Results. A
    // jump in the stepper can skip a screen, so anything still missing is asked first.
    toResults();
    return;
  }
  store.next();
}

function back() {
  attempted.value = false;
  if (onAbout.value && aboutPart.value > 0) {
    aboutPart.value -= 1;
    toCardTop();
    return;
  }
  // From "Your BTO", back to the last About you screen.
  if (store.step === 2) aboutPart.value = lastAboutPart;
  store.back();
}
</script>

<template>
  <component
    :is="isSideStep ? 'div' : EstateScene"
    v-bind="isSideStep ? {} : { wishes: store.wishes, moveInByYear: store.profile.constraints?.moveInByYear }"
    :class="isSideStep ? 'side-step' : 'plan-scene'"
  >
    <div :class="{ 'side-step__grid': isSideStep, 'side-step__grid--solo': !hasArt }">
      <!-- The page's name for screen readers (and where focus lands on arriving); each step's own title is an h2. -->
      <h1 class="visually-hidden" data-cy="plan-page-title">Plan your comparison</h1>
      <section v-if="isSideStep && hasArt" class="side-step__art" data-cy="plan-step-art">
        <!-- About you: a scene for each screen; the ages and the income total show in theirs as they are typed. -->
        <AgesScene v-if="onAbout && aboutPart === 0" :ages="store.profile.applicants.map((a) => a.age)" />
        <IncomeScene v-else-if="onAbout && aboutPart === 2" :total="incomeTotal" />
        <AboutYouScene
          v-else-if="onAbout"
          :buyers="store.profile.applicants.length"
          :move-by="store.profile.constraints?.moveInByYear"
          bubble="Saving up together"
        />
        <BtoScene v-else-if="isBtoStep" :wishes="store.wishes" :keys-year="keysYear" />
        <ResaleScene v-else :lease="leaseLabel" />
      </section>

      <form ref="form" class="card plan-card" :class="{ 'plan-card--side': isSideStep }" data-cy="plan-form" novalidate @submit.prevent="next">
        <div class="plan-card__body" :data-cy="`plan-step-${store.step + 1}-panel`">
          <!-- Every step (Calm "Easier onboarding" board): Back, the segmented track and, on step 1, Skip in one row. -->
          <div class="plan-card__track">
            <button
              v-if="store.step > 0" type="button" class="plan-card__iconbtn"
              aria-label="Back" data-cy="plan-step-back" @click="back"
            >
              <!-- Lucide "chevron-left" -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <div class="plan-card__progress"><AppStepper :steps="TRACK" :current="store.step" :weights="TRACK_WEIGHTS" :fill="trackFill" :reachable="reachable" @go="goTo" /></div>
            <!-- Step 1 is optional: skip it. -->
            <button v-if="store.step === 0" type="button" class="plan-card__skip" data-cy="plan-step-skip" @click="next">
              Skip
            </button>
          </div>

          <div class="plan-card__head">
            <p v-if="isBtoStep && firstName" class="plan-card__lead">Welcome back, {{ firstName }}</p>
            <h2 class="plan-card__title plan-card__title--hero" :data-cy="onAbout ? `about-part-${ABOUT_PARTS[aboutPart]}` : null">
              {{ onAbout ? aboutHead.title : HEADINGS[store.step] }}<span v-if="onAbout" class="visually-hidden"> (question {{ aboutPart + 1 }} of {{ ABOUT_PARTS.length }})</span>
            </h2>
            <p v-if="onAbout && aboutHead.lead" class="plan-card__lead">{{ aboutHead.lead }}</p>
            <p v-if="store.step === 0" class="plan-card__lead">Pick as many as you like.</p>
          </div>

          <ErrorSummary v-if="attempted && !isStepValid && !onAbout" ref="summary" :step="store.step" :errors="errors" />

          <WishesForm v-if="store.step === 0" />
          <SituationForm v-else-if="store.step === 1" :part="aboutPart" :errors="shownErrors" :live-errors="errors" />
          <WhyWeAsk v-if="onAbout" :id="`why-${ABOUT_PARTS[aboutPart]}`" :text="aboutHead.why" />
          <PathForm v-else-if="store.step === 2" key="choiceA" choice-key="choiceA" :errors="shownErrors" @project="btoProject = $event" />
          <PathForm v-else-if="store.step === 3" key="choiceB" choice-key="choiceB" :errors="shownErrors" />

          <div class="plan-card__actions">
            <button v-if="showBackToResults" type="button" class="btn btn-outline-secondary plan-card__done" data-cy="plan-step-done" @click="backToResults">
              Back to your results
            </button>
            <button type="submit" class="btn btn-primary btn-disc" data-cy="plan-step-next">
              <span class="btn-disc__disc" aria-hidden="true">
                <!-- Lucide "arrow-right" -->
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
              {{ nextLabel }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </component>
</template>

<style scoped>
/* The step card: progress, question and actions in one white box over the scene, sized and spaced as on the
   Calm onboarding board (820px, 36px corners, 24px between parts). */
.plan-card {
  max-width: 820px;
  margin-inline: auto;
  border: 0;
  border-radius: 36px;
  box-shadow: 0 1px 2px rgba(29, 29, 36, 0.05), 0 20px 40px rgba(60, 64, 90, 0.08);
  padding: 32px clamp(20px, 4vw, 48px) 36px;
}
.plan-card__body { display: flex; flex-direction: column; gap: 24px; }
.plan-card__track { display: flex; align-items: center; gap: 24px; }
.plan-card__progress { flex: 1; min-width: 0; }
.plan-card__iconbtn,
.plan-card__skip { flex-shrink: 0; border: 0; background: var(--bg-page); color: var(--text-primary); }
.plan-card__iconbtn:hover,
.plan-card__skip:hover { background: var(--accent-fill-3); }
.plan-card__iconbtn { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; }
.plan-card__skip { padding: 12px 18px; border-radius: 999px; font-size: 15px; font-weight: 600; }
@media (max-width: 767.98px) {
  .plan-card__track { gap: 12px; }
  .plan-card__iconbtn { width: 44px; height: 44px; }
}
.plan-card__head { display: flex; flex-direction: column; gap: 8px; }
.plan-card__title { margin: 0; }
.plan-card__title--hero { font-size: clamp(26px, 2.8vw, 36px); font-weight: 500; letter-spacing: -0.025em; line-height: 1.15; }
.plan-card__lead { margin: 0; font-size: 15px; color: var(--text-secondary); }
.plan-card__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 12px; margin-top: auto; }
.plan-card__done { border-radius: var(--radius-pill); padding-inline: 20px; min-height: 48px; }

/* Steps 2 to 4 (Calm "Plan your BTO" board): the illustration panel and the form card side by side (the track is
   inside the card), stacking below 992px. */
.side-step { display: flex; flex-direction: column; gap: 28px; }
.side-step__grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
/* The form comes first and the illustration second at every width: below lg under the form, from lg on its right
   (as the laptop mockups), the same side on every step. */
.side-step__grid > .side-step__art { order: 2; }
/* No illustration: the form card alone, at the width of the step-1 card. */
.side-step__grid--solo > .plan-card { width: 100%; max-width: 820px; margin-inline: auto; }
@media (min-width: 992px) {
  /* Side by side, the panel stretches to the form card's height and centres its scene. */
  .side-step__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }
  .side-step__grid > .side-step__art { justify-content: center; }
  .side-step__grid--solo { grid-template-columns: minmax(0, 1fr); }
}
.side-step__art {
  display: flex; flex-direction: column; gap: 12px; min-width: 0; overflow: hidden;
  padding: 24px; border-radius: 36px;
  background: var(--accent-fill-3); border: 1px solid var(--bg-surface);
}
.plan-card--side { max-width: none; min-width: 0; margin: 0; padding: 36px; height: 100%; }

/* How the estate scene fits step 1; EstateScene.vue itself stays as designed. The box is at least the scene's own
   1240 × 860 shape at the page column's width (App.vue: up to 1344px, 16–48px gutters), and grows when the card
   needs more room. Not aspect-ratio: the box clips its overflow (for the train and bus), and a clipping box with
   aspect-ratio does not grow, so the card was cut off at 768–990px. */
@media (min-width: 768px) {
  .estate.plan-scene {
    min-height: calc((min(100vw, 1344px) - 2 * clamp(16px, 4vw, 48px)) * 860 / 1240);
    padding-bottom: 32px;
  }
}
/* Short laptop screens (720–800px tall): the card starts 160px down, just under the train track, so Next fits
   without scrolling (measured at 1280 × 720). */
@media (min-width: 768px) and (max-height: 800px) {
  .estate.plan-scene { padding-top: 160px; }
}
/* Below 1280px the card covers some of the bubbles, or the scene's edges cut them off (measured at 768–1279px):
   hide them, keep the scene and its animation. */
@media (max-width: 1279.98px) {
  .plan-scene :deep(.es-bubble) { display: none; }
}
/* Step 3 on phones: the scene shrinks so far that its bubble text would render at 6–9px. The keys year is also
   in the summary card beside it. */
@media (max-width: 575.98px) {
  .side-step__art :deep(.bs-bubble) { display: none; }
}
</style>
