<script setup>
// Any address the app doesn't know (a typo, an old link): say so plainly and offer the ways back.
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <section class="not-found card" aria-labelledby="not-found-title" data-cy="not-found">
    <div class="card-body">
      <p class="not-found__code" aria-hidden="true">404</p>
      <h1 id="not-found-title" class="h2 mb-2">We couldn't find that page</h1>
      <p class="text-secondary mb-4">
        There's nothing at <code class="not-found__path">{{ route.fullPath }}</code>. The link may be old or mistyped.
      </p>
      <div class="d-flex flex-wrap gap-2">
        <router-link to="/" class="btn btn-primary" data-cy="not-found-home-link">Go to the home page</router-link>
        <router-link to="/plan" class="btn btn-outline-secondary" data-cy="not-found-plan-link">Start a plan</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.not-found { max-width: 40rem; margin: var(--space-8) auto; }
.not-found .card-body { padding: clamp(24px, 4vw, 40px); }
.not-found__code { margin: 0 0 var(--space-2); font-size: 14px; font-weight: 600; letter-spacing: 0.04em; color: var(--color-berry); }
.not-found__path { overflow-wrap: anywhere; color: var(--text-primary); }
</style>
