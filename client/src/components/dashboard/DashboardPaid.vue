<script setup>
// Version E: "How each purchase is paid", exact to the dollar, from the price down to the cash, one card per path in
// its colour. A bar shows the split (loan, grants and CPF, cash); a "vs" note under a figure says how it differs
// from the other path. Keeps the tested hooks dashboard-summary-{bto|resale}-price and -affordability.
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { cashSentence, purchaseCard, versus } from '../../utils/dashboardSummary.js';

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
const LEASE_SHORT = 'LEASE_BELOW_95_PRORATION';
const cards = computed(() => [
  { key: 'bto', name: 'BTO', sub: props.subtitleA, c: cardA.value, o: props.outcomeA, other: cardB.value, otherName: 'resale', when: 'At signing and at keys' },
  { key: 'resale', name: 'Resale', sub: props.subtitleB, c: cardB.value, o: props.outcomeB, other: cardA.value, otherName: 'BTO', when: 'At completion' },
].map((p) => ({
  ...p,
  vsPrice: versus(p.c.priceCents, p.other.priceCents, p.otherName),
  vsGrants: versus(p.c.grantsCents, p.other.grantsCents, p.otherName),
  vsLoan: versus(p.c.loanCents, p.other.loanCents, p.otherName),
  limit: limitText(p.o.affordability),
  leaseNote: (p.o.warnings ?? []).some((w) => (typeof w === 'string' ? w : w?.code) === LEASE_SHORT)
    ? 'The lease ends before your youngest buyer turns 95, so the HDB loan and the CPF you can use are reduced.' : '',
})));
</script>

<template>
  <section class="dash-panel" aria-labelledby="paid-heading" data-cy="dashboard-paid">
    <div>
      <h2 id="paid-heading" class="dash-panel__title">How each purchase is paid</h2>
      <p class="text-secondary mb-0">
        From the price down to the cash you put in.
        <template v-if="cashSavings !== null">Your savings today: {{ formatMoney(cashSavings) }} cash<template v-if="cpfOa !== null"> and {{ formatMoney(cpfOa) }} CPF</template> (both of you).</template>
      </p>
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
        </header>
        <div class="dash-paid__body">
          <div class="dash-paid__bar" aria-hidden="true">
            <span class="dash-paid__seg dash-paid__seg--loan" :style="{ width: `${p.c.shares.loan}%` }"></span>
            <span class="dash-paid__seg dash-paid__seg--aid" :style="{ width: `${p.c.shares.aid}%` }"></span>
            <span class="dash-paid__seg dash-paid__seg--cash" :style="{ width: `${p.c.shares.cash}%` }"></span>
          </div>
          <p class="small text-secondary mb-2">Loan {{ p.c.shares.loan }}% · grants and CPF {{ p.c.shares.aid }}% · your cash {{ p.c.shares.cash }}%</p>
          <dl class="dash-paid__lines mb-0">
            <div v-if="p.c.hasPrice"><dt>Price before grants</dt><dd><span class="text-numeric" :class="{ 'is-strong': p.vsPrice }" :data-cy="`dashboard-summary-${p.key}-price`">{{ p.c.lines.price }}</span><small v-if="p.vsPrice" class="is-vs">{{ p.vsPrice }}</small></dd></div>
            <div><dt>Grants<small>Paid towards the price</small></dt><dd><span class="text-numeric">{{ p.c.lines.grants }}</span><small v-if="p.vsGrants" class="is-vs is-vs--quiet">{{ p.vsGrants }}</small><small v-if="p.c.lines.unusedGrants" class="is-vs is-vs--quiet" :data-cy="`dashboard-paid-${p.key}-unused-grants`">{{ p.c.lines.unusedGrants }}</small></dd></div>
            <div><dt>CPF Ordinary Account</dt><dd><span class="text-numeric">{{ p.c.lines.cpf }}</span></dd></div>
            <div>
              <dt>Housing loan<small :data-cy="`dashboard-summary-${p.key}-affordability`">{{ p.limit }}</small></dt>
              <dd><span class="text-numeric">{{ p.c.lines.loan }}</span><small v-if="p.vsLoan" class="is-vs is-vs--quiet">{{ p.vsLoan }}</small></dd>
            </div>
            <div v-if="p.c.hasPrice"><dt>Stamp duty, fees and other costs</dt><dd><span class="text-numeric">{{ p.c.lines.other }}</span></dd></div>
          </dl>
          <div class="dash-paid__total">
            <span>Cash needed<small>{{ p.when }}<template v-if="p.c.covCents"> · includes {{ money(p.c.covCents) }} cash over valuation</template></small></span>
            <span class="text-numeric">{{ p.c.lines.cash }}</span>
          </div>
          <p v-if="p.leaseNote" class="dash-paid__note mb-0">{{ p.leaseNote }}</p>
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
.dash-paid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: var(--space-4); }
.dash-paid__card { border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); border: 1.5px solid var(--dash-tint); }
.dash-paid__card--bto { --dash-tint: var(--dash-bto-tint); --dash-pale: var(--dash-bto-pale); --dash-ink: var(--dash-bto); }
.dash-paid__card--resale { --dash-tint: var(--dash-resale-tint); --dash-pale: var(--dash-resale-pale); --dash-ink: var(--dash-resale); }
.dash-paid__head { display: flex; flex-direction: column; padding: var(--space-4) var(--space-5); background: var(--dash-pale); color: var(--dash-ink); border-bottom: 1.5px solid var(--dash-tint); }
.dash-paid__head strong { font-size: 1.125rem; }
.dash-paid__body { display: flex; flex-direction: column; padding: var(--space-4) var(--space-5) var(--space-5); }
.dash-paid__bar { display: flex; height: 16px; border-radius: var(--radius-pill); overflow: hidden; margin-bottom: var(--space-1); background: var(--bg-page); }
.dash-paid__seg { display: block; height: 100%; }
.dash-paid__lines > div { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid var(--border-subtle); }
.dash-paid__lines dt { font-weight: 400; display: flex; flex-direction: column; }
.dash-paid__lines dt small, .dash-paid__total small { color: var(--text-secondary); font-weight: 400; font-size: 0.8125rem; }
.dash-paid__lines dd { margin: 0; display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.is-strong { color: var(--dash-ink); font-weight: 700; }
.is-vs { color: var(--dash-ink); font-weight: 600; font-size: 0.8125rem; }
.is-vs--quiet { color: var(--text-secondary); font-weight: 400; }
.dash-paid__total { display: flex; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-1); padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--dash-pale); color: var(--dash-ink); font-weight: 700; font-size: 1.0625rem; }
.dash-paid__total > span:first-child { display: flex; flex-direction: column; }
.dash-paid__note { margin-top: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: var(--bg-page); border: 1px solid var(--border-subtle); font-size: 0.875rem; color: var(--text-secondary); }
.dash-paid__sentence { padding: var(--space-4) var(--space-5); border-radius: var(--radius-sm); background: var(--dash-resale-pale); font-weight: 500; }
</style>
