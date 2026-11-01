<script setup>

import { computed, onMounted, ref } from 'vue';
import { getBtoProjects, getResalePrice } from '../../api/client.js';
import { btoColumn, pickBtoProject, resaleColumn, sizePriceRows } from '../../utils/sizePrice.js';

const props = defineProps({
  choiceA: { type: Object, required: true },
  choiceB: { type: Object, required: true },
  // The compare result: btoProjectA says which project was priced, resolvedA/B.purchasePriceCents the prices used
  // (today's; outcome*.purchasePriceCents is grown to the application year, D31).
  result: { type: Object, default: null },
});

const btoProject = ref(null);
const resale = ref(null);
const loading = ref(true);
const failed = ref(false);

// Sales in the user's lease band, as the comparison uses. A band with no sales answers 404, so ask again for all leases.
async function loadResale(b) {
  try {
    return await getResalePrice({ town: b.town, flatType: b.flatType, leaseBand: b.leaseBand });
  } catch (err) {
    if (!b.leaseBand) throw err;
    return getResalePrice({ town: b.town, flatType: b.flatType });
  }
}

async function load() {
  loading.value = true;
  failed.value = false;
  const a = props.choiceA;
  const b = props.choiceB;
  const [btoRes, resaleRes] = await Promise.allSettled([
    getBtoProjects({ town: a.town, flatType: a.flatType }),
    loadResale(b),
  ]);
  btoProject.value = btoRes.status === 'fulfilled'
    ? pickBtoProject(btoRes.value.projects, props.result?.btoProjectA?.id ?? a.btoProjectId)
    : null;
  resale.value = resaleRes.status === 'fulfilled' ? resaleRes.value : null;
  failed.value = btoRes.status === 'rejected' && resaleRes.status === 'rejected';
  loading.value = false;
}

onMounted(load);

const rows = computed(() => sizePriceRows(
  btoColumn(btoProject.value, props.result?.resolvedA?.purchasePriceCents),
  resaleColumn(resale.value, props.result?.resolvedB?.purchasePriceCents),
));
</script>


<template>
  <p v-if="loading" class="text-secondary small mb-0" role="status" data-cy="dashboard-size-price-loading">Loading flat sizes and prices…</p>
  <p v-else-if="failed" class="text-secondary small mb-0" data-cy="dashboard-size-price-error">
    Flat sizes and prices could not be loaded right now.
    <button type="button" class="btn btn-link btn-sm p-0 align-baseline" data-cy="dashboard-size-price-retry" @click="load">Try again</button>
  </p>
  <template v-else>
    <table class="table align-top mb-2 dash-grants" data-cy="dashboard-size-price">
      <thead>
        <tr class="small text-secondary">
          <th scope="col" class="fw-semibold"><span class="visually-hidden">Measure</span></th>
          <th scope="col" class="fw-semibold">BTO</th>
          <th scope="col" class="fw-semibold">Resale</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :data-cy="`dashboard-size-price-${row.id}`">
          <th scope="row" class="fw-semibold">{{ row.label }}</th>
          <td data-label="BTO" class="text-numeric" :data-cy="`dashboard-size-price-${row.id}-bto`">{{ row.bto }}</td>
          <td data-label="Resale" class="text-numeric" :data-cy="`dashboard-size-price-${row.id}-resale`">{{ row.resale }}</td>
        </tr>
      </tbody>
    </table>
    <p class="text-caption text-secondary mb-0">
        Price is the one this comparison uses, at today's prices. Price per m² divides it by the middle of the BTO
        project's floor area range, or by the median floor area of the resale sales. Resale sales are this flat type
        in the town over the last 12 months ("Based on" says whether in your lease band or all leases); the range is
        the middle half of them.
    </p>
  </template>
</template>
