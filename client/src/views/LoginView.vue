<script setup>
// Log in / create an account, in two steps inside one card: (1) "I have an account", "I'm new here" or "Plan without
// an account" (which goes straight on), (2) the form for that choice: email and password to log in; name, email and
// password to create an account.
// Wired to the auth store (stores/auth.js), which talks to POST /api/auth/login and /api/auth/register
// (docs/API_CONTRACT.md). Home's "Start planning" comes here with ?redirect=/plan; after logging in the user goes there.
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();


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

const choices = [
  { id: 'login', icon: '/icons/login.png', title: 'Log in', hoverText: 'Log in to see your saved scenarios.' },
  { id: 'register', icon: '/icons/createaccount.png', title: 'Create account', hoverText: 'Create a free account to save and compare your plans.' },
  { id: 'guest', icon: '/icons/arrow.png', title: 'Plan without an account', hoverText: "Your plan won't be saved. Try anyway!" },
];

// True when the user picked "I'm new here".
const isRegister = computed(function () {
  return step.value === 'register';
});

// Where to go afterwards: the ?redirect= in the address (Home sends /plan), else the plan.
function getRedirect() {
  if (typeof route.query.redirect === 'string') {
    return route.query.redirect;
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
    <div class="login-card">
      <!-- Progress bar: half full on the choices, full on the form -->
      <div class="progress-track">
        <div v-if="step === 'choose'" class="progress-fill progress-half"></div>
        <div v-else class="progress-fill progress-full"></div>
      </div>

      <!-- Step 1: choose how to continue -->
      <div v-if="step === 'choose'">
        <h1 class="login-title" data-cy="login-title">Before you start</h1>
        <p class="login-intro">An account lets you save your plans and come back to them.</p>
        <p class="login-question">How would you like to continue?</p>

        <button
          v-for="c in choices"
          :key="c.id"
          type="button"
          class="choice"
          :data-cy="'login-choice-' + c.id"
          @click="choose(c.id)"
        >
          <span class="choice-icon">
            <img :src="c.icon" alt="" :class="'choice-image choice-image-' + c.id" />
          </span>
          <span class="choice-text">
            <span class="choice-title">{{ c.title }}</span>
            <!-- The pop-up bubble: appears when the mouse is over the option (see the CSS below) -->
            <span class="choice-bubble" :data-cy="'login-bubble-' + c.id">{{ c.hoverText }}</span>
          </span>
        </button>
      </div>

      <!-- Step 2: the form for that choice -->
      <div v-else>
        <button type="button" class="back-link" data-cy="login-back-button" @click="choose('choose')">← Back</button>
        <h1 class="login-title" data-cy="login-title">{{ formTitle }}</h1>
        <p class="login-intro">{{ formIntro }}</p>

        <form novalidate data-cy="login-form" @submit.prevent="submit">
          <p v-if="auth.error" class="error-box" role="alert" data-cy="login-error">{{ auth.error }}</p>

          <div v-if="isRegister" class="field">
            <label for="login-name">Name</label>
            <input id="login-name" v-model="name" type="text" autocomplete="name" class="text-input" data-cy="login-name-input" />
            <p v-if="shownErrors.name" class="error-text" data-cy="login-name-error">{{ shownErrors.name }}</p>
          </div>

          <div class="field">
            <label for="login-email">Email</label>
            <input id="login-email" v-model="email" type="email" autocomplete="email" class="text-input" data-cy="login-email-input" />
            <p v-if="shownErrors.email" class="error-text" data-cy="login-email-error">{{ shownErrors.email }}</p>
          </div>

          <div class="field">
            <label for="login-password">Password</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              :autocomplete="passwordAutocomplete"
              class="text-input"
              data-cy="login-password-input"
            />
            <p v-if="isRegister" class="hint-text">At least 8 characters.</p>
            <p v-if="shownErrors.password" class="error-text" data-cy="login-password-error">{{ shownErrors.password }}</p>
          </div>

          <button type="submit" class="submit-button" :disabled="auth.pending" data-cy="login-submit-button">
            {{ submitLabel }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The white card in the middle of the page */
.login-page {
  max-width: 640px;
  margin: 24px auto;
}
.login-card {
  padding: 48px 40px;
  background: #ffffff;
  border-radius: 28px;
  box-shadow: 0 8px 24px rgba(60, 64, 90, 0.08);
}

/* Progress bar at the top of the card */
.progress-track {
  width: 190px;
  height: 4px;
  margin-bottom: 24px;
  background: #ecedf2;
  border-radius: 999px;
}
.progress-fill {
  height: 4px;
  background: #1d1d24;
  border-radius: 999px;
}
.progress-half { width: 50%; }
.progress-full { width: 100%; }

/* Text */
.login-title {
  font-size: 32px;
  font-weight: 500;
  margin-bottom: 8px;
}
.login-intro {
  color: #5f6373;
  margin-bottom: 24px;
}
.login-question {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

/* The three options: big rounded "bubbly" buttons */
.choice {
  position: relative; /* so the pop-up bubble can be placed next to it */
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
  padding: 12px 20px 12px 12px;
  font-size: 18px;
  font-weight: 500;
  text-align: left;
  color: #1d1d24;
  background: #ffffff;
  border: 1.5px solid #dfe2ea;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(60, 64, 90, 0.08);
  cursor: pointer;
}
.choice:hover {
  background: #e9ecf6;
  border-color: #1d1d24;
}

/* The round icon on the left of each option */
.choice-icon {
  flex-shrink: 0; /* keep it round when the title is long */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: 12px;
  font-size: 20px;
  background: #e9ecf6;
  border-radius: 50%;
  overflow: hidden; /* trim the picture to the round bubble */
}
.choice:hover .choice-icon {
  background: #fbd5e5;
}
/* The picture inside each round icon */
.choice-image {
  width: 26px;
  height: 26px;
}
/* The log-in picture has its own circle with empty space around it: show it bigger, so that circle
   lines up with the edge of the round bubble (the circle is about 73% of the picture: 60px x 0.73 ≈ 44px). */
.choice-image-login {
  width: 60px;
  height: 60px;
}

.choice-image-register,
.choice-image-guest {
  width: 34px;
  height: 34px;
}

.choice-image-register {
  position: relative;
  left: 2px;
  top: -1px;
}


/* The pop-up bubble: hidden at first, shown to the right of the option when the mouse is over it */
.choice-bubble {
  display: none;
  position: absolute;
  left: 104%;
  top: 8px;
  width: 220px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 400;
  color: #ffffff;
  background: #1d1d24;
  border-radius: 16px;
}
.choice:hover .choice-bubble {
  display: block;
}

/* Small screens: no room beside the card (and no mouse on phones), so show the words under the title instead */
@media (max-width: 1199px) {
  .choice {
    border-radius: 28px;
  }
  .choice-title {
    display: block;
  }
  .choice-bubble {
    display: block;
    position: static;
    width: auto;
    padding: 2px 0 0 0;
    color: #5f6373;
    background: none;
  }
}

/* Step 2: the form */
.back-link {
  margin-bottom: 8px;
  padding: 0;
  color: #1d1d24;
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;
}
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 500;
}
.text-input {
  width: 100%;
  padding: 10px 16px;
  font-size: 16px;
  border: 1.5px solid #dfe2ea;
  border-radius: 999px;
}
.hint-text {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #5f6373;
}
.error-text {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #b3372c;
}
.error-box {
  padding: 8px 16px;
  color: #b3372c;
  background: #fae6e3;
  border-radius: 16px;
}
.submit-button {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  background: #1d1d24;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}
.submit-button:disabled {
  opacity: 0.5;
}
</style>
