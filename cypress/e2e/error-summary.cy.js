// The plan's error summary on the longer steps (Your BTO, Resale flat): every problem on the step, each line only
// the action and a link to its field. The short About you screens have messages under each box instead.
import { fillSituation, next } from './helpers/plan.js';

describe('plan: error summary', () => {
  it('lists what is still needed on Your BTO, focuses the list, and each link moves to its field', () => {
    cy.visit('/plan');
    next(); // skip "what matters"
    fillSituation();
    next(); // to Your BTO
    next(); // nothing chosen yet
    cy.get('[data-cy=plan-step-errors]').should('be.visible').and('contain', 'answers still needed');
    cy.focused().should('have.attr', 'data-cy', 'plan-step-errors');
    cy.get('[data-cy=plan-error-town]').should('have.text', 'Choose a town.'); // the action only, no "Town:"
    cy.get('[data-cy=plan-error-town] a').click();
    cy.focused().should('have.attr', 'data-cy', 'patha-town-select');
  });
});
