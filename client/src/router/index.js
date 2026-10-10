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
    { path: '/sources', name: 'sources', component: SourcesView },
    { path: '/login', name: 'login', component: LoginView },
  ],
});

// Routes with meta: { requiresAuth: true } send logged-out users to /login, then back afterwards.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;
  const auth = useAuthStore();
  if (!auth.ready) await auth.restore();
  return auth.isLoggedIn ? true : { name: 'login', query: { redirect: to.fullPath } };
});

export default router;
