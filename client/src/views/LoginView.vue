<script setup>
// Log in / create an account, in two steps inside one card: (1) "Log in", "Create account" or "Plan without an
// account" (which goes straight on), (2) the form for that choice: email and password to log in; name, email and
// password to create an account.
// Wired to the auth store (stores/auth.js), which talks to POST /api/auth/login and /api/auth/register
// (docs/API_CONTRACT.md). Home's "Start planning" comes here with ?redirect=/plan; after logging in the user goes there.
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// Which step to show first: the navbar's "Log in" link (/login?mode=login) goes straight to the log-in form;
// Home's "Start planning" shows the three choices.
function firstStep() {
  if (route.query.mode === 'login') {
    return 'login';
  }
  return 'choose';
}

const step = ref(firstStep()); // 'choose' | 'login' | 'register'

const name = ref('');
const email = ref('');
const password = ref('');
const attempted = ref(false);

// The three options: an icon, a short title, and the words in the bubble shown on hover or keyboard focus.
// Icons are Lucide's user-round, user-round-plus and arrow-right, inlined as path data like the rest of the app
// (no icon package): each entry is a list of SVG elements, [tag, attributes].
const choices = [
  {
    id: 'login',
    icon: [['circle', { cx: 12, cy: 8, r: 5 }], ['path', { d: 'M20 21a8 8 0 0 0-16 0' }]],
    title: 'Log in',
    hoverText: 'Log in to see your saved scenarios.',
  },
  {
    id: 'register',
    icon: [['path', { d: 'M2 21a8 8 0 0 1 13.292-6' }], ['circle', { cx: 10, cy: 8, r: 5 }], ['path', { d: 'M19 16v6' }], ['path', { d: 'M22 19h-6' }]],
    title: 'Create account',
    hoverText: 'Create a free account to save and compare your plans.',
  },
  {
    id: 'guest',
    icon: [['path', { d: 'M5 12h14' }], ['path', { d: 'm12 5 7 7-7 7' }]],
    title: 'Plan without an account',
    hoverText: "Your plan won't be saved. Try anyway!",
  },
];

// True when the user picked "Create account".
const isRegister = computed(function () {
  return step.value === 'register';
});

// Where to go afterwards: the ?redirect= in the address (Home sends /plan), else the plan.
// Only a path on this site is accepted (one "/" at the start), never "//other-site.com", so a link to this page
// can't send people to another website after they log in.
function getRedirect() {
  const target = route.query.redirect;
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    return target;
  }
  return '/plan';
}

// The words that change between "log in" and "create an account".
const formTitle = computed(function () {
  if (isRegister.value) {
    return 'Create your account';
  }
  return 'Welcome back';
});
const formIntro = computed(function () {
  if (isRegister.value) {
    return 'Just your name, email and a password.';
  }
  return 'Log in with your email and password.';
});
const submitLabel = computed(function () {
  if (auth.pending) {
    return 'Please wait…';
  }
  if (isRegister.value) {
    return 'Create account';
  }
  return 'Log in';
});
const passwordAutocomplete = computed(function () {
  if (isRegister.value) {
    return 'new-password';
  }
  return 'current-password';
});

// Already logged in: nothing to do here, go straight on.
onMounted(function () {
  if (auth.isLoggedIn) {
    router.replace(getRedirect());
  }
});

