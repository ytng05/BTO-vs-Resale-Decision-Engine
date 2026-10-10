<script setup>
// Map evidence for the Proximity Housing Grant (prof's suggestion): type the resale flat's postal code
// and the parents' postal code, and the map shows both points, a line between them and the distance.
// Distance comes from seat 3's GET /api/data/distance (OneMap). Whether it qualifies for PHG is the
// rules engine's job, shown in the grants table; this only shows where the two places are.
// Leaflet (BSD-2-Clause), https://leafletjs.com, with OneMap basemap tiles from the Singapore Land
// Authority. Check OneMap's docs for the current tile URL and required attribution before submission.
// The distance is also written out in text, so the map is never the only place the answer appears.
import { nextTick, onBeforeUnmount, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDistance } from '../../api/client.js';

const props = defineProps({
  initialParentsPostal: { type: String, default: '' },
});

const POSTAL = /^\d{6}$/;
const flatPostal = ref('');
const parentsPostal = ref(props.initialParentsPostal ?? '');
const touched = ref(false);
const loading = ref(false);
const error = ref(null);
const result = ref(null);

const el = ref(null);
let map = null;
let layer = null;

const TILE_URL = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
const ATTRIBUTION = '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

const fieldError = (value) => (touched.value && !POSTAL.test(value) ? 'Enter a 6-digit postal code, e.g. 520123.' : '');

function colour(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bs-${name}`).trim();
}

function draw() {
  const { from, to, km } = result.value;
  if (!map) {
    map = L.map(el.value, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { minZoom: 11, maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
  }
  layer?.remove();
  const a = [from.lat, from.lng];
  const b = [to.lat, to.lng];
  layer = L.layerGroup([
    L.polyline([a, b], { color: colour('primary'), weight: 3, dashArray: '6 6' })
      .bindTooltip(`${km} km`, { permanent: true, direction: 'center' }),
    L.circleMarker(a, { radius: 9, color: colour('white'), weight: 3, fillColor: colour('warning'), fillOpacity: 1 }).bindTooltip(from.address),
    L.circleMarker(b, { radius: 9, color: colour('white'), weight: 3, fillColor: colour('primary'), fillOpacity: 1 }).bindTooltip(to.address),
  ]).addTo(map);
  map.fitBounds(L.latLngBounds([a, b]), { padding: [40, 40], maxZoom: 16 });
}

async function check() {
  touched.value = true;
  if (!POSTAL.test(flatPostal.value) || !POSTAL.test(parentsPostal.value)) return;
  loading.value = true;
  error.value = null;
  try {
    result.value = await getDistance(flatPostal.value, parentsPostal.value);
    await nextTick(); // the map box only exists once there is a result
    draw();
  } catch (e) {
    error.value = e?.response?.data?.error?.message || 'The distance could not be checked. Try again in a minute.';
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => map?.remove());
</script>

<template>
  <div data-cy="dashboard-phg">
    <h3 class="h6">Distance to parents (for the Proximity Housing Grant)</h3>
    <form class="row g-2 align-items-start mb-3" novalidate @submit.prevent="check">
      <div class="col-12 col-sm-5">
        <label for="phg-flat" class="form-label small fw-semibold">Resale flat postal code</label>
        <input id="phg-flat" v-model.trim="flatPostal" inputmode="numeric" maxlength="6" class="form-control"
          :class="{ 'is-invalid': fieldError(flatPostal) }" aria-describedby="phg-flat-error" data-cy="dashboard-phg-flat-input" />
        <div id="phg-flat-error" class="invalid-feedback">{{ fieldError(flatPostal) }}</div>
      </div>
      <div class="col-12 col-sm-5">
        <label for="phg-parents" class="form-label small fw-semibold">Parents' postal code</label>
        <input id="phg-parents" v-model.trim="parentsPostal" inputmode="numeric" maxlength="6" class="form-control"
          :class="{ 'is-invalid': fieldError(parentsPostal) }" aria-describedby="phg-parents-error" data-cy="dashboard-phg-parents-input" />
        <div id="phg-parents-error" class="invalid-feedback">{{ fieldError(parentsPostal) }}</div>
      </div>
      <div class="col-12 col-sm-2 d-grid dash-phg-button">
        <button type="submit" class="btn btn-outline-primary" :disabled="loading" data-cy="dashboard-phg-check-button">
          {{ loading ? 'Checking…' : 'Check' }}
        </button>
      </div>
    </form>

    <div v-if="error" class="alert alert-danger small" role="alert" data-cy="dashboard-phg-error">{{ error }}</div>

    <div v-if="result" class="row g-3 align-items-center">
      <div class="col-12 col-md-7">
        <div ref="el" class="dash-map" role="img"
          :aria-label="`Map: ${result.from.address} is ${result.km} km from ${result.to.address}`"></div>
      </div>
      <div class="col-12 col-md-5 small" aria-live="polite">
        <p class="fw-semibold mb-2" data-cy="dashboard-phg-distance">Straight-line distance: {{ result.km }} km</p>
        <p class="mb-1"><span class="dash-dot dash-dot--resale" aria-hidden="true"></span>{{ result.from.address }}</p>
        <p class="mb-2"><span class="dash-dot dash-dot--bto" aria-hidden="true"></span>{{ result.to.address }}</p>
        <p class="text-secondary mb-0">
          From OneMap.<span v-if="result.mock"> Showing mock data.</span>
          Whether this qualifies for the grant is shown in the grants table.
        </p>
      </div>
    </div>
  </div>
</template>