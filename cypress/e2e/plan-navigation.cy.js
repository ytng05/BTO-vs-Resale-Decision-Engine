// Moving between plan phases (user testing, 3 Nov 2026): Change in the answer summary opens that screen, "Back to your
// results" returns straight to the teaser, and the stepper links to every step reached so far.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { fillAges, fillPath, fillSituation, next, pickWishes } from './helpers/plan.js';

function toPreview() {
  cy.visit('/plan');
  pickWishes(['cash']);
  next();
  fillSituation();
  next();
  fillPath('patha');
  next();
  fillPath('pathb', { town: 'BEDOK' });
  next();
  cy.location('pathname').should('eq', '/preview');
}

describe('moving between plan phases', () => {
  it('opens the About you screen a Change is for, and goes straight back to the results from there', () => {
    toPreview();
    cy.get('[data-cy=preview-review] summary').click();
    cy.get('[data-cy=plan-review-change-2-incomes]').click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=about-part-incomes]').should('exist');
    cy.get('[data-cy=situation-buyer-1-income-input]').clear().type('6000');
    cy.get('[data-cy=plan-step-done]').should('contain', 'Back to your results').click();
    cy.location('pathname').should('eq', '/preview');
    cy.get('[data-cy=preview-review] summary').click();
    cy.get('[data-cy=plan-review-step-2]').should('contain', 'S$6,000');
  });

  it('checks the screen before going back to the results', () => {
    toPreview();
    cy.get('[data-cy=preview-review] summary').click();
    cy.get('[data-cy=plan-review-change-2-ages]').click();
    cy.get('[data-cy=situation-buyer-2-age-input]').clear();
    cy.get('[data-cy=plan-step-done]').click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.class', 'is-invalid').and('be.focused');
  });

  it('links the stepper to the steps reached so far, and to every step once the plan has reached the results', () => {
    cy.visit('/plan');
    next(); // What matters: skip
    fillAges();
    cy.get('[data-cy=stepper-go-1]').should('exist');
    cy.get('[data-cy=stepper-go-3]').should('not.exist'); // not reached yet
    cy.get('[data-cy=plan-step-done]').should('not.exist'); // the plan hasn't reached the results yet
    cy.get('[data-cy=stepper-go-1]').click();
    cy.get('[data-cy=plan-step-1-panel]').should('exist');

    toPreview();
    cy.get('[data-cy=preview-review] summary').click();
    cy.get('[data-cy=plan-review-change-1]').click();
    cy.get('[data-cy=stepper-go-4]').click(); // straight to Resale flat
    cy.get('[data-cy=plan-step-4-panel]').should('exist');
    cy.get('[data-cy=stepper-go-2]').click();
    cy.get('[data-cy=about-part-ages]').should('exist');
  });

  it("won't jump forward in the stepper from a screen with a problem", () => {
    toPreview();
    cy.get('[data-cy=preview-review] summary').click();
    cy.get('[data-cy=plan-review-change-2-ages]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').clear();
    cy.get('[data-cy=stepper-go-4]').click();
    cy.get('[data-cy=about-part-ages]').should('exist');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.class', 'is-invalid');
    cy.get('[data-cy=stepper-go-1]').click(); // back is always allowed
    cy.get('[data-cy=plan-step-1-panel]').should('exist');
  });
});
