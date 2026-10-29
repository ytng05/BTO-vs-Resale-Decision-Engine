// Journey 4 (docs/JOURNEYS.md): a returning user saves two scenarios and compares them side by side.
// Needs a database (the server's MONGODB_URI pointing at a TEST database) and #60 (compare mode on My scenarios).
import { J4A, J4B, beat, fillPlan } from './personas.js';

function save(name) {
  cy.get('[data-cy=results-save-button]').click();
  cy.get('[data-cy=results-save-name-input]').clear().type(name);
  cy.get('[data-cy=results-save-submit]').click();
  cy.get('[data-cy=results-save-success]').should('contain', name);
  beat();
}

describe('Journey 4: returning user compares two saved scenarios', () => {
  it('logs in, saves Sengkang and Tampines at one horizon, and compares them', () => {
    cy.request('POST', '/api/auth/register', {
      name: 'Journey 4', email: `journey4-${Date.now()}@example.com`, password: 'journey-password-123',
    }).then(({ body }) => {
      window.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: body.token, user: body.user }));
    });

    fillPlan(J4A);
    save('Sengkang, compared in 2040');
    fillPlan(J4B);
    save('Tampines, compared in 2040');

    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-list] li').should('have.length', 2);
    cy.get('[data-cy=scenarios-compare-mode-button]').click();
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(0).check();
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(1).check();
    beat();
    cy.get('[data-cy=compare-bar-compare-button]').click();

    cy.location('pathname').should('eq', '/scenarios/compare');
    // Same horizon and ruleset, so the page names which scenario ends ahead.
    cy.get('[data-cy=compare-headline-sentence]', { timeout: 60000 }).should('contain', 'ahead of Scenario');
    beat();
    cy.get('[data-cy=compare-open-results-button]').first().click();
    cy.location('pathname').should('eq', '/results');
  });
});
