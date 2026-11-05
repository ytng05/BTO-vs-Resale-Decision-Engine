import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useScenarioStore } from './stores/scenario.js';
import './styles/main.scss';
import 'bootstrap'; // Bootstrap JS bundle (collapse, navbar toggler)

const pinia = createPinia();
const app = createApp(App).use(pinia);
// Refreshing keeps the plan in progress (this tab only; stores/planStorage.js).
useScenarioStore(pinia).keepInSession();
app.use(router).mount('#app');
