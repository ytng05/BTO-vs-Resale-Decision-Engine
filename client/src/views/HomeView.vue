<script setup>
import { onMounted, ref } from 'vue';
import { getRuleset } from '../api/client.js';
import RulesetBadge from '../components/RulesetBadge.vue';
import HeroScene from '../components/HeroScene.vue';

const ruleset = ref(null);
onMounted(async () => {
  try {
    ruleset.value = await getRuleset();
  } catch {
    ruleset.value = null; // badge simply hides if the API is down
  }
});
</script>

<template>
  <section class="py-4">
    <h1 class="h2" data-cy="home-title">BTO or resale: which leaves you better off?</h1>
    <p class="text-secondary" data-cy="home-lead">
      You've got a BTO ballot coming up and a resale listing you keep looking at. Tell us about your situation and
      we'll compare both, then show where the answer would flip. No sign-up needed: you can plan without an account.
    </p>
      <router-link class="btn btn-primary" to="/login?redirect=/plan" data-cy="home-start-button">Start planning</router-link>
    <div class="mt-3">
      <RulesetBadge v-if="ruleset" v-bind="ruleset" />
    </div>
    <HeroScene class="mt-4" />
  </section>
</template>
