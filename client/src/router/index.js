import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PlanView from '../views/PlanView.vue';
import ResultsView from '../views/ResultsView.vue';
import SourcesView from '../views/SourcesView.vue';
import LoginView from '../views/LoginView.vue';

const router = createRouter({
  history: createWebHistory(),
  // meta.title names the page in the browser tab (afterEach below).
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'BTO or resale' } },
    { path: '/plan', name: 'plan', component: PlanView, meta: { title: 'Plan' } },
    { path: '/results', name: 'results', component: ResultsView, meta: { title: 'Results' } },
    // The results teaser between the last plan step and Results, for the picks it has figures for.
    { path: '/preview', name: 'preview', component: () => import('../views/PreviewView.vue'), meta: { title: 'Your priorities' } },
    { path: '/dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Dashboard' } },
    { path: '/sources', name: 'sources', component: SourcesView, meta: { title: 'Sources' } },
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Log in' } },
    // Logged-out visitors see a "Log in" prompt in the view itself (no guard: see the note below).
    { path: '/scenarios', name: 'scenarios', component: () => import('../views/ScenariosView.vue'), meta: { title: 'My scenarios' } },
    { path: '/scenarios/compare', name: 'scenario-compare', component: () => import('../views/ScenarioCompareView.vue'), meta: { title: 'Compare scenarios' } },
    // Anything else: a page that says so, with ways back (not a blank page).
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Page not found' } },
  ],
  // A new page starts at the top; Back returns to where you were; /sources#loans scrolls to its section.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    // Clear the fixed navbar (its height is set as --nav-height by AppNavbar.vue), plus a small gap.
    if (to.hash) {
      const nav = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10) || 88;
      return { el: to.hash, top: nav + 12 };
    }
    if (to.path !== from.path) return { top: 0, behavior: 'instant' };
    return false;
  },
});

// REVERTED (2026-10-11): a meta.requiresAuth guard on /plan and /results was added and then taken
// back out — it broke every Cypress spec (cypress/e2e/results.cy.js, smoke.cy.js), which visit /plan
// directly without logging in first. stores/auth.js and LoginView.vue are unaffected and still work;
// only the guard itself is reverted. To re-add it: restore `meta: { requiresAuth: true }` on the two
// routes above and the router.beforeEach() below, AND first add a Cypress helper (likely in
// cypress/e2e/helpers/plan.js) that logs a test user in — e.g. seeding `localStorage['hdb-app:auth']`
// directly — before visiting /plan or /results. Coordinate with whoever owns the Cypress specs (seat 5)
// before re-adding; there's already a pending, unimplemented test for this in smoke.cy.js
// ("register, log in, build both paths, save, reload").
//
// import { useAuthStore } from '../stores/auth.js';
// router.beforeEach((to) => {
//   if (!to.meta.requiresAuth) return true;
//   const auth = useAuthStore();
//   if (auth.isLoggedIn) return true;
//   return { name: 'login', query: { redirect: to.fullPath } };
// });

const SITE = 'BTO vs Resale';
router.afterEach((to) => {
  const page = to.meta.title;
  document.title = page && page !== 'BTO or resale' ? `${page} · ${SITE}` : SITE;
});


export default router;

