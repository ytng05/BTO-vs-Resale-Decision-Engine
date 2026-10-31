<script setup>
// Dashboard card: the parents' home, a 4 km circle round it, the resale and BTO towns, and (optionally)
// the resale flat the user has in mind, so they can check their Proximity Housing Grant answer.
// DISPLAY-ONLY (D15): PHG eligibility stays what the user declared; this card never changes it.
// Postal codes typed here are not saved with your scenario or linked to your account (the server caches geocode results, not tied to any user).
//
// Data: GET /api/data/geocode, /town-point, /distance (OneMap, cached on the server; api/onemap.js).
// Map: Leaflet (BSD-2-Clause) on OneMap's Default basemap. OneMap's terms require its logo and
// attribution on the map: https://www.onemap.gov.sg/docs/maps/
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import 'leaflet/dist/leaflet.css';
import { geocodePostal, getDistance, getTownPoint } from '../../api/onemap.js';
import { formatKm, haversineKm, isPoint, isValidPostal, phgCheck, PHG_RADIUS_KM } from '../../utils/phgMap.js';

const props = defineProps({
  btoTown: { type: String, default: null },
  resaleTown: { type: String, default: null },
  livingArrangement: { type: String, default: 'NONE' }, // choiceB.livingArrangement: WITH | NEAR | NONE
});

const SG_CENTRE = [1.3521, 103.8198];
const SG_BOUNDS = [[1.144, 103.535], [1.494, 104.502]];
const ONEMAP_TILES = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png';
const ONEMAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo_round@2x.png" alt="" style="height:20px;width:20px;vertical-align:middle"/>&nbsp;'
  + '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;'
  + '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

const parentsPostal = ref('');
const flatPostal = ref('');
const touched = ref(false);
const loading = ref(false);
const error = ref('');
const parents = ref(null); // { lat, lng, address }
const flat = ref(null); // { lat, lng, address }
const towns = ref({ bto: null, resale: null }); // { lat, lng, label }
const km = ref(null);
const approximate = ref(false);

const mapEl = ref(null);
const L = shallowRef(null);
const map = shallowRef(null);
const layer = shallowRef(null);

const parentsInvalid = computed(() => touched.value && !isValidPostal(parentsPostal.value));
const flatInvalid = computed(() => touched.value && flatPostal.value.trim() !== '' && !isValidPostal(flatPostal.value));
const check = computed(() => phgCheck(props.livingArrangement, km.value, approximate.value));
const townLabel = (t) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : '');

const errorMessage = (e, fallback) => e?.response?.data?.error?.message || fallback;

function color(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function draw() {
  if (!map.value || !L.value) return;
  const Lf = L.value;
  layer.value.clearLayers();
  const points = [];
  const pin = (p, fill, label) => {
    Lf.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: fill, fillOpacity: 1 })
      .bindTooltip(label).addTo(layer.value);
    points.push([p.lat, p.lng]);
  };
  const primary = color('--bs-primary', '#1f4e8c');
  if (isPoint(towns.value.bto)) pin(towns.value.bto, color('--bs-secondary', '#6c757d'), `BTO town: ${townLabel(props.btoTown)} (approximate)`);
  if (isPoint(towns.value.resale)) pin(towns.value.resale, color('--bs-info', '#0b7285'), `Resale town: ${townLabel(props.resaleTown)} (approximate)`);
  if (isPoint(parents.value)) {
    Lf.circle([parents.value.lat, parents.value.lng], {
      radius: PHG_RADIUS_KM * 1000, color: primary, weight: 2, fillColor: primary, fillOpacity: 0.08,
    }).addTo(layer.value);
    pin(parents.value, primary, `Parents' home${parents.value.address ? `: ${parents.value.address}` : ''}`);
    points.push(...circleCorners(parents.value));
  }
  if (isPoint(flat.value)) pin(flat.value, color('--bs-success', '#2b8a3e'), `Resale flat${flat.value.address ? `: ${flat.value.address}` : ''}`);
  if (points.length) map.value.fitBounds(points, { padding: [24, 24], maxZoom: 15 });
}

// Two corners of the 4 km circle's box, so fitBounds always shows the whole circle.
function circleCorners(p) {
  const dLat = PHG_RADIUS_KM / 111.32;
  const dLng = PHG_RADIUS_KM / (111.32 * Math.cos((p.lat * Math.PI) / 180));
  return [[p.lat - dLat, p.lng - dLng], [p.lat + dLat, p.lng + dLng]];
}

async function loadTowns() {
  const one = async (town) => {
    if (!town) return null;
    try { return await getTownPoint(town); } catch { return null; } // e.g. a new BTO town OneMap can't place
  };
  const [bto, resale] = await Promise.all([one(props.btoTown), one(props.resaleTown)]);
  towns.value = { bto, resale };
  draw();
}

async function show() {
  touched.value = true;
  error.value = '';
  if (parentsInvalid.value || flatInvalid.value) return;
  loading.value = true;
  const parentsCode = parentsPostal.value.trim();
  const flatCode = flatPostal.value.trim();
  try {
    if (flatCode) {
      // Exact: OneMap places both postal codes and the server measures between them.
      const d = await getDistance(parentsCode, flatCode);
      parents.value = d.from;
      flat.value = d.to;
      km.value = d.km;
      approximate.value = false;
    } else {
      parents.value = await geocodePostal(parentsCode);
      flat.value = null;
      km.value = haversineKm(parents.value, towns.value.resale); // null if the town couldn't be placed
      approximate.value = true;
    }
  } catch (e) {
    parents.value = null;
    flat.value = null;
    km.value = null;
    error.value = errorMessage(e, 'The map could not be loaded. Check the postal codes and try again.');
  } finally {
    loading.value = false;
    draw();
  }
}

onMounted(async () => {
  // Leaflet touches window, so it is loaded only in the browser, after the card is on the page.
  const mod = await import('leaflet');
  L.value = mod.default ?? mod;
  map.value = L.value.map(mapEl.value, {
    dragging: !window.matchMedia('(pointer: coarse)').matches, // a one-finger swipe scrolls the page on phones; pinch still zooms
    center: SG_CENTRE, zoom: 11, minZoom: 11, maxZoom: 18, maxBounds: SG_BOUNDS, scrollWheelZoom: false,
  });
  L.value.tileLayer(ONEMAP_TILES, { detectRetina: true, minZoom: 11, maxZoom: 18, attribution: ONEMAP_ATTRIBUTION }).addTo(map.value);
  layer.value = L.value.layerGroup().addTo(map.value);
  loadTowns();
});

onBeforeUnmount(() => map.value?.remove());
</script>

<template>
  <section class="card" aria-labelledby="phg-map-heading" data-cy="dashboard-phg-map">
    <div class="card-body">
      <h2 id="phg-map-heading" class="h5">Near your parents (or child)? (Proximity Housing Grant)</h2>
      <p class="text-secondary small">
        Enter your parents' postal code to see the {{ PHG_RADIUS_KM }} km circle the PHG uses. Add the resale flat's
        postal code for its exact distance. This map is a guide only: your grants use the answer you gave in the plan.
        Postal codes typed here aren't saved with your scenario or linked to your account.
      </p>

      <form class="row g-2 align-items-end mb-3" novalidate @submit.prevent="show">
        <div class="col-12 col-sm-5">
          <label for="phg-parents-postal" class="form-label small">Parents' postal code</label>
          <input
            id="phg-parents-postal" v-model="parentsPostal" type="text" inputmode="numeric" maxlength="6"
            autocomplete="off" class="form-control" :class="{ 'is-invalid': parentsInvalid }"
            :aria-invalid="parentsInvalid" aria-describedby="phg-parents-postal-error" data-cy="phg-parents-postal-input"
          />
          <div id="phg-parents-postal-error" class="invalid-feedback">Enter a 6-digit postal code.</div>
        </div>
        <div class="col-12 col-sm-5">
          <label for="phg-flat-postal" class="form-label small">Resale flat's postal code (optional)</label>
          <input
            id="phg-flat-postal" v-model="flatPostal" type="text" inputmode="numeric" maxlength="6"
            autocomplete="off" class="form-control" :class="{ 'is-invalid': flatInvalid }"
            :aria-invalid="flatInvalid" aria-describedby="phg-flat-postal-error" data-cy="phg-flat-postal-input"
          />
          <div id="phg-flat-postal-error" class="invalid-feedback">Enter a 6-digit postal code, or leave it empty.</div>
        </div>
        <div class="col-12 col-sm-2 d-grid">
          <button type="submit" class="btn btn-primary" :disabled="loading" data-cy="phg-show-button">
            {{ loading ? 'Finding…' : 'Show' }}
          </button>
        </div>
      </form>

      <div v-if="error" class="alert alert-warning small" role="alert" data-cy="phg-map-error">{{ error }}</div>

      <p v-if="km !== null" class="mb-1" role="status" data-cy="phg-distance">
        {{ approximate ? `${townLabel(resaleTown)} town centre` : 'Resale flat' }}:
        <strong class="text-numeric">{{ formatKm(km) }}</strong> from your parents' home
        <template v-if="approximate"> (approximate)</template>
      </p>
      <p v-if="check" class="small mb-3" :class="`text-${check.tone === 'warning' ? 'danger' : 'secondary'}`" data-cy="phg-check-note">
        {{ check.text }}
      </p>

      <div ref="mapEl" class="phg-map" role="img"
        :aria-label="`Map of Singapore showing ${parents ? 'your parents\' home with a 4 km circle, ' : ''}the ${townLabel(resaleTown) || 'resale'} and ${townLabel(btoTown) || 'BTO'} towns`"
        data-cy="phg-map-canvas"></div>
      <p class="text-caption mt-2 mb-0">
        Town points are approximate town centres. Distances are straight-line estimates; HDB checks the 4 km rule itself when you apply.
      </p>
    </div>
  </section>
</template>

<style scoped>
.phg-map {
  width: 100%;
  height: 320px;
  border-radius: 0.5rem;
  overflow: hidden;
  z-index: 0; /* keep Leaflet's panes under the sticky navbar */
}
@media (max-width: 575.98px) {
  .phg-map { height: 260px; }
}
</style>