<script setup>
// Version E: "How each purchase is paid", exact to the dollar (so the lines add up to the cash), from the price down
// to the cash, one card per path in its colour. A bar shows the split (loan, grants and CPF, cash). The comparisons
// between the paths live in "Side by side", so the cards don't repeat them. Long explanations (the loan limit, the
// short-lease note) show as a short tag, with the full sentence on hover and for screen readers.
// Keeps the tested hooks dashboard-summary-{bto|resale}-price and -affordability.
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { cashSentence, purchaseCard } from '../../utils/dashboardSummary.js';
import { monthYear } from '../../utils/dashboardFormat.js';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  resolvedB: { type: Object, default: null }, // /api/compare resolvedB: resale price paid and median (D39)
  subtitleA: { type: String, default: '' },
  subtitleB: { type: String, default: '' },
  cashSavings: { type: Number, default: null },
  cpfOa: { type: Number, default: null },
});

// Cash over valuation (D39): the resale price above the median (the valuation), grown to the purchase date the way
// the engine grows both. Already inside the cash needed; shown so the reader sees why resale cash is higher.
const covCents = computed(() => {
  const r = props.resolvedB;
  if (!r?.purchasePriceCents || !r?.medianPriceCents || r.purchasePriceCents <= r.medianPriceCents) return 0;
  const growth = (props.outcomeB.purchasePriceCents ?? r.purchasePriceCents) / r.purchasePriceCents;
  return Math.round((r.purchasePriceCents - r.medianPriceCents) * growth);
});
const cardA = computed(() => purchaseCard(props.outcomeA));
const cardB = computed(() => purchaseCard(props.outcomeB, { covCents: covCents.value }));
const sentence = computed(() => cashSentence(cardA.value, cardB.value));
const money = (cents) => formatMoney(cents / 100);
const limitText = (aff) => {
  if (!aff) return '';
  const rule = { LTV: 'the loan-to-value limit', MSR: 'your income (MSR)', TDSR: 'your total debt (TDSR)' }[aff.limitingRule] ?? aff.limitingRule;
  return aff.withinLimit
    ? `✓ Within your loan limit (max ${money(aff.maxLoanCents)}${rule ? `, set by ${rule}` : ''})`
    : `✗ Loan short by ${money(aff.shortfallCents)} (max ${money(aff.maxLoanCents)}${rule ? `, set by ${rule}` : ''})`;
};
const limitTag = (aff) => (!aff ? '' : aff.withinLimit ? 'Within limit' : 'Loan capped');
const LEASE_SHORT = 'LEASE_BELOW_95_PRORATION';
// Listing-style fact tags under each flat's name: lease, keys date and grants.
const tagsFor = (key, o, c, leaseShort) => [
  key === 'bto' ? 'New 99-year lease' : (leaseShort ? 'Short lease' : 'Resale flat'),
  o.timeline?.keyCollectionDate ? `Keys ${monthYear(o.timeline.keyCollectionDate)}` : '',
  c.grantsCents > 0 ? `${formatMoney(Math.round(c.grantsCents / 100 / 1000) * 1000)} in grants` : 'No grants',
].filter(Boolean);
const cards = computed(() => [
  { key: 'bto', name: 'BTO', sub: props.subtitleA, c: cardA.value, o: props.outcomeA, other: cardB.value, otherName: 'resale', when: 'At signing and at keys' },
  { key: 'resale', name: 'Resale', sub: props.subtitleB, c: cardB.value, o: props.outcomeB, other: cardA.value, otherName: 'BTO', when: 'At completion' },
].map((p) => ({
  ...p,
  limit: limitText(p.o.affordability),
  limitTag: limitTag(p.o.affordability),
  limitOk: Boolean(p.o.affordability?.withinLimit),
  leaseNote: (p.o.warnings ?? []).some((w) => (typeof w === 'string' ? w : w?.code) === LEASE_SHORT)
    ? 'The lease ends before your youngest buyer turns 95, so the HDB loan and the CPF you can use are reduced.' : '',
})));
</script>

