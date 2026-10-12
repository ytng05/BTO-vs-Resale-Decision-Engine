// Saved scenarios, end to end: register, save from Results, list, open, delete.
// Needs the server connected to MongoDB (CI: the throwaway mongo service; locally: MONGODB_URI).
import { completePlan } from './helpers/plan.js';

describe('saved scenarios', () => {
  it('asks a logged-out user to log in, on Results and on My scenarios', () => {
    completePlan();
    cy.get('[data-cy=results-save-login-link]').should('be.visible');
    cy.get('[data-cy=results-save-button]').should('not.exist');

    cy.visit('/scenarios');
    cy.get('[data-cy=scenarios-logged-out]').should('be.visible');
  });

  it('saves a scenario from Results, lists it, opens it and deletes it', () => {
    // Register through the real API, not the login form: CI builds with VITE_USE_MOCK, where the form's
    // login is mocked but /api/scenarios is always real, so a mock token would get a 401. The token is
    // stored where stores/auth.js keeps it, and survives completePlan()'s cy.visit.
    cy.request('POST', '/api/auth/register', {
      name: 'E2E tester',
      email: `e2e-${Date.now()}@example.com`,
      password: 'e2e-password-123',
    }).then(({ body }) => {
      window.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: body.token, user: body.user }));
    });

    // Save, starting from the suggested name.
    completePlan();
    cy.get('[data-cy=nav-scenarios-link]').should('be.visible');
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-name-input]').should('have.value', 'Tampines BTO vs Bedok resale');
    cy.get('[data-cy=results-save-name-input]').clear();
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-form] .invalid-feedback').should('contain', 'Enter a name');
    cy.get('[data-cy=results-save-name-input]').type('E2E scenario');
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'E2E scenario');

    // Listed, with the ruleset that produced it.
    cy.get('[data-cy=results-save-scenarios-link]').click();
    cy.location('pathname').should('eq', '/scenarios');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'E2E scenario').and('contain', 'Ruleset');

    // Open refills the plan and recalculates.
    cy.get('[data-cy=scenarios-open-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-3-panel]').should('be.visible');
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'BEDOK');

    // Delete asks first; Keep leaves it.
    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-delete-button]').click();
    cy.get('[data-cy=scenarios-delete-cancel]').click();
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1);
    cy.get('[data-cy=scenarios-delete-button]').click();
    cy.get('[data-cy=scenarios-delete-confirm]').click();
    cy.get('[data-cy=scenarios-empty]').should('be.visible');
  });
});
