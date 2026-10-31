<script setup>
// The friendly summary at the top of the Dashboard (D35: "what is this result made of?"). It does not repeat the
// verdict from Results; it shows the parts: the cash needed up front and how much of it you hold, what you
// start with, the grants, the cash spent on housing, and when the keys arrive. Both paths are always named in
// text. Money from the API is integer cents (divided by 100 for display); the store is in dollars.
import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';
import { monthYear, totalCpfOa } from '../../utils/dashboardFormat.js';
import CashCoverRing from './CashCoverRing.vue';

const props = defineProps({
  outcomeA: { type: Object, required: true },
  outcomeB: { type: Object, required: true },
  cashSavings: { type: Number, default: null }, // dollars, from the saved plan
  applicants: { type: Array, default: () => [] },
  horizon: { type: Number, default: null },
});

const dollars = (cents) => (typeof cents === 'number' ? cents / 100 : null);
const cpfOa = computed(() => totalCpfOa(props.applicants));
const buyers = computed(() => props.applicants.length);

const paths = computed(() => [
  { key: 'bto', label: 'BTO', o: props.outcomeA },
  { key: 'resale', label: 'Resale', o: props.outcomeB },
]);

</script>

<template>
  <section class="mb-4" aria-labelledby="overview-heading" data-cy="dashboard-overview">
    <h2 id="overview-heading" class="h5 mb-3">What this result is made of</h2>
    <div class="row g-3">
      <div class="col-12 col-lg-5">
        <div class="card h-100" data-cy="dashboard-cash-cover">
          <div class="card-body">
            <h3 class="h5">Cash you need up front</h3>
            <p class="text-secondary small mb-4">
              How much of the cash needed at purchase your savings <strong>today</strong> would cover. The calculation
              assumes you save nothing more before you buy, so the real picture may be better. CPF and the loan pay for
              the rest.
            </p>
            <div class="d-flex justify-content-around gap-3">
              <CashCoverRing
                v-for="p in paths"
                :key="p.key"
                :label="p.label"
                :tone="p.key"
                :cash-savings="cashSavings"
                :required-cents="p.o.cashRequiredAtPurchaseCents"
                :cy="`dashboard-cash-cover-${p.key}`"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div class="row g-3 h-100">
          <div class="col-12 col-sm-6">
            <div class="dash-tile" data-cy="dashboard-tile-savings">
              <h3 class="dash-tile__label">Your savings today</h3>
              <dl class="dash-tile__list">
                <div><dt>Cash</dt><dd class="text-numeric">{{ formatMoney(cashSavings) }}</dd></div>
                <div><dt>CPF Ordinary Account</dt><dd class="text-numeric">{{ formatMoney(cpfOa) }}</dd></div>
              </dl>
              <p class="dash-tile__note">{{ buyers > 1 ? 'CPF is both buyers added together.' : 'What you entered in your plan.' }}</p>
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <div class="dash-tile dash-tile--blush" data-cy="dashboard-tile-grants">
              <h3 class="dash-tile__label">Grants you may get</h3>
              <dl class="dash-tile__list">
                <div v-for="p in paths" :key="p.key">
                  <dt><span class="dash-dot" :class="`dash-dot--${p.key}`" aria-hidden="true"></span>{{ p.label }}</dt>
                  <dd class="text-numeric" :data-cy="`dashboard-summary-${p.key}-grants`">{{ formatMoney(dollars(p.o.totalGrantsCents)) }}</dd>
                </div>
              </dl>
              <p class="dash-tile__note">
                <a href="#grants-heading" data-cy="dashboard-grants-jump">See why each grant applies</a>
              </p>
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <div class="dash-tile" data-cy="dashboard-tile-housing-cash">
              <h3 class="dash-tile__label">Cash spent on housing<span v-if="horizon"> by {{ horizon }}</span></h3>
              <dl class="dash-tile__list">
                <div v-for="p in paths" :key="p.key">
                  <dt><span class="dash-dot" :class="`dash-dot--${p.key}`" aria-hidden="true"></span>{{ p.label }}</dt>
                  <dd class="text-numeric">{{ formatMoney(dollars(p.o.housingCashSpentCents)) }}</dd>
                </div>
              </dl>
              <p class="dash-tile__note">What you pay in cash: rent, renovation, fees and loan payments.</p>
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <div class="dash-tile dash-tile--periwinkle" data-cy="dashboard-tile-keys">
              <h3 class="dash-tile__label">Keys</h3>
              <dl class="dash-tile__list">
                <div v-for="p in paths" :key="p.key">
                  <dt><span class="dash-dot" :class="`dash-dot--${p.key}`" aria-hidden="true"></span>{{ p.label }}</dt>
                  <dd :data-cy="`dashboard-summary-${p.key}-keys`">{{ monthYear(p.o.timeline?.keyCollectionDate) }}</dd>
                </div>
              </dl>
              <p class="dash-tile__note">When you collect the keys.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash-tile {
  height: 100%;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.dash-tile--blush { background: var(--accent-fill-2); }
.dash-tile--periwinkle { background: var(--accent-fill-3); }
.dash-tile__label {
  font-family: var(--font-heading);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
  margin: 0;
}
.dash-tile__list { margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.dash-tile__list > div { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); }
.dash-tile__list dt { font-weight: 400; font-size: 0.875rem; color: var(--text-secondary); }
.dash-tile__list dd {
  margin: 0;
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 1.25rem;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  text-align: right;
}
.dash-tile__note { margin: auto 0 0; font-size: 0.75rem; color: var(--text-secondary); }
.dash-tile__note a { color: var(--text-primary); }
</style>