<template>
  <section class="dash-panel" aria-labelledby="paid-heading" data-cy="dashboard-paid">
    <div class="dash-paid__top">
      <div>
        <h2 id="paid-heading" class="dash-panel__title">How you'd pay for it</h2>
        <p v-if="cashSavings !== null" class="text-secondary mb-0">
          You have {{ formatMoney(cashSavings) }} cash<template v-if="cpfOa !== null"> and {{ formatMoney(cpfOa) }} CPF</template> today.
        </p>
      </div>
    </div>
    <ul class="dash-paid__legend list-unstyled mb-0" aria-label="Bar colours">
      <li><span class="dash-paid__swatch dash-paid__swatch--loan"></span>Housing loan</li>
      <li><span class="dash-paid__swatch dash-paid__swatch--aid"></span>Grants and CPF</li>
      <li><span class="dash-paid__swatch dash-paid__swatch--cash"></span>Your cash</li>
    </ul>
    <div class="dash-paid">
      <article v-for="p in cards" :key="p.key" class="dash-paid__card" :class="`dash-paid__card--${p.key}`" :data-cy="`dashboard-paid-${p.key}`">
        <header class="dash-paid__head">
          <strong>{{ p.name }}</strong>
          <span class="small text-secondary">{{ p.sub }}</span>
          <span class="dash-paid__tags" :data-cy="`dashboard-paid-${p.key}-tags`">
            <span v-for="t in tagsFor(p.key, p.o, p.c, Boolean(p.leaseNote))" :key="t" class="dash-paid__tag-fact">{{ t }}</span>
          </span>
        </header>
        <div class="dash-paid__body">
          <div class="dash-paid__bar" aria-hidden="true">
            <span class="dash-paid__seg dash-paid__seg--loan" :style="{ width: `${p.c.shares.loan}%` }" :title="`Loan ${p.c.shares.loan}%`"></span>
            <span class="dash-paid__seg dash-paid__seg--aid" :style="{ width: `${p.c.shares.aid}%` }" :title="`Grants and CPF ${p.c.shares.aid}%`"></span>
            <span class="dash-paid__seg dash-paid__seg--cash" :style="{ width: `${p.c.shares.cash}%` }" :title="`Your cash ${p.c.shares.cash}%`"></span>
          </div>
          <p class="visually-hidden">Loan {{ p.c.shares.loan }}%, grants and CPF {{ p.c.shares.aid }}%, your cash {{ p.c.shares.cash }}%</p>
          <dl class="dash-paid__lines mb-0">
            <div v-if="p.c.hasPrice" class="is-price"><dt>Price</dt><dd><span class="text-numeric" :data-cy="`dashboard-summary-${p.key}-price`">{{ p.c.lines.price }}</span></dd></div>
            <div><dt>Grants</dt><dd><span class="text-numeric">{{ p.c.lines.grants }}</span><small v-if="p.c.lines.unusedGrants" class="is-vs" :data-cy="`dashboard-paid-${p.key}-unused-grants`">{{ p.c.lines.unusedGrants }}</small></dd></div>
            <div><dt>CPF Ordinary Account</dt><dd><span class="text-numeric">{{ p.c.lines.cpf }}</span></dd></div>
            <div>
              <dt>
                Housing loan
                <span
                  v-if="p.limitTag"
                  class="dash-paid__tag"
                  :class="p.limitOk ? 'dash-paid__tag--ok' : 'dash-paid__tag--warn'"
                  tabindex="0"
                  :title="p.limit"
                  :data-cy="`dashboard-summary-${p.key}-affordability`"
                >{{ p.limitTag }}<span class="visually-hidden">: {{ p.limit }}</span></span>
              </dt>
              <dd><span class="text-numeric">{{ p.c.lines.loan }}</span></dd>
            </div>
            <div v-if="p.c.hasPrice"><dt>Stamp duty and fees</dt><dd><span class="text-numeric">{{ p.c.lines.other }}</span></dd></div>
          </dl>
          <div class="dash-paid__total">
            <span>Cash needed<small>{{ p.when }}<template v-if="p.c.covCents"> · incl. {{ money(p.c.covCents) }} over valuation</template></small></span>
            <span class="text-numeric">{{ p.c.lines.cash }}</span>
          </div>
          <p v-if="p.leaseNote" class="dash-paid__note mb-0" tabindex="0" :title="p.leaseNote">Short lease: smaller loan and CPF use<span class="visually-hidden">. {{ p.leaseNote }}</span></p>
        </div>
      </article>
    </div>
    <p class="dash-paid__sentence mb-0" data-cy="dashboard-paid-sentence">{{ sentence }}</p>
  </section>
</template>

