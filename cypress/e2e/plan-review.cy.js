// The plan's error summary (every problem on the step, each a link to its field) and "Check your answers"
// (everything entered, with Change links, between the last step and Results).
import { fillPath, fillSituation, next, seeResults } from './helpers/plan.js';

describe('plan: error summary and check your answers', () => {
  it('lists every problem on a step, focuses the list, and each link moves to its field', () => {
    cy.visit('/plan');
    next(); // skip "what matters"
    cy.get('[data-cy=situation-buyer-1-age-input]').type('30');
    next();
    cy.get('[data-cy=plan-step-errors]').should('be.visible').and('contain', 'problems to fix');
    cy.focused().should('have.attr', 'data-cy', 'plan-step-errors');
    cy.get('[data-cy="plan-error-applicants.1.age"]').should('contain', "Buyer 2's age");
    cy.get('[data-cy="plan-error-applicants.1.age"] a').click();
    cy.focused().should('have.attr', 'data-cy', 'situation-buyer-2-age-input');
  });

  it('shows the answers before Results, goes back to a step with Change, and on to Results', () => {
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    fillPath('patha');
    next();
    fillPath('pathb', { town: 'BEDOK' });
    cy.get('[data-cy=plan-step-next]').should('contain', 'Check your answers');
    next();
    cy.get('[data-cy=plan-review]').should('be.visible');
    cy.contains('h2', 'Check your answers').should('be.visible');
    cy.get('[data-cy=plan-review-step-2]').should('contain', 'S$5,000').and('contain', 'Singapore Citizen');
    cy.get('[data-cy=plan-review-step-4]').should('contain', 'Bedok').and('contain', '80 to 89 years');

    cy.get('[data-cy=plan-review-change-2]').click();
    cy.get('[data-cy=situation-buyer-1-income-input]').clear().type('6000');
    next();
    next();
    next();
    cy.get('[data-cy=plan-review-step-2]').should('contain', 'S$6,000');
    seeResults();
    cy.location('pathname').should('eq', '/results');
  });
});
