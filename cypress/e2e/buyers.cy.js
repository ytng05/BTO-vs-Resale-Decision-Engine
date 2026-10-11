// Adding and removing a second buyer on the Situation step (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { fillSituation, fillPath } from './helpers/plan.js';

function fillBuyer2({ age = '32' } = {}) {
  cy.get('[data-cy=situation-buyer-2-age-input]').type(age);
  cy.get('[data-cy=situation-buyer-2-income-input]').type('4000');
  cy.get('[data-cy=situation-buyer-2-cpf-input]').type('30000');
}

describe('buyers on the Situation step', () => {
  beforeEach(() => cy.visit('/plan'));

  it('starts with one buyer who cannot be removed', () => {
    cy.get('[data-cy=situation-buyer-1]').should('exist');
    cy.get('[data-cy=situation-buyer-2]').should('not.exist');
    cy.get('[data-cy=situation-buyer-1-remove-button]').should('not.exist');
  });

  it('adds a second buyer, then hides the add button at the maximum of two', () => {
    cy.get('[data-cy=situation-add-buyer-button]').click();
    cy.get('[data-cy=situation-buyer-2]').should('be.visible');
    cy.get('[data-cy=situation-add-buyer-button]').should('not.exist');
    cy.get('[data-cy=situation-buyer-1-remove-button]').should('be.visible');
    cy.get('[data-cy=situation-buyer-2-remove-button]').should('be.visible');
  });

  it('validates the second buyer before moving on', () => {
    fillSituation();
    cy.get('[data-cy=situation-add-buyer-button]').click();
    cy.get('[data-cy=plan-step-next]').click();
    cy.get('[data-cy=plan-step-errors]').should('be.visible');
    cy.get('[data-cy=plan-step-1-panel]').should('exist'); // still on Situation
  });

  it('removing the second buyer brings back the add button', () => {
    cy.get('[data-cy=situation-add-buyer-button]').click();
    cy.get('[data-cy=situation-buyer-2-remove-button]').click();
    cy.get('[data-cy=situation-buyer-2]').should('not.exist');
    cy.get('[data-cy=situation-add-buyer-button]').should('be.visible');
    cy.get('[data-cy=situation-buyer-1-remove-button]').should('not.exist');
  });

  it('removing the first buyer keeps the second buyer’s answers', () => {
    fillSituation(); // buyer 1 is 30
    cy.get('[data-cy=situation-add-buyer-button]').click();
    fillBuyer2({ age: '45' });
    cy.get('[data-cy=situation-buyer-1-remove-button]').click();
    // The remaining buyer is now "Buyer 1" and still has buyer 2's answers.
    cy.get('[data-cy=situation-buyer-2]').should('not.exist');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '45');
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.value', '4000');
  });

  it('completes the plan with two buyers and keeps both after going back', () => {
    fillSituation();
    cy.get('[data-cy=situation-add-buyer-button]').click();
    fillBuyer2();
    cy.get('[data-cy=plan-step-next]').click();
    fillPath('patha');
    cy.get('[data-cy=plan-step-next]').click();
    fillPath('pathb', { town: 'BEDOK', leaseBand: '80-89' });
    cy.get('[data-cy=plan-step-next]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');

    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '32');
  });
});
