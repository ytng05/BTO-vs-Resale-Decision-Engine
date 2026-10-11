import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PlanView from '../views/PlanView.vue';
import ResultsView from '../views/ResultsView.vue';
import SourcesView from '../views/SourcesView.vue';
import LoginView from '../views/LoginView.vue';

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

// TODO (seat 4 + seat 3): guard routes that need a logged-in user (meta: { requiresAuth: true }).
export default router;
