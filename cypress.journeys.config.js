// Cypress config for the demo user journeys (docs/JOURNEYS.md): specs in cypress/journeys/, each recorded to
// cypress/videos/. Run against a LIVE build: VITE_USE_MOCK=false npm run build && npm start, then npm run journeys.
const { defineConfig } = require('cypress');
const base = require('./cypress.config.js');

module.exports = defineConfig({
  e2e: { ...base.e2e, specPattern: 'cypress/journeys/**/*.cy.js', video: true, viewportWidth: 1280, viewportHeight: 800 },
});
