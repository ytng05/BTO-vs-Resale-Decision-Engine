<script setup>
// The skip link and focus handling make the single-page app behave like separate pages for keyboard and
// screen-reader users: after an in-app navigation, focus moves to the new page's <h1> (or to <main> while the
// page is still loading), so the page name is read out and Tab starts from the content, not the nav.
import { nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppNavbar from './components/AppNavbar.vue';
import DisclaimerBanner from './components/DisclaimerBanner.vue';

const route = useRoute();
const main = ref(null);

function focusPage() {
  const target = main.value?.querySelector('h1') ?? main.value;
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

// Only a change of page counts: not the first load, and not a hash or query change on the same page.
watch(() => route.path, (to, from) => {
  if (from === undefined) return;
  nextTick(focusPage);
});
</script>

<template>
  <a class="skip-link" href="#main" data-cy="skip-link">Skip to main content</a>
  <div class="app-shell">
    <AppNavbar />
    <main id="main" ref="main" tabindex="-1">
      <router-view />
    </main>
    <footer data-cy="site-footer">
      <DisclaimerBanner />
    </footer>
  </div>
</template>

<style scoped>
/* Hidden until a keyboard user tabs to it: the first stop on every page. */
.skip-link {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1100;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 500;
  text-decoration: none;
  transform: translateY(-200%);
}
.skip-link:focus { transform: none; outline: 2px solid var(--focus-ring); outline-offset: 2px; }
/* Focus lands on <main> or the page's <h1> by script, not by the user: no ring for that. */
main:focus, main :deep(h1:focus) { outline: none; }

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
