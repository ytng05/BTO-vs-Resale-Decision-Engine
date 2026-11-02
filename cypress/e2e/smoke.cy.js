// Smoke test. Needs: `VITE_USE_MOCK=true npm run build` then `npm start`, then `npm run test:e2e`.
// Selector convention: data-cy="<area>-<element>-<action>" (see docs/CONVENTIONS.md).

import { fillPath, fillSituation, next } from './helpers/plan.js';

describe('smoke', () => {
  it('loads the home page and shows the disclaimer', () => {
    cy.visit('/');
    cy.get('[data-cy=home-title]').should('be.visible');
    cy.get('[data-cy=disclaimer-banner]').should('be.visible');
  });

  it('shows the hero scene on the home page, with the point where the two paths cross', () => {
    cy.visit('/');
    cy.get('[data-cy=hero-scene]').should('be.visible').and('have.attr', 'aria-label');
    cy.get('[data-cy=hero-scene-meet]').should('exist');
  });

  it('blocks the stepper until the current step is valid', () => {
    cy.visit('/plan');
    next(); // step 1 (what matters most) is optional
    next();
    cy.get('[data-cy=plan-step-errors]').should('be.visible');
    cy.get('[data-cy=plan-step-2-panel]').should('exist'); // still on About you
  });

  it('walks through the stepper to the results page (mock data)', () => {
    cy.visit('/plan');
    next(); // what matters most -> about you
    fillSituation();
    next(); // about you -> your BTO
    fillPath('patha');
    next(); // your BTO -> resale flat
    fillPath('pathb');
    next(); // resale flat -> results
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy^=heatmap-cell-]').should('have.length.greaterThan', 0);
  });

  // Needs the server connected to a database
  // pointing at a TEST database, never the real one). The mock build's login form is mocked, so the
  // account registers and logs in through the real API, and the token is stored where stores/auth.js
  // keeps it (the same approach as scenarios.cy.js).
  it('register, log in, build both paths, save, reload', () => {
    const account = { name: 'Smoke tester', email: `smoke-${Date.now()}@example.com`, password: 'smoke-password-1' };
    cy.request('POST', '/api/auth/register', account).its('status').should('eq', 201);
    cy.request('POST', '/api/auth/login', { email: account.email, password: account.password })
      .its('body')
      .then(({ token, user }) => {
        window.localStorage.setItem('hdb-app:auth', JSON.stringify({ token, user }));
      });

    // Build both paths and save the result.
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    fillPath('patha');
    next();
    fillPath('pathb');
    next();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-name-input]').clear().type('Smoke scenario');
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'Smoke scenario');

    // Reload: still logged in, and the scenario is still saved.
    cy.reload();
    cy.get('[data-cy=nav-account-toggle]').should('contain', 'Smoke tester');
    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-list]').should('contain', 'Smoke scenario');
    cy.reload();
    cy.get('[data-cy=scenarios-list]').should('contain', 'Smoke scenario');

    // Opening it restores the same inputs.
    cy.get('[data-cy=scenarios-open-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-4-panel]').should('exist');
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'TAMPINES');
    cy.get('[data-cy=pathb-flat-type-4-room-input]').should('be.checked');
    cy.get('[data-cy=pathb-lease-band-80-89-input]').should('be.checked');
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');

    // Clean up, so local runs do not pile up scenarios.
    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-delete-button]').click();
    cy.get('[data-cy=scenarios-delete-confirm]').click();
    cy.get('[data-cy=scenarios-empty]').should('be.visible');
  });

});