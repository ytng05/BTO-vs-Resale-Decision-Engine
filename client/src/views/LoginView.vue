<script setup>
// Log in / register. One view, toggled between the two modes, since they share the same fields
// (email, password) plus `name` on register. Wired to the auth store (stores/auth.js), which talks
// to POST /api/auth/login and /api/auth/register — see docs/API_CONTRACT.md for the draft shape.
// data-cy names follow docs/CONVENTIONS.md's examples (login-email-input, login-submit-button).
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const mode = ref('login'); // 'login' | 'register'
const name = ref('');
const email = ref('');
const password = ref('');
const attempted = ref(false);

const isRegister = computed(() => mode.value === 'register');

// Client-side checks only (filled in, email has an @, password length) — the server is the
// source of truth for "email already registered" / "email or password incorrect" (shown via
// auth.error after a failed submit, not here).
const fieldErrors = computed(() => {
  const errors = {};
  if (isRegister.value && !name.value.trim()) errors.name = 'Enter your name.';
  if (!email.value.trim()) errors.email = 'Enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = 'Enter a valid email.';
  if (!password.value) errors.password = 'Enter a password.';
  else if (isRegister.value && password.value.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
});
const isValid = computed(() => Object.keys(fieldErrors.value).length === 0);
const shownErrors = computed(() => (attempted.value ? fieldErrors.value : {}));

function switchMode(next) {
  mode.value = next;
  attempted.value = false;
  auth.error = null;
}

async function submit() {
  attempted.value = true;
  if (!isValid.value) return;

  const ok = isRegister.value
    ? await auth.register({ name: name.value.trim(), email: email.value.trim(), password: password.value })
    : await auth.login({ email: email.value.trim(), password: password.value });

  if (ok) {
    // Send the user back to whatever they were trying to reach (router guard sets ?redirect=).
    router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/plan');
  }
}
</script>

<template>
  <section class="col-12 col-md-6 col-lg-5 mx-auto" data-cy="login-view">
    <h1 class="h4" data-cy="login-title">{{ isRegister ? 'Create an account' : 'Log in' }}</h1>
    <p class="text-secondary small">
      An account lets you save and come back to a scenario. You can also
      <router-link to="/plan" data-cy="login-skip-link">plan without one</router-link> — it won't be saved.
    </p>

    <ul class="nav nav-tabs mb-3" data-cy="login-mode-toggle">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: !isRegister }"
          data-cy="login-mode-login-tab"
          @click="switchMode('login')"
        >
          Log in
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: isRegister }"
          data-cy="login-mode-register-tab"
          @click="switchMode('register')"
        >
          Register
        </button>
      </li>
    </ul>

    <form novalidate data-cy="login-form" @submit.prevent="submit">
      <div v-if="auth.error" class="alert alert-danger py-2" role="alert" data-cy="login-error">
        {{ auth.error }}
      </div>

      <div v-if="isRegister" class="mb-3">
        <label for="login-name" class="form-label">Name</label>
        <input
          id="login-name"
          v-model="name"
          type="text"
          autocomplete="name"
          class="form-control"
          :class="{ 'is-invalid': shownErrors.name }"
          :aria-invalid="shownErrors.name ? 'true' : null"
          data-cy="login-name-input"
        />
        <div class="invalid-feedback">{{ shownErrors.name }}</div>
      </div>

      <div class="mb-3">
        <label for="login-email" class="form-label">Email</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="email"
          class="form-control"
          :class="{ 'is-invalid': shownErrors.email }"
          :aria-invalid="shownErrors.email ? 'true' : null"
          data-cy="login-email-input"
        />
        <div class="invalid-feedback">{{ shownErrors.email }}</div>
      </div>

      <div class="mb-3">
        <label for="login-password" class="form-label">Password</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          class="form-control"
          :class="{ 'is-invalid': shownErrors.password }"
          :aria-invalid="shownErrors.password ? 'true' : null"
          :aria-describedby="isRegister ? 'login-password-help' : undefined"
          data-cy="login-password-input"
        />
        <div v-if="isRegister" id="login-password-help" class="form-text">At least 8 characters.</div>
        <div class="invalid-feedback">{{ shownErrors.password }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="auth.pending" data-cy="login-submit-button">
        <span v-if="auth.pending" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ isRegister ? 'Create account' : 'Log in' }}
      </button>
    </form>
  </section>
</template>
