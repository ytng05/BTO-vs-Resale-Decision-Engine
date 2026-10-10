import { defineStore } from 'pinia';
import { login as apiLogin, register as apiRegister, getMe, tokenStore } from '../api/client.js';

// Who is logged in. The token itself lives in tokenStore (localStorage); this store holds the user.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // { id, email } when logged in
    ready: false, // true once restore() has checked any saved token
  }),
  getters: {
    isLoggedIn: (state) => state.user !== null,
  },
  actions: {
    async login(email, password) {
      const { token, user } = await apiLogin(email, password);
      tokenStore.set(token);
      this.user = user;
    },
    async register(email, password) {
      const { token, user } = await apiRegister(email, password);
      tokenStore.set(token);
      this.user = user;
    },
    logout() {
      tokenStore.clear();
      this.user = null;
    },
    // On page load: if a token was saved, ask the server whose it is. Expired or invalid tokens are dropped.
    async restore() {
      if (tokenStore.get()) {
        try {
          this.user = (await getMe()).user;
        } catch {
          this.logout();
        }
      }
      this.ready = true;
    },
  },
});
