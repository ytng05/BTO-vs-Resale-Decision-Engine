<script setup>
import AppNavbar from './components/AppNavbar.vue';
import DisclaimerBanner from './components/DisclaimerBanner.vue';
</script>

<template>
  <div class="app-shell">
    <AppNavbar />
    <main>
      <router-view />
    </main>
    <footer>
      <DisclaimerBanner />
    </footer>
  </div>
</template>

<style scoped>
/* The page column from the Calm boards: up to 1344px, 16–48px side gutters, 28px between the nav and the page. */
.app-shell {
  max-width: 1344px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 48px) 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
</style>
