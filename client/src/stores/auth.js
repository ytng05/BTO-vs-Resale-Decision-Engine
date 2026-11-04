import { defineStore } from 'pinia';
import { login as apiLogin, register as apiRegister } from '../api/client.js';
import { useScenarioStore } from './scenario.js';

// Holds the logged-in user and JWT. Persisted to localStorage so a refresh (or closing the tab)
// does not sign the user out; router/index.js reads `isLoggedIn` to guard /plan and /results.
// See docs/API_CONTRACT.md "POST /api/auth/register, POST /api/auth/login" for the wire shape.
const STORAGE_KEY = 'hdb-app:auth';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    return { token: parsed.token ?? null, user: parsed.user ?? null };
  } catch {
    // Corrupt or inaccessible storage (private browsing, etc.): start logged out rather than crash.
    return { token: null, user: null };
  }
}

function writeStored(token, user) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only: a user who blocks storage can still use the app for this tab's lifetime.
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ ...readStored(), pending: false, error: null }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },
  actions: {
    async register({ name, email, password }) {
      this.pending = true;
      this.error = null;
      try {
        const { token, user } = await apiRegister({ name, email, password });
        this.token = token;
        this.user = user;
        writeStored(token, user);
        return true;
      } catch (err) {
        this.error = err.response?.data?.error?.message ?? 'Could not create an account. Try again.';
        return false;
      } finally {
        this.pending = false;
      }
    },
    async login({ email, password }) {
      this.pending = true;
      this.error = null;
      try {
        const { token, user } = await apiLogin({ email, password });
        this.token = token;
        this.user = user;
        writeStored(token, user);
        return true;
      } catch (err) {
        this.error = err.response?.data?.error?.message ?? 'Email or password is incorrect.';
        return false;
      } finally {
        this.pending = false;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      this.error = null;
      writeStored(null, null);
      // The next person on this device must not see this user's saved scenario or saved answers.
      useScenarioStore().forgetSaved();
    },
  },
});
