<script setup>
// UI.md §8 Navigation / top bar: sticky top bar, $bg-page background, border-subtle
// bottom border on scroll only, active nav item in $primary / inactive in $text-secondary
// (styled via .app-navbar in _components.scss). Keep data-cy attributes stable.
import { onMounted, onUnmounted, ref } from 'vue';

const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 0;
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <nav class="navbar navbar-expand-md app-navbar" :class="{ 'app-navbar--scrolled': scrolled }" data-cy="nav-bar">
    <div class="container">
      <router-link class="navbar-brand fw-semibold" to="/" data-cy="nav-brand-home">BTO vs resale</router-link>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
        data-cy="nav-toggler-toggle"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="mainNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item"><router-link class="nav-link" to="/plan" data-cy="nav-plan-link">Plan</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/sources" data-cy="nav-sources-link">Sources</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/login" data-cy="nav-login-link">Log in</router-link></li>
        </ul>
      </div>
    </div>
  </nav>
</template>
