// The two buyers on the 'About you' step (step 2, D38; mock data). The app models exactly two buyers, at least one a
// Singapore Citizen (D21), so both are always shown and there are no add/remove buttons.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { back, fillPath, fillSituation, next } from './helpers/plan.js';

const citizenship = (n) => cy.get(`[data-cy=situation-buyer-${n}-citizenship-select]`);
// The error message shown under one buyer's field (field: age, citizenship, income or cpf).
const fieldError = (n, field) => cy.get(`[data-cy=situation-buyer-${n}-${field}-error]`);

describe('buyers on the About you step', () => {
  beforeEach(() => {
    cy.visit('/plan');
    next(); // step 1 (what matters most) is optional
    // The form can take a moment to appear on a slow CI machine: wait longer for this one element only.
    cy.get('[data-cy=situation-buyer-2]', { timeout: 10000 }).should('exist');
  });

  it('always shows exactly two buyers, both Singapore Citizens by default, with no add or remove buttons', () => {
    cy.get('[data-cy^=situation-buyer-][data-cy$=-age-input]').should('have.length', 2);
    cy.get('[data-cy=situation-buyer-3]').should('not.exist');
    cy.get('[data-cy=situation-add-buyer-button]').should('not.exist');
    cy.get('[data-cy$=-remove-button]').should('not.exist');
    citizenship(1).should('have.value', 'SC');
    citizenship(2).should('have.value', 'SC');
  });

  it('blocks two Permanent Residents with a message, then lets the user continue once one is a citizen', () => {
    fillSituation();
    citizenship(1).select('PR');
    citizenship(2).select('PR');
    next();
    cy.get('[data-cy=situation-applicants-error]').should('contain', 'At least one buyer must be a Singapore Citizen.');
    cy.get('[data-cy=plan-step-3-panel]').should('not.exist'); // did not move on

    citizenship(1).select('SC');
    next();
    cy.get('[data-cy=plan-step-3-panel]').should('exist'); // moved on to Your BTO
  });

  it('accepts a citizen with a Permanent Resident', () => {
    fillSituation();
    citizenship(2).select('PR');
    next();
    cy.get('[data-cy=plan-step-3-panel]').should('exist');
  });

  it('checks each buyer separately and says which field is wrong', () => {
    fillSituation();
    cy.get('[data-cy=situation-buyer-2-age-input]').clear();           // buyer 2: age missing
    cy.get('[data-cy=situation-buyer-1-income-input]').clear().type('120000'); // buyer 1: a yearly figure
    next();

    cy.get('[data-cy=plan-step-errors]').should('be.visible');
    cy.get('[data-cy=plan-step-2-panel]').should('exist');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.class', 'is-invalid');
    fieldError(2, 'age').should('contain', 'Enter an age.');
    cy.get('[data-cy=situation-buyer-1-age-input]').should('not.have.class', 'is-invalid');
    cy.get('[data-cy=situation-buyer-1-income-input]').should('have.class', 'is-invalid');
    fieldError(1, 'income').should('contain', 'yearly figure');
    cy.get('[data-cy=situation-buyer-2-income-input]').should('not.have.class', 'is-invalid');
  });

  it('keeps both buyers’ answers when going back, including from Results', () => {
    fillSituation(); // buyer 1 is 30, buyer 2 is 29
    citizenship(2).select('PR');
    next();
    back();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');
    citizenship(2).should('have.value', 'PR');

    next();
    fillPath('patha');
    next();
    fillPath('pathb', { town: 'BEDOK' });
    next();
    cy.location('pathname').should('eq', '/results');

    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-4-panel]').should('exist'); // back on the resale step
    back();
    back();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');
    citizenship(2).should('have.value', 'PR');
  });

  it('shows a six-figure CPF balance in full on a phone', () => {
    cy.viewport(390, 844);
    cy.get('[data-cy=situation-buyer-1-cpf-input]').type('190000');
    // The text fits its box: nothing is scrolled out of view.
    cy.get('[data-cy=situation-buyer-1-cpf-input]').should(($el) => {
      expect($el[0].scrollWidth, 'text width').to.be.at.most($el[0].clientWidth);
    });
  });
});

