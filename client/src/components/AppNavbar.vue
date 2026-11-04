<script setup>
// The top navigation as two floating pills (design system Navbar, .pill-nav in _components.scss):
// logo + links (centre), My scenarios or Log in (right). Keep data-cy attributes stable.
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listScenarios } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const LINKS = [
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

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <header class="pill-nav" data-cy="nav-bar">
    <nav class="pill-nav__pill" aria-label="Main">
      <router-link to="/" class="pill-nav__logo" aria-label="BTO vs resale home" data-cy="nav-brand-home">
        <!-- An HDB block -->
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 21V5h12v16M4 5h16M10 2.5h4V5" />
          <path d="M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15M10.5 21v-3.5h3V21" />
        </svg>
      </router-link>
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
/* Keeps the centre pill centred when there is no freshness line to show. */
.pill-nav__spacer { flex: 0 1 0; }
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
</style>
