import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PlanView from '../views/PlanView.vue';
import ResultsView from '../views/ResultsView.vue';
import SourcesView from '../views/SourcesView.vue';
import LoginView from '../views/LoginView.vue';
import { useAuthStore } from '../stores/auth.js';


const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/plan', name: 'plan', component: PlanView },
    { path: '/results', name: 'results', component: ResultsView },
    { path: '/dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/sources', name: 'sources', component: SourcesView },
    { path: '/login', name: 'login', component: LoginView },
  ],
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

export default router;
