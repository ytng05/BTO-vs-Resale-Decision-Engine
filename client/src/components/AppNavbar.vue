<script setup>
// The top navigation as three floating pills (design system Navbar, .pill-nav in _components.scss):
// logo + PropertyEngine name (left), links (centre), My scenarios or Log in (right).
// Keep data-cy attributes stable.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listScenarios } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const LINKS = [
  { to: '/', label: 'Home', cy: 'nav-home-link' },
  { to: '/plan', label: 'Plan', cy: 'nav-plan-link' },
  { to: '/results', label: 'Results', cy: 'nav-results-link' },
  { to: '/dashboard', label: 'Dashboard', cy: 'nav-dashboard-link' },
  { to: '/sources', label: 'Sources', cy: 'nav-sources-link' },
];

// "My scenarios · 2": the count of the user's saved scenarios, refreshed on each page change.
const scenarioCount = ref(null);
async function loadCount() {
  if (!auth.isLoggedIn) {
    scenarioCount.value = null;
    return;
  }
  try {
    const list = await listScenarios();
    scenarioCount.value = Array.isArray(list) ? list.length : (list?.scenarios?.length ?? null);
  } catch {
    scenarioCount.value = null;
  }
}
watch(() => [auth.isLoggedIn, route.fullPath], loadCount, { immediate: true });

const userName = computed(() => auth.user?.name || auth.user?.email || 'Account');

// The navbar stays at the top while you scroll, so share its height as --nav-height on <html>: the page uses it
// to stop in-page jumps (#links, scrollIntoView) landing under the bar, and sticky panels can sit below it.
const bar = ref(null);
let resize = null;
onMounted(() => {
  const set = () => document.documentElement.style.setProperty('--nav-height', `${bar.value?.offsetHeight ?? 80}px`);
  set();
  if (typeof ResizeObserver !== 'undefined' && bar.value) {
    resize = new ResizeObserver(set);
    resize.observe(bar.value);
  }
});
onBeforeUnmount(() => resize?.disconnect());

// The logo: on another page it goes home; on Home it brings you back to the top, like a refresh. (A real page reload
// would wipe the plan, which only lives in memory, so it isn't used.)
function goHome() {
  if (route.path === '/') {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
  } else {
    router.push('/');
  }
}

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <header ref="bar" class="pill-nav" data-cy="nav-bar">
    <!-- Logo + app name: one link back home. -->
    <a href="/" class="pill-nav__home" aria-label="PropertyEngine home" data-cy="nav-brand-home" @click.prevent="goHome">
      <span class="pill-nav__logo">
        <!-- An HDB block -->
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 21V5h12v16M4 5h16M10 2.5h4V5" />
          <path d="M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15M10.5 21v-3.5h3V21" />
        </svg>
      </span>
      <span class="pill-nav__brand" aria-hidden="true">Property<span>Engine</span></span>
    </a>

    <nav class="pill-nav__pill" aria-label="Main">
      <span class="pill-nav__links">
        <router-link v-for="l in LINKS" :key="l.to" :to="l.to" class="pill-nav__link" :data-cy="l.cy">{{ l.label }}</router-link>
      </span>

      <!-- Below md the links fold into a menu. -->
      <div class="dropdown">
        <button
          class="pill-nav__menu"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="Menu"
          data-cy="nav-toggler-toggle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li v-for="l in LINKS" :key="l.to"><router-link class="dropdown-item" :to="l.to">{{ l.label }}</router-link></li>
        </ul>
      </div>
    </nav>

    <router-link v-if="!auth.isLoggedIn" to="/login?mode=login" class="pill-nav__pill pill-nav__end" data-cy="nav-login-link">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
      <span class="pill-nav__end-label">Log in</span>
    </router-link>
    <span v-else class="pill-nav__pill pill-nav__account">
      <router-link to="/scenarios" class="pill-nav__end" data-cy="nav-scenarios-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </svg>
        <span class="pill-nav__end-label">My scenarios<template v-if="scenarioCount !== null"> · {{ scenarioCount }}</template></span>
      </router-link>
      <span class="dropdown">
        <button
          class="pill-nav__avatar"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          data-cy="nav-account-toggle"
        >
          <span aria-hidden="true">{{ userName.charAt(0).toUpperCase() }}</span>
          <span class="visually-hidden">{{ userName }}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-secondary">{{ userName }}</span></li>
          <li><button class="dropdown-item" type="button" data-cy="nav-logout-button" @click="logout">Log out</button></li>
        </ul>
      </span>
    </span>
  </header>
</template>

<style scoped>
/* Three slots: brand (left), links (centre, always in the middle), account (right).
   The bar is fixed to the top of the screen on every page and stays there as you scroll, full width, with a 1px line
   underneath. The page is pushed down by the bar's height (--nav-height, measured in the script) so nothing hides
   under it. */
.pill-nav {
  --nav-gutter: clamp(12px, 2.5vw, 40px);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  width: auto;
  max-width: none;
  margin: 0;
  padding-left: var(--nav-gutter);
  padding-right: var(--nav-gutter);
  /* the bar matches the page behind it: mist by default, white on Home and the Dashboard (they set --nav-surface) */
  background: var(--nav-surface, color-mix(in srgb, var(--bg-page) 92%, transparent));
  border: 0; /* no lines above or below the bar */
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.pill-nav > :first-child { justify-self: start; }
.pill-nav > :last-child { justify-self: end; }
/* Signed in: the My scenarios link and the account button share one pill. */
.pill-nav__account { padding: 6px; gap: 4px; }
.pill-nav__account .pill-nav__end { display: inline-flex; align-items: center; align-self: stretch; border-radius: 999px; }
.pill-nav__avatar {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--accent-fill-2, #fbd5e5);
  color: inherit;
  font-weight: 600;
  display: grid;
  place-items: center;
}
.pill-nav__avatar:hover { filter: brightness(0.97); }

/* ---- Logo + PropertyEngine name ---- */
.pill-nav__home {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-right: 8px;
  color: var(--text-primary);
  text-decoration: none;
}
.pill-nav__home .pill-nav__logo {
  flex: none;
  color: var(--on-primary);
  transition: background 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pill-nav__home:hover .pill-nav__logo { background: var(--color-berry); transform: rotate(-8deg) scale(1.06); }
.pill-nav__brand { font-weight: 700; font-size: 1.05rem; letter-spacing: -0.02em; white-space: nowrap; }
.pill-nav__brand span { color: var(--color-berry); }

/* Pink hover on the links, to match the boxes on the home page. */
.pill-nav__link { transition: background 0.2s ease, color 0.2s ease; }
.pill-nav__link:hover { background: var(--accent-tint); color: var(--color-berry); }

/* Tablet width, and very small phones: not enough room, so show just the logo. */
@media (min-width: 768px) and (max-width: 1000px), (max-width: 380px) {
  .pill-nav__brand { display: none; }
}

/* Phone landscape (short screens): let the bar scroll away so it doesn't cover a fifth of the page. */
@media (max-height: 500px) {
  .pill-nav { position: absolute; }
}

@media (prefers-reduced-motion: reduce) {
  .pill-nav__home .pill-nav__logo, .pill-nav__link { transition: none; }
  .pill-nav__home:hover .pill-nav__logo { transform: none; }
}
</style>

<style>
/* The navbar is fixed, so: the page starts below it, and in-page jumps (#links, scrollIntoView) stop below it
   instead of under it. --nav-height is set from the bar's real height in the script above. */
body { padding-top: var(--nav-height, 88px); }
html { scroll-padding-top: calc(var(--nav-height, 88px) + var(--space-3, 12px)); }
</style>