const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // The Express server serves the built Vue app, so one port covers UI and API.
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    video: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
});

