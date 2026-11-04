<script setup>
// One path's Outcome (server/src/engine/evaluate.contract.js), in plain language: what you would walk away with in the
// horizon year (net position, D1: nothing is sold), then three lines that explain it (what the flat is worth, what you
// would still pay back, the cash you spent), then what the grants did. "Full breakdown" opens the exact parts that add
// up to the net position, and each grant's eligibility reasons with their official sources.
// Wording follows the guardrails: "net position" (what a path leaves you with, after costs), never "profit", never
// "on sale". Grants are never shown as extra money: they are already inside the figures (D1).
// All Outcome money fields are integer cents (the contract); this component is the one place that converts to
// dollars, right before formatting. The path is named in words as well as colour (the pill says BTO or Resale).
// data-cy names: docs/CONVENTIONS.md "Results".
import Term from './Term.vue';
import { computed, nextTick, ref } from 'vue';
import { formatMoney } from '../utils/format.js';
import EligibilityList from './EligibilityList.vue';

const props = defineProps({
  subtitle: { type: String, default: '' }, // e.g. 'Tampines, 4-room, Standard, from 2027'
  outcome: { type: Object, required: true },
  horizonYear: { type: Number, default: null },
  cyPrefix: { type: String, required: true }, // 'results-patha' / 'results-pathb'
  tone: { type: String, default: 'bto' }, // 'bto' | 'resale': names the path and sets its colour (matches the charts and the Dashboard)
  ahead: { type: Boolean, default: false }, // true on the path with the higher net position: tagged in words
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : cents);
const money = (cents) => formatMoney(dollars(cents));
// The flat's value is a projection, so it is said as "about": "S$1.73 million", or rounded to S$1,000 under a million.
// The exact figure stays in the full breakdown.
const about = (cents) => {
  if (typeof cents !== 'number') return money(cents);
  if (Math.abs(cents) >= 100_000_000) return `S$${(cents / 100_000_000).toFixed(2)} million`;
  return formatMoney(Math.round(cents / 100 / 1000) * 1000);
};

const pathName = computed(() => (props.tone === 'resale' ? 'Resale' : 'BTO'));
const o = computed(() => props.outcome);

// How the big figure adds up (D1): flat value − loan − CPF savings to put back (with interest) − clawback − cash
// spent. These are the contract's own parts of netPositionCents, so they always sum to it. The CPF line is the
// savings refund only: grants are not a debt (D1), unlike the deprecated cpfRefundPrincipalCents totals.
const cpfToPutBackCents = computed(
  () => (o.value.cpfSavingsRefundPrincipalCents ?? 0) + (o.value.cpfSavingsAccruedInterestCents ?? 0),
);
const clawbackCents = computed(() => (o.value.clawbackCents > 0 ? o.value.clawbackCents : 0));
const hasParts = computed(() => typeof o.value.marketValueAtHorizonCents === 'number');
const breakdown = computed(() => {
  if (!hasParts.value) return [];
  return [
    { id: 'value', label: "The flat's value", cents: o.value.marketValueAtHorizonCents, sign: '' },
    { id: 'loan', label: 'Loan still owed', cents: o.value.outstandingLoanAtHorizonCents, sign: '−' },
    { id: 'cpf-refund', label: 'CPF to put back, with interest', term: 'accrued-interest', cents: cpfToPutBackCents.value, sign: '−' },
    ...(clawbackCents.value > 0 ? [{ id: 'clawback', label: 'Subsidy clawback', term: 'clawback', cents: clawbackCents.value, sign: '−' }] : []),
    { id: 'cash', label: 'Cash spent on the flat and rent', cents: o.value.housingCashSpentCents, sign: '−' },
  ];
});

// Line 2: what comes off the flat's value = loan still owed + CPF to put back (+ any subsidy clawback). The loan is a
// real debt; the CPF part is owed to no one: it goes back into the buyers' own CPF accounts (D1), so it is not "pay back".
const owedCents = computed(() => (o.value.outstandingLoanAtHorizonCents ?? 0) + cpfToPutBackCents.value + clawbackCents.value);
const owedParts = computed(() => [
  `Loan ${money(o.value.outstandingLoanAtHorizonCents ?? 0)}`,
  `CPF to put back, with interest ${money(cpfToPutBackCents.value)}`,
  ...(clawbackCents.value > 0 ? [`Subsidy clawback ${money(clawbackCents.value)}`] : []),
].join(' · '));

// Flattened for EligibilityList, which groups the tests back under their grant.
// sourceUrl is kept so the UI can link each reason to its official source.
const eligibilityItems = computed(() =>
  (o.value.grants ?? []).flatMap((g) =>
    (g.tests ?? []).map((t) => ({ grant: g.id, passed: t.passed, reason: t.reason, sourceUrl: t.sourceUrl })),
  ),
);
// What each grant pays out (cents), so a grant's status says whether it applies, as on the Dashboard.
const grantAmounts = computed(() =>
  Object.fromEntries((o.value.grants ?? []).map((g) => [g.id, g.amountCents ?? 0])),
);

const GRANT_NAMES = { EHG: 'Enhanced CPF Housing Grant', FAMILY: 'CPF Housing Grant (Family)', PHG: 'Proximity Housing Grant' };
const grantName = (id) => GRANT_NAMES[id] ?? id;
const paying = computed(() => (o.value.grants ?? []).filter((g) => (g.amountCents ?? 0) > 0));
// Family and Proximity grants only exist for resale flats: on a BTO path they say nothing about the household, so
// they are not "not eligible", they are left out of the note (their reasons stay in Full breakdown).
const RESALE_ONLY = ['FAMILY', 'PHG'];
const isResaleOnlyHere = (g) => props.tone === 'bto' && RESALE_ONLY.includes(g.id);
const resaleOnlyNote = computed(() => (props.tone === 'bto' && (o.value.grants ?? []).some((g) => isResaleOnlyHere(g))
  ? 'The Family Grant and the Proximity Housing Grant are for resale flats only.'
  : ''));
const notPaying = computed(() => (o.value.grants ?? []).filter((g) => !((g.amountCents ?? 0) > 0) && !isResaleOnlyHere(g)));
const joinList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const payingText = computed(() => paying.value.map((g) => `${grantName(g.id)}: ${money(g.amountCents)}`).join('; '));
const notPayingText = computed(() => (notPaying.value.length ? `Not eligible for the ${joinList(notPaying.value.map((g) => grantName(g.id)))}.` : ''));
// With nothing paid, say why in the engine's own words: the first check that failed.
const firstFailedReason = computed(() => {
  for (const g of notPaying.value) {
    const t = (g.tests ?? []).find((x) => !x.passed);
    if (t?.reason) return t.reason;
  }
  return '';
});

// "Why" opens the full breakdown and moves to the grants and their reasons.
const open = ref(false);
const grantsId = computed(() => `${props.cyPrefix}-grants-detail`);
async function showWhy() {
  open.value = true;
  await nextTick();
  const el = document.getElementById(grantsId.value);
  if (el) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true }); // the heading has tabindex="-1": keyboard and screen-reader users land there too
  }
}
</script>

<template>
  <div class="card h-100 path" :class="[`path--${tone}`, { 'compare-card--winner': ahead }]" :data-cy="`${cyPrefix}-card`">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
        <h3 class="path__pill m-0">{{ pathName }}<template v-if="subtitle"> · {{ subtitle }}</template></h3>
        <span v-if="ahead" class="path-ahead" :data-cy="`${cyPrefix}-ahead-tag`">Ahead<template v-if="horizonYear"> in {{ horizonYear }}</template></span>
      </div>

      <p class="path-label">
        <Term id="net-position">Net position</Term><template v-if="horizonYear"> in {{ horizonYear }}</template>:
        what this path leaves you with, after costs
      </p>
      <p class="path-net text-numeric" :data-cy="`${cyPrefix}-net-position`">{{ money(outcome.netPositionCents) }}</p>

      <ul v-if="hasParts" class="path-lines list-unstyled">
        <li :data-cy="`${cyPrefix}-summary-value`">
          <span class="path-lines__ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" /></svg></span>
          <span>Your flat would be worth about <strong>{{ about(o.marketValueAtHorizonCents) }}</strong></span>
        </li>
        <li :data-cy="`${cyPrefix}-summary-owed`">
          <span class="path-lines__ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg></span>
          <span>Taken off: <strong>{{ money(owedCents) }}</strong> still owed or going back to your CPF<small class="path-lines__sub">{{ owedParts }}</small></span>
        </li>
        <li :data-cy="`${cyPrefix}-summary-cash`">
          <span class="path-lines__ico" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg></span>
          <span>You'd have spent <strong>{{ money(o.housingCashSpentCents) }}</strong> in cash<small class="path-lines__sub">Rent, renovation, fees and loan payments<template v-if="horizonYear">, up to {{ horizonYear }}</template></small></span>
        </li>
      </ul>

      <!-- Grants are already inside every figure above (D1): say so, never present them as extra. -->
      <p v-if="paying.length" class="path-note path-note--yes" :data-cy="`${cyPrefix}-grants-total`">
        <span aria-hidden="true">✓</span>
        <span>
          <strong>{{ payingText }},</strong> already counted above. {{ notPayingText }} {{ resaleOnlyNote }}
          <button type="button" class="path-note__why" :data-cy="`${cyPrefix}-grants-why`" @click="showWhy">Why</button>
        </span>
      </p>
      <p v-else class="path-note" :data-cy="`${cyPrefix}-grants-total`">
        <span aria-hidden="true">ⓘ</span>
        <span>
          <strong>No grants.</strong> {{ firstFailedReason }} {{ resaleOnlyNote }}
          <button type="button" class="path-note__why" :data-cy="`${cyPrefix}-grants-why`" @click="showWhy">Why</button>
        </span>
      </p>

      <details class="path-more" :open="open" :data-cy="`${cyPrefix}-full-breakdown`" @toggle="open = $event.target.open">
        <summary class="path-more__toggle">Full breakdown<svg class="path-more__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></summary>
        <!-- The same parts, and the same order, as the Dashboard's "How the net position adds up". -->
        <dl v-if="breakdown.length" class="path-list mb-2" :data-cy="`${cyPrefix}-breakdown`">
          <div v-for="b in breakdown" :key="b.id" :data-cy="`${cyPrefix}-${b.id}`">
            <dt><Term v-if="b.term" :id="b.term">{{ b.label }}</Term><template v-else>{{ b.label }}</template></dt>
            <dd class="text-numeric">{{ b.sign }}{{ money(b.cents) }}</dd>
          </div>
          <div class="path-list__total">
            <dt>Net position<template v-if="horizonYear"> in {{ horizonYear }}</template></dt>
            <dd class="text-numeric">{{ money(outcome.netPositionCents) }}</dd>
          </div>
        </dl>
        <p class="text-secondary small mb-3">
          Grants of {{ money(outcome.totalGrantsCents) }} are already in these figures: they lowered the loan and the cash you paid.
        </p>
        <h4 :id="grantsId" class="path-subhead" tabindex="-1">Grants and why</h4>
        <EligibilityList :items="eligibilityItems" :amounts="grantAmounts" :cy-prefix="cyPrefix" />
      </details>
    </div>
  </div>
</template>

<style scoped>
/* Spacing follows the design mockup: roomy card, larger figures, rows with air between them. */
/* Each card is outlined in its path's colour, BTO indigo and resale pink (as the verdict, bars and Dashboard); the
   path ahead is said in words by its "Ahead" tag. On hover the outline thickens and the shadow deepens, in place, so
   the two cards' tops always line up (the shared .card hover swapped the shadow, which made the outline flash). */
.path { --path-ring: var(--accent-deep); border-color: var(--path-ring); border-top: 6px solid var(--path-ring); box-shadow: 0 0 0 1px var(--path-ring), var(--shadow-sm); transition: box-shadow var(--duration-base) var(--ease-out); }
.path--resale { --path-ring: var(--accent-fill-1); }
.path:hover, .path:focus-within { box-shadow: 0 0 0 2px var(--path-ring), var(--shadow-lg); }
.path.compare-card--winner { border-color: var(--path-ring); box-shadow: 0 0 0 1px var(--path-ring), var(--shadow-sm); }
.path.compare-card--winner:hover, .path.compare-card--winner:focus-within { box-shadow: 0 0 0 2px var(--path-ring), var(--shadow-lg); }
.path > .card-body { display: flex; flex-direction: column; padding: 1.75rem 1.75rem 1.5rem; }
.path__pill {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  background: var(--accent-deep);
  color: var(--on-primary);
}
.path--resale .path__pill { background: var(--accent-fill-2); color: var(--text-primary); }
.path-ahead {
  padding: 0.125rem 0.75rem;
  border-radius: var(--radius-pill);
  background: var(--success-fill);
  color: var(--success);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.path-label { margin: 0 0 var(--space-1); font-size: 0.9375rem; color: var(--text-secondary); }
.path-net {
  margin: 0 0 1.5rem;
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: clamp(2.5rem, 5vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
}
.path-lines { display: flex; flex-direction: column; gap: 1.125rem; margin: 0 0 1.5rem; padding: 0; }
.path-lines li { display: flex; align-items: flex-start; gap: 1rem; font-size: 1.0625rem; line-height: 1.4; }
.path-lines__ico {
  flex: none;
  display: inline-grid; place-items: center;
  width: 2.75rem; height: 2.75rem;
  border-radius: var(--radius-md);
  background: var(--indigo-tint);
  color: var(--text-primary);
}
.path-lines li > span:last-child { padding-top: 0.125rem; }
.path-lines__sub { display: block; margin-top: 0.25rem; font-size: 0.875rem; color: var(--text-secondary); }
.path-note {
  display: flex; gap: var(--space-3);
  margin: 0 0 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  background: var(--indigo-tint);
  font-size: 1rem;
  line-height: 1.5;
}
.path-note--yes { background: var(--success-fill); }
.path-note__why {
  padding: 0; border: 0; background: none; font: inherit;
  color: var(--text-primary); text-decoration: underline; cursor: pointer;
}
.path-note__why:focus-visible, .path-more__toggle:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; border-radius: 2px; }
.path-more { margin-top: auto; border-top: 1px solid var(--border-subtle); padding-top: 1rem; } /* the two cards' toggles line up */
.path-more__toggle {
  display: flex; align-items: center; justify-content: space-between;
  list-style: none; cursor: pointer;
  font-size: 1.0625rem; font-weight: 500;
}
.path-more__toggle::-webkit-details-marker { display: none; }
.path-more__chev { transition: transform 0.15s ease; }
.path-more[open] .path-more__chev { transform: rotate(180deg); }
.path-more > :not(summary):first-of-type { margin-top: var(--space-3); }
.path-list > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.875rem;
}
.path-list dt { font-weight: 400; color: var(--text-secondary); }
.path-list__total { border-top: 1px solid var(--text-primary) !important; }
.path-list__total dt { color: var(--text-primary); font-weight: 500; }
.path-list dd { margin: 0; text-align: right; font-weight: 500; white-space: nowrap; }
.path-subhead {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
}
@media (max-width: 575.98px) {
  .path > .card-body { padding: 1.25rem 1.25rem 1.125rem; }
  .path-lines li { font-size: 1rem; }
}
@media (prefers-reduced-motion: reduce) {
  .path-more__chev, .path { transition: none; }
}
</style>
