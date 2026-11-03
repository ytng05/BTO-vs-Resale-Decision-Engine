<script setup>
// "What to do next" at the end of Results: the official steps after a comparison, each with a link to the
// government page that covers it. The links are ones the ruleset already cites (ruleset-2026-08-24.json), so
// they have been checked; the step text is plain-English guidance, not a rule the engine uses.
defineProps({
  // The resale step only shows when the plan has a resale flat (it always does today; kept for safety).
  hasResale: { type: Boolean, default: true },
});

const STEPS = [
  {
    id: 'hfe',
    title: 'Get an HDB Flat Eligibility (HFE) letter',
    text: 'Needed before you apply for a BTO or buy a resale flat. Valid for 9 months.',
    link: { href: 'https://www.mynicehome.gov.sg/get-started/hdb-loans-guide/', label: 'HDB loans guide (MyNiceHome)' },
  },
  {
    id: 'grants',
    title: 'Check the grants with CPF',
    text: 'Our grant figures are estimates. CPF and HDB confirm the real amounts.',
    link: { href: 'https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-housing-grant', label: 'CPF guide to the EHG and PHG' },
  },
  {
    id: 'afford',
    title: 'Work out a budget you are comfortable with',
    text: 'Leave room for renovation and emergencies. Loan instalments can\'t exceed 30% of income.',
    link: { href: 'https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/', label: 'MoneySense: how much can you afford' },
  },
  {
    id: 'resale',
    resaleOnly: true,
    title: 'Read how a resale purchase is paid for',
    text: 'What you pay first, what CPF covers, and any cash above the valuation.',
    link: { href: 'https://www.hdb.gov.sg/residential/buying-a-flat/buying-procedure-for-resale-flats/plan-source-and-contract/mode-of-financing', label: 'HDB: mode of financing for resale flats' },
  },
  {
    id: 'conditions',
    title: 'Know the conditions after you buy',
    text: 'How long you must live in it, and what you can\'t do until then.',
    link: { href: 'https://www.hdb.gov.sg/residential/buying-a-flat/conditions-after-buying', label: 'HDB: conditions after buying' },
  },
];
</script>

<template>
  <section class="card mb-3 next-steps" aria-labelledby="next-steps-title" data-cy="results-next-steps">
    <div class="card-body">
      <h2 id="next-steps-title" class="h5 mb-1">What to do next</h2>
      <p class="text-secondary next-steps__intro">The comparison helps you choose. These steps make it official.</p>
      <ol class="next-steps__list" role="list">
        <li v-for="s in STEPS.filter((x) => hasResale || !x.resaleOnly)" :key="s.id" :data-cy="`results-next-step-${s.id}`">
          <div class="next-steps__main">
            <strong class="next-steps__title">{{ s.title }}</strong>
            <span class="next-steps__text">{{ s.text }}</span>
          </div>
          <a :href="s.link.href" target="_blank" rel="noopener noreferrer" class="next-steps__link">
            {{ s.link.label }}<span class="visually-hidden"> (opens in a new tab)</span> ↗
          </a>
          <span class="next-steps__url d-none d-print-block">{{ s.link.href }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.next-steps__intro { margin-bottom: var(--space-3); }
.next-steps__list { list-style: none; margin: 0; padding: 0; counter-reset: step; }
.next-steps__list li {
  counter-increment: step;
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border-subtle);
}
.next-steps__list li::before {
  content: counter(step);
  display: grid; place-items: center;
  width: 1.75rem; height: 1.75rem;
  border-radius: 50%;
  background: var(--accent-fill-3);
  font-size: 0.8125rem; font-weight: 600;
}
.next-steps__title { display: block; font-weight: 600; }
.next-steps__text { display: block; margin-top: 0.125rem; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.45; }
.next-steps__link {
  display: inline-flex; align-items: center;
  min-height: 2.25rem;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  font-size: 0.875rem; font-weight: 500;
  white-space: nowrap;
}
.next-steps__url { grid-column: 2 / -1; font-size: 0.75rem; color: var(--text-secondary); overflow-wrap: anywhere; }
@media (max-width: 767.98px) {
  .next-steps__list li { grid-template-columns: 2rem minmax(0, 1fr); align-items: start; }
  .next-steps__list li::before { margin-top: 0.125rem; }
  .next-steps__link { grid-column: 2; justify-self: start; margin-top: var(--space-2); white-space: normal; padding-top: 0.375rem; padding-bottom: 0.375rem; }
}
</style>
