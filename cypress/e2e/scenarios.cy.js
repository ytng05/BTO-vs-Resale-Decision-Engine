// Saved scenarios, end to end: register, save from Results, list, open, delete.
// Needs the server connected to MongoDB (CI: the throwaway mongo service; locally: MONGODB_URI).
import { completePlan, fillPath, next, seeResults } from './helpers/plan.js';

// Registers a new user through the real API and stores the token where stores/auth.js keeps it.
function registerFreshUser() {
  cy.request('POST', '/api/auth/register', {
    name: 'E2E tester',
    email: `e2e-${Date.now()}@example.com`,
    password: 'e2e-password-123',
  }).then(({ body }) => {
    window.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: body.token, user: body.user }));
  });
}

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
    // Saved: the same scenario cannot be saved again.
    cy.get('[data-cy=results-save-button]').should('not.exist');
    cy.get('[data-cy=results-update-button]').should('not.exist');

    // Listed, with the ruleset that produced it.
    cy.get('[data-cy=results-save-scenarios-link]').click();
    cy.location('pathname').should('eq', '/scenarios');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'E2E scenario').and('contain', 'Ruleset');

    // Open refills the plan and recalculates.
    cy.get('[data-cy=scenarios-open-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-4-panel]').should('be.visible');
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

    it('updates the same scenario after its inputs change, instead of saving a copy', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-name-input]').clear().type('First plan');
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'First plan');

    // Change the resale flat, then save again: it offers to update "First plan".
    cy.get('[data-cy=results-edit-button]').click();
    fillPath('pathb', { town: 'TAMPINES' });
    next();
    seeResults();
    cy.get('[data-cy=results-update-button]').should('contain', 'First plan').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'First plan');
    cy.get('[data-cy=results-update-button]').should('not.exist');

    cy.visit('/scenarios');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'First plan');
  });

  it('renames an automatically named scenario to the new towns on Update', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-submit]').click(); // keeps the suggested "Tampines BTO vs Bedok resale"
    cy.get('[data-cy=results-save-success]').should('contain', 'Tampines BTO vs Bedok resale');

    cy.get('[data-cy=results-edit-button]').click();
    fillPath('pathb', { town: 'TAMPINES' });
    next();
    seeResults();
    cy.get('[data-cy=results-update-button]').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'Tampines BTO vs Tampines resale');

    cy.visit('/scenarios');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'Tampines BTO vs Tampines resale');
  });

  it('offers each About you box its saved answers, and fills only that box', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('be.visible');

    cy.intercept('GET', '/api/scenarios/*').as('loadSaved');
    cy.visit('/plan');
    next();
    cy.wait('@loadSaved', { timeout: 30000 });
        cy.get('[data-cy=situation-buyer-1-age-input]').focus();
    cy.get('[data-cy=situation-autofill-option]').should('have.length', 1).and('have.text', '30').click();
    cy.get('[data-cy=situation-autofill]').should('not.exist');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '');

    // The other buyer's box offers the other buyer's age; typing a digit that doesn't match hides it.
    cy.get('[data-cy=situation-buyer-2-age-input]').focus();
    cy.get('[data-cy=situation-autofill-option]').should('have.text', '29');
    cy.get('[data-cy=situation-buyer-2-age-input]').type('4');
    cy.get('[data-cy=situation-autofill]').should('not.exist');
    cy.get('[data-cy=situation-buyer-2-age-input]').clear().type('2');
    cy.get('[data-cy=situation-autofill-option]').should('have.text', '29').click();
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');

    // Money boxes too, e.g. the first income.
    next();
    next();
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.value', '').focus();
    cy.get('[data-cy=situation-autofill-option]').should('have.text', 'S$5,000').click();
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.value', '5,000');
  });

  it('starts a fresh plan from the Plan link once the plan is saved, and offers the saved details', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('be.visible');

    // "Change inputs" keeps the saved plan to edit it.
    cy.get('[data-cy=results-edit-button]').first().click();
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'BEDOK');

    // The Plan link starts over: first step, empty ages, and the saved details on offer.
    cy.get('[data-cy=nav-plan-link]').click({ force: true });
    cy.location('search').should('eq', '');
    cy.get('[data-cy=wish-parents]').should('be.visible');
    next();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '').focus();
    cy.get('[data-cy=situation-autofill-option]', { timeout: 30000 }).should('have.text', '30').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
  });
});
