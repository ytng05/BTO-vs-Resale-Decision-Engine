// Shared Cypress steps for filling in the plan stepper with valid input.
// Not a spec file (no .cy.js), so Cypress does not run it on its own.

export const nextYear = new Date().getFullYear() + 1;

export function fillSituation({ priceGrowth = '3', incomeGrowth = '2', horizon = '10' } = {}) {
  cy.get('[data-cy=situation-buyer-1-age-input]').type('30');
  cy.get('[data-cy=situation-buyer-1-income-input]').type('5000');
  cy.get('[data-cy=situation-buyer-1-cpf-input]').type('40000');
  cy.get('[data-cy=situation-cash-savings-input]').type('20000');
  cy.get('[data-cy=situation-monthly-savings-input]').type('1000');
  cy.get('[data-cy=situation-price-growth-input]').type(priceGrowth);
  cy.get('[data-cy=situation-income-growth-input]').type(incomeGrowth);
  cy.get('[data-cy=situation-horizon-input]').type(horizon);
}

export function fillPath(prefix, { town = 'TAMPINES', flatType = '4 ROOM' } = {}) {
  cy.get(`[data-cy=${prefix}-year-input]`).type(String(nextYear));
  cy.get(`[data-cy=${prefix}-town-select]`).select(town);
  cy.get(`[data-cy=${prefix}-flat-type-select]`).select(flatType);
}

// Fills all three steps and lands on /results.
export function completePlan(situation = {}) {
  cy.visit('/plan');
  fillSituation(situation);
  cy.get('[data-cy=plan-step-next]').click();
  fillPath('patha');
  cy.get('[data-cy=plan-step-next]').click();
  fillPath('pathb', { town: 'BEDOK' });
  cy.get('[data-cy=plan-step-next]').click();
  cy.location('pathname').should('eq', '/results');
}