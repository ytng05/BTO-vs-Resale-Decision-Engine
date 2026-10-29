// ESLint (MIT) flat config. Catches real mistakes (unused variables, undefined names, Vue template
// errors) and leaves formatting alone: the team's code mixes semicolon styles on purpose by file.
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', 'client/dist/**', 'cypress/screenshots/**', 'cypress/videos/**'] },

  js.configs.recommended,
  ...vue.configs['flat/essential'],

  // Server, scripts and config files run in Node.
  {
    files: ['server/**/*.{js,mjs}', '*.config.js', 'client/vite.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
  // The Vue app runs in the browser.
  {
    files: ['client/src/**/*.{js,vue}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
  },
  // Unit tests (Vitest) run in Node.
  {
    files: ['**/tests/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
  // Cypress specs get Cypress's globals (cy, Cypress, describe, it, expect...).
  {
    files: ['cypress/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.mocha, cy: 'readonly', Cypress: 'readonly', expect: 'readonly' },
    },
  },
  // The Cypress configs are CommonJS (module.exports).
  { files: ['cypress.config.js', 'cypress.journeys.config.js'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },

  {
    rules: {
      // Unused function arguments are often kept for readability (e.g. Express's next): only flag variables.
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true, caughtErrors: 'none' }],
      // Single-word view names (HomeView aside) are fine in this app.
      'vue/multi-word-component-names': 'off',
    },
  },
];
