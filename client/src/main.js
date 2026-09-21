import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './styles/main.scss';
import 'bootstrap'; // Bootstrap JS bundle (collapse, navbar toggler)

createApp(App).use(createPinia()).use(router).mount('#app');
