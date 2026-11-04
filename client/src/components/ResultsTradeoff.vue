<script setup>
// "The trade-off": three rows, net position, cash at purchase and the keys, from keyRows() in utils/resultsVerdict.js.
// The better side of each row has a ✓ AND bold text, and screen readers hear "(better)": never colour alone. Within
// the "too close to call" line (D42) the net position row names no side. Grants are not a row: they are already in
// net position (D1). The full side-by-side table is on the Dashboard.
import { computed } from 'vue';

const props = defineProps({
  rows: { type: Array, required: true }, // keyRows()
  close: { type: Boolean, default: false },
});
const SHOWN = ['position', 'cash', 'keys'];
const LABELS = { cash: 'Cash at purchase' };
const shown = computed(() => SHOWN
  .map((id) => props.rows.find((r) => r.id === id))
  .filter(Boolean)
  .map((r) => {
    const better = r.id === 'position' && props.close ? null : r.better;
    const note = better && r.diffLead ? `${r.diffLead} ${r.diffRest.replace(/ with (BTO|Resale)$/i, '')}` : '';
    return { ...r, label: LABELS[r.id] ?? r.label, better, note: r.id === 'position' && props.close ? 'Too close to call' : note };
  }));
</script>

<template>
  <section class="to" aria-labelledby="to-title" data-cy="results-tradeoff">
    <h2 id="to-title" class="to__title">The trade-off</h2>
    <p class="to__lead">What you gain and give up with each path. ✓ marks the better one.</p>
    <table class="to__table">
      <caption class="visually-hidden">Net position, cash at purchase and the keys, BTO next to resale. The better side of each row is marked.</caption>
      <thead>
        <tr>
          <td></td>
          <th scope="col" class="to__col to__col--bto">BTO</th>
          <th scope="col" class="to__col to__col--resale">Resale</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in shown" :key="r.id" :data-cy="`results-tradeoff-${r.id}`">
          <th scope="row">{{ r.label }}</th>
          <td :class="{ 'is-better': r.better === 'a' }" :data-cy="`results-tradeoff-${r.id}-bto`">
            <span v-if="r.better === 'a'" aria-hidden="true">✓ </span><span class="text-numeric">{{ r.a }}</span><span v-if="r.better === 'a'" class="visually-hidden"> (better)</span>
            <small v-if="r.better === 'a' && r.note">{{ r.note }}</small>
            <small v-else-if="r.id === 'keys'">estimated</small>
            <small v-else-if="r.id === 'position' && close">{{ r.note }}</small>
          </td>
          <td :class="{ 'is-better': r.better === 'b' }" :data-cy="`results-tradeoff-${r.id}-resale`">
            <span v-if="r.better === 'b'" aria-hidden="true">✓ </span><span class="text-numeric">{{ r.b }}</span><span v-if="r.better === 'b'" class="visually-hidden"> (better)</span>
            <small v-if="r.better === 'b' && r.note">{{ r.note }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.to { display: flex; flex-direction: column; gap: var(--space-2); height: 100%; padding: clamp(20px, 3vw, 32px); border-radius: var(--radius-md); background: var(--bg-surface); }
.to__title { margin: 0; font-size: 1.375rem; font-weight: 600; }
.to__lead { margin: 0 0 var(--space-2); color: var(--text-secondary); }
.to__table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.to__table th, .to__table td { padding: var(--space-3) 0; text-align: right; vertical-align: top; }
.to__table tbody th { text-align: left; font-weight: 500; padding-right: var(--space-3); }
.to__table tbody tr { border-top: 1px solid var(--border-subtle); }
.to__col { font-weight: 600; font-size: 0.875rem; }
.to__col--bto { color: var(--accent-deep); }
.to__col--resale { color: var(--color-berry); }
.to__table td + td { padding-left: var(--space-3); }
.to__table td.is-better { font-weight: 700; }
.to__table small { display: block; font-weight: 400; font-size: 0.8125rem; color: var(--text-secondary); }
</style>
