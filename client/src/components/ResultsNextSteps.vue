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
    text: 'You need one before you apply for a BTO flat, or before you get an option to buy a resale flat with an HDB loan. It confirms the grants and the loan you can get.',
    link: { href: 'https://www.mynicehome.gov.sg/get-started/hdb-loans-guide/', label: 'HDB loans guide (MyNiceHome)' },
  },
  {
    id: 'grants',
    title: 'Check the grants with CPF',
    text: 'Our grant figures are estimates from your answers. CPF and HDB confirm the actual amounts when you apply.',
    link: { href: 'https://www.cpf.gov.sg/member/infohub/educational-resources/a-guide-to-enhanced-cpf-housing-and-proximity-housing-grant', label: 'CPF guide to the EHG and PHG' },
  },
  {
    id: 'afford',
    title: 'Work out a budget you are comfortable with',
    text: 'Keep a buffer for monthly instalments, renovation and emergencies, beyond what the comparison needs.',
    link: { href: 'https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/', label: 'MoneySense: how much can you afford' },
  },
  {
    id: 'resale',
    resaleOnly: true,
    title: 'Read how a resale purchase is paid for',
    text: 'The order of payments, what CPF can cover, and when cash is needed (including any amount above the valuation).',
    link: { href: 'https://www.hdb.gov.sg/residential/buying-a-flat/buying-procedure-for-resale-flats/plan-source-and-contract/mode-of-financing', label: 'HDB: mode of financing for resale flats' },
  },
  {
    id: 'conditions',
    title: 'Know the conditions after you buy',
    text: 'The minimum occupation period, and what you can and cannot do with the flat until it ends.',
    link: { href: 'https://www.hdb.gov.sg/residential/buying-a-flat/conditions-after-buying', label: 'HDB: conditions after buying' },
  },
];
</script>

<template>
  <section class="card mb-3 next-steps" aria-labelledby="next-steps-title" data-cy="results-next-steps">
    <div class="card-body">
      <h2 id="next-steps-title" class="h5">What to do next</h2>
      <p class="text-secondary">This comparison helps you choose. These steps make it official.</p>
      <ol class="next-steps__list">
        <li v-for="s in STEPS.filter((x) => hasResale || !x.resaleOnly)" :key="s.id" :data-cy="`results-next-step-${s.id}`">
          <strong class="next-steps__title">{{ s.title }}</strong>
          <span class="next-steps__text">{{ s.text }}</span>
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
.next-steps__list { margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: var(--space-3); }
.next-steps__list li { padding-left: var(--space-1); }
.next-steps__title { display: block; font-weight: 600; }
.next-steps__text { display: block; color: var(--text-secondary); line-height: 1.5; }
.next-steps__link { display: inline-block; margin-top: var(--space-1); font-weight: 500; }
.next-steps__url { font-size: 0.75rem; color: var(--text-secondary); overflow-wrap: anywhere; }
</style>