<style scoped>
.dash-paid__legend { display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: 0.8125rem; color: var(--text-secondary); }
.dash-paid__legend li { display: inline-flex; align-items: center; gap: var(--space-2); }
.dash-paid__swatch { width: 12px; height: 12px; border-radius: 3px; }
.dash-paid__swatch--loan, .dash-paid__seg--loan { background: var(--bar-indigo); }
.dash-paid__swatch--aid, .dash-paid__seg--aid { background: var(--accent-fill-1); }
.dash-paid__swatch--cash, .dash-paid__seg--cash { background: var(--bar-amber); }
.dash-paid__top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
/* BTO and resale side by side; stacked on phones. */
.dash-paid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-4); }
.dash-paid__card { border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-top: 4px solid var(--dash-ink); transition: background 0.25s ease, border-color 0.25s ease, translate 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease; }
/* Hover a path: it turns pink and lifts a little. */
.dash-paid__card:hover { background: var(--accent-tint); border-color: var(--accent-fill-1); border-top-color: var(--dash-ink); translate: 0 -4px; box-shadow: 0 14px 30px rgba(240, 138, 182, 0.22); }
.dash-paid__card:hover .dash-paid__lines > div { border-top-color: var(--accent-fill-2); }
@media (prefers-reduced-motion: reduce) { .dash-paid__card { transition: none; } .dash-paid__card:hover { translate: none; } }
.dash-paid__card--bto { --dash-tint: var(--dash-bto-tint); --dash-pale: var(--dash-bto-pale); --dash-ink: var(--dash-bto); }
.dash-paid__card--resale { --dash-tint: var(--dash-resale-tint); --dash-pale: var(--dash-resale-pale); --dash-ink: var(--dash-resale); }
.dash-paid__head { display: flex; flex-direction: column; padding: var(--space-4) var(--space-5) 0; color: var(--dash-ink); }
.dash-paid__head strong { font-size: 1.125rem; }
.dash-paid__tags { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); }
.dash-paid__tag-fact { padding: 2px var(--space-2); border-radius: 6px; background: var(--bg-page); color: var(--text-primary); font-size: 0.75rem; font-weight: 500; }
.dash-paid__card:hover .dash-paid__tag-fact { background: var(--bg-surface); }
.dash-paid__body { display: flex; flex-direction: column; padding: var(--space-4) var(--space-5) var(--space-5); }
.dash-paid__bar { display: flex; height: 16px; border-radius: var(--radius-pill); overflow: hidden; margin-bottom: var(--space-3); background: var(--bg-page); }
/* Each part of the bar: hover it to see its share; it brightens. */
.dash-paid__seg { display: block; height: 100%; cursor: help; transition: filter 0.2s ease, width var(--duration-base) var(--ease-out); }
.dash-paid__seg:hover { filter: brightness(1.12) saturate(1.2); }
.dash-paid__lines > div { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-2) 0; border-top: 1px solid var(--border-subtle); font-size: 0.9375rem; }
.dash-paid__lines > div.is-price { font-weight: 600; }
.dash-paid__lines dt { font-weight: inherit; display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.dash-paid__tag { padding: 1px 8px; border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 600; cursor: help; }
.dash-paid__tag--warn { background: var(--danger-fill); color: var(--danger); }
.dash-paid__tag--ok { background: var(--success-fill); color: var(--success); }
.dash-paid__tag:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.dash-paid__lines dt small, .dash-paid__total small { color: var(--text-secondary); font-weight: 400; font-size: 0.8125rem; }
.dash-paid__lines dd { margin: 0; display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.is-vs { color: var(--text-secondary); font-size: 0.8125rem; }
/* The total: a line above it and the figure in the path's colour, not another coloured box. */
.dash-paid__total { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0 0; border-top: 2px solid var(--text-primary); font-weight: 700; font-size: 1.0625rem; }
.dash-paid__total > span:last-child { color: var(--dash-ink); }
.dash-paid__total > span:first-child { display: flex; flex-direction: column; }
.dash-paid__note { align-self: flex-start; margin-top: var(--space-3); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); background: var(--warning-fill); color: var(--warning); font-size: 0.8125rem; font-weight: 600; cursor: help; }
/* The one-line takeaway: plain text with a thin accent line, not another coloured box. */
.dash-paid__sentence { padding-left: var(--space-4); border-left: 3px solid var(--dash-resale); font-weight: 500; }
</style>