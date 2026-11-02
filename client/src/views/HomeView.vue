<script setup>
import { useRouter } from 'vue-router';
import { useScenarioStore } from '../stores/scenario.js';
import { EXAMPLE_PLAN } from '../constants/examplePlan.js';
import HeroScene from '../components/HeroScene.vue';
import HowItWorksCarousel from '../components/HowItWorksCarousel.vue';

const store = useScenarioStore();
const router = useRouter();

// Fill the plan with a ready-made couple and open their Results; "Change inputs" there makes it their own.
function seeExample() {
  store.loadSaved(EXAMPLE_PLAN);
  router.push('/results');
}
</script>

<template>
  <!-- Phones: copy, scene, how it works, one under another. From 992px: copy and how it works side by side, so
       both are on the first screen, with the scene as a full-width band below (it is 3:1, too wide for a column). -->
  <section class="home-hero py-4">
    <div class="home-hero__copy">
      <h1 class="h2" data-cy="home-title">BTO or resale: which leaves you better off?</h1>
      <p class="text-secondary" data-cy="home-lead">
        You've got a BTO ballot coming up and a resale listing you keep looking at. Tell us about your situation and
        we'll compare both, then show where the answer would flip. No sign-up needed: you can plan without an account.
      </p>
      <div class="d-flex flex-wrap gap-2">
        <router-link class="btn btn-primary" to="/login?redirect=/plan" data-cy="home-start-button">Start planning</router-link>
        <button type="button" class="btn btn-outline-secondary" data-cy="home-example-button" @click="seeExample">
          See an example
        </button>
      </div>
      <!-- Where the numbers come from, in words (the navbar already shows how current the grant rules are). -->
      <p class="small text-secondary mt-3 mb-0" data-cy="home-trust">
        Prices from HDB data on data.gov.sg ·
        <router-link to="/sources" data-cy="home-sources-link">See every rule and data source</router-link>
      </p>
    </div>
    <HowItWorksCarousel class="home-hero__how" />
    <HeroScene class="home-hero__scene" />
  </section>
</template>

<style scoped>
.home-hero {
  display: grid;
  gap: var(--space-5);
  grid-template-areas: "copy" "scene" "how";
}
.home-hero__copy { grid-area: copy; }
.home-hero__how { grid-area: how; }
.home-hero__scene { grid-area: scene; }

@media (min-width: 992px) {
  .home-hero {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    grid-template-areas: "copy how" "scene scene";
    column-gap: var(--space-8);
    align-items: center;
  }
}
</style>
