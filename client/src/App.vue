<script setup>
import AppNavbar from './components/AppNavbar.vue';
import DisclaimerBanner from './components/DisclaimerBanner.vue';
</script>

<template>
  <AppNavbar />
  <main class="container py-4">
    <router-view />
  </main>
  <footer class="container pb-4">
    <DisclaimerBanner />
  </footer>
</template>