// Client-side checks only (filled in, email has an @, password length). The server is the source of truth for
// "email already registered" / "email or password incorrect", shown via auth.error after a failed submit.
const fieldErrors = computed(function () {
  const errors = {};
  if (isRegister.value && name.value.trim() === '') {
    errors.name = 'Enter your name.';
  }
  if (email.value.trim() === '') {
    errors.email = 'Enter your email.';
  } else if (!email.value.includes('@') || !email.value.includes('.')) {
    errors.email = 'Enter a valid email.';
  }
  if (password.value === '') {
    errors.password = 'Enter a password.';
  } else if (isRegister.value && password.value.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  return errors;
});

// Errors are only shown after the first "submit", not while the user is still typing.
const shownErrors = computed(function () {
  if (attempted.value) {
    return fieldErrors.value;
  }
  return {};
});

// True when a field's error is showing.
function hasError(field) {
  if (shownErrors.value[field]) {
    return true;
  }
  return false;
}

// Bootstrap's input style, plus the red border when the field has an error.
function inputClass(field) {
  if (hasError(field)) {
    return 'form-control is-invalid';
  }
  return 'form-control';
}

// For screen readers: the ids of the hint and the error under a field, so they are read out with the field.
function describedBy(field) {
  const ids = [];
  if (field === 'password' && isRegister.value) {
    ids.push('login-password-help');
  }
  if (hasError(field)) {
    ids.push('login-' + field + '-error');
  }
  if (ids.length === 0) {
    return null;
  }
  return ids.join(' ');
}

function choose(next) {
  // No account: straight on to wherever they were going, nothing to fill in.
  if (next === 'guest') {
    router.push(getRedirect());
    return;
  }
  step.value = next;
  attempted.value = false;
  auth.error = null;
}

async function submit() {
  attempted.value = true;
  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  let ok = false;
  try {
    if (isRegister.value) {
      ok = await auth.register({ name: name.value.trim(), email: email.value.trim(), password: password.value });
    } else {
      ok = await auth.login({ email: email.value.trim(), password: password.value });
    }
  } catch (err) {
    auth.error = 'Something went wrong. Please try again.';
  }

  if (ok) {
    router.push(getRedirect());
  }
}
</script>

<template>
  <section class="login-page" data-cy="login-view">
    <div class="card login-card">
      <div class="card-body">
        <!-- Progress bar: half full on the choices, full on the form -->
        <div class="progress-track">
          <div v-if="step === 'choose'" class="progress-fill progress-half"></div>
          <div v-else class="progress-fill progress-full"></div>
        </div>

        <!-- Step 1: choose how to continue -->
        <div v-if="step === 'choose'">
          <h1 class="h2 mb-2" data-cy="login-title">Before you start</h1>
                    <p class="text-secondary mb-2">An account lets you save your plans and come back to them.</p>
          <p class="text-secondary mb-4" data-cy="login-prepare">
            Four short steps. Have your incomes and CPF OA balances handy (estimates are fine), and a resale listing if you have one.
          </p>
          <p class="form-label">How would you like to continue?</p>

          <button
            v-for="c in choices"
            :key="c.id"
            type="button"
            class="choice"
            :data-cy="'login-choice-' + c.id"
            @click="choose(c.id)"
          >
            <span class="choice-icon" aria-hidden="true">
              <svg
                class="choice-svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <component :is="tag" v-for="([tag, attrs], i) in c.icon" :key="i" v-bind="attrs" />
              </svg>
            </span>
            <span class="choice-text">
              <span class="choice-title">{{ c.title }}</span>
              <!-- The bubble: part of the button, so screen readers always read it; shown on hover or keyboard focus -->
              <span class="choice-bubble" :data-cy="'login-bubble-' + c.id">{{ c.hoverText }}</span>
            </span>
          </button>
        </div>

        <!-- Step 2: the form for that choice -->
        <div v-else>
          <button type="button" class="btn btn-link p-0 mb-2" data-cy="login-back-button" @click="choose('choose')">← Back</button>
          <h1 class="h2 mb-2" data-cy="login-title">{{ formTitle }}</h1>
          <p class="text-secondary mb-4">{{ formIntro }}</p>

          <form novalidate data-cy="login-form" @submit.prevent="submit">
            <div v-if="auth.error" class="alert alert-danger py-2" role="alert" data-cy="login-error">{{ auth.error }}</div>

            <div v-if="isRegister" class="mb-3">
              <label for="login-name" class="form-label">Name</label>
              <input
                id="login-name"
                v-model="name"
                type="text"
                autocomplete="name"
                :class="inputClass('name')"
                :aria-invalid="hasError('name')"
                :aria-describedby="describedBy('name')"
                data-cy="login-name-input"
              />
              <div v-if="hasError('name')" id="login-name-error" class="invalid-feedback" data-cy="login-name-error">{{ shownErrors.name }}</div>
            </div>

            <div class="mb-3">
              <label for="login-email" class="form-label">Email</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                :class="inputClass('email')"
                :aria-invalid="hasError('email')"
                :aria-describedby="describedBy('email')"
                data-cy="login-email-input"
              />
              <div v-if="hasError('email')" id="login-email-error" class="invalid-feedback" data-cy="login-email-error">{{ shownErrors.email }}</div>
            </div>

            <div class="mb-3">
              <label for="login-password" class="form-label">Password</label>
              <input
                id="login-password"
                v-model="password"
                type="password"
                :autocomplete="passwordAutocomplete"
                :class="inputClass('password')"
                :aria-invalid="hasError('password')"
                :aria-describedby="describedBy('password')"
                data-cy="login-password-input"
              />
              <div v-if="isRegister" id="login-password-help" class="form-text">At least 8 characters.</div>
              <div v-if="hasError('password')" id="login-password-error" class="invalid-feedback" data-cy="login-password-error">{{ shownErrors.password }}</div>
            </div>

            <button type="submit" class="btn btn-primary w-100 mt-2" :disabled="auth.pending" data-cy="login-submit-button">
              {{ submitLabel }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Colours, spacing, corners and shadows all come from the design tokens (_tokens.scss, UI.md: no hex values). */

/* The card in the middle of the page */
.login-page {
  max-width: 40rem;
  margin: var(--space-6) auto;
}
.login-card .card-body {
  padding: var(--space-8) var(--space-6);
}

/* Progress bar at the top of the card */
.progress-track {
  width: 12rem;
  height: 4px;
  margin-bottom: var(--space-6);
  background: var(--border-subtle);
  border-radius: var(--radius-pill);
}
.progress-fill {
  height: 4px;
  background: var(--primary);
  border-radius: var(--radius-pill);
}
.progress-half { width: 50%; }
.progress-full { width: 100%; }

/* The three options: big rounded "bubbly" buttons */
.choice {
  position: relative; /* so the bubble can be placed next to it */
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-5) var(--space-3) var(--space-3);
  font-size: 1.125rem;
  font-weight: 500;
  text-align: left;
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.choice:hover {
  background: var(--accent-fill-3);
  border-color: var(--primary);
}
.choice:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* The round icon on the left of each option */
.choice-icon {
  flex-shrink: 0; /* keep it round when the title is long */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: var(--space-3);
  background: var(--accent-fill-3);
  border-radius: 50%;
  color: var(--text-primary);
}
.choice:hover .choice-icon,
.choice:focus-visible .choice-icon {
  background: var(--accent-fill-2);
}
/* The Lucide icon inside each round icon */
.choice-svg {
  flex: none;
}

/* The bubble: invisible at first, shown to the right of the option on hover or keyboard focus.
   It is made invisible with opacity (not display: none), so screen readers still read it. */
.choice-bubble {
  position: absolute;
  left: 104%;
  top: var(--space-2);
  width: 14rem;
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--on-primary);
  background: var(--primary);
  border-radius: var(--radius-md);
  opacity: 0;
  pointer-events: none;
}
.choice:hover .choice-bubble,
.choice:focus-visible .choice-bubble {
  opacity: 1;
}

/* Small screens: no room beside the card (and no mouse on phones), so show the words under the title instead */
@media (max-width: 1199px) {
  .choice {
    border-radius: var(--radius-lg);
  }
  .choice-title {
    display: block;
  }
  .choice-bubble {
    position: static;
    width: auto;
    padding: var(--space-1) 0 0 0;
    color: var(--text-secondary);
    background: none;
    opacity: 1;
  }
}
</style>
