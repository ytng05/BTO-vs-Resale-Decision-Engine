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
    { path: '/plan', name: 'plan', component: PlanView, meta: { requiresAuth: true } },
    { path: '/results', name: 'results', component: ResultsView, meta: { requiresAuth: true } },
    { path: '/sources', name: 'sources', component: SourcesView },
    { path: '/login', name: 'login', component: LoginView },
  ],
});

// Guards /plan and /results for a logged-in user. useAuthStore() is called here, inside the guard,
// not at module load: Pinia is only installed on the app (main.js) after this file is first
// imported, so calling it at the top of the file would run before an active Pinia instance exists.
router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true;
  const auth = useAuthStore();
  if (auth.isLoggedIn) return true;
  return { name: 'login', query: { redirect: to.fullPath } };
});

export default router;
