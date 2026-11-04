// The results teaser (/preview) between the last plan step and Results (mock data): the "simple" teaser, one panel
// that names a path only when it wins every pick with a winner (seat 1's rule, D43), a row per pick it has engine
// figures for, and "Edit your answers" for every answer with Change links.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { fillPath, fillSituation, next, pickWishes } from './helpers/plan.js';

function planWith(wishes, situation = {}) {
  cy.visit('/plan');
  pickWishes(wishes);
  next();
  fillSituation(situation);
  next();
  fillPath('patha');
  next();
  fillPath('pathb', { town: 'BEDOK', living: wishes.includes('parents') ? 'NONE' : undefined });
  next();
}

describe('results teaser', () => {
  it('names the path that wins every pick with a winner, a row per pick, and goes on to Results', () => {
    planWith(['moveby', 'cash', 'parents'], { moveInBy: new Date().getFullYear() + 3 });
    cy.location('pathname').should('eq', '/preview');
    // Mock keys: BTO in five years' time, resale next year; the move-in year is three years away. Mock cash is the
    // same on both paths, a tie, which doesn't count against resale.
    const y = new Date().getFullYear();
    cy.get('[data-cy=preview-verdict-title]').should('have.text', 'Resale fits you better');
    cy.get('[data-cy=preview-verdict-sub]').should('have.text', 'Ahead on 1 of your 2 priorities');
    cy.get('[data-cy=preview-card-moveby-detail]').should('contain', `Keys by your ${y + 3}`);
    cy.get('[data-cy=preview-card-moveby-mark]').should('have.class', 'verdict__mark--resale');
    cy.get('[data-cy=preview-card-cash-detail]').should('have.text', 'About the same');
    cy.get('[data-cy=preview-card-cash-mark]').should('have.class', 'verdict__mark--even');
    cy.get('[data-cy=preview-card-monthly]').should('not.exist'); // not picked
    // No line for the picks without a figure: the banner covers them (near my parents is in "grants").
    cy.get('[data-cy=preview-not-shown]').should('not.exist');
    cy.get('[data-cy=preview-cta-text]').should('have.text', 'Prices, grants and loans, side by side');

    cy.get('[data-cy=preview-see-results]').click();
    cy.location('pathname').should('eq', '/results');
  });

  it('checks the answers before Results even when no pick has figures to show, and Change goes back to that step', () => {
    planWith(['space', 'value']);
    cy.location('pathname').should('eq', '/preview');
    cy.get('[data-cy=preview]').should('contain', 'Check your answers');
    // Space is only on the Dashboard, so the banner says where it is.
    cy.get('[data-cy=preview-cta-text]').should('have.text', 'Prices, grants, loans and resale value side by side, and space on the Dashboard');
    cy.get('[data-cy=preview-verdict]').should('not.exist');
    cy.get('[data-cy=preview-review]').should('be.visible').and('not.contain', 'Details');
    cy.get('[data-cy=plan-review-step-4]').should('contain', 'Bedok');
    cy.get('[data-cy=plan-review-change-4]').click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=plan-step-4-panel]').should('exist');
  });

  it('says the paths come out about the same when every pick ties', () => {
    planWith(['monthly']); // mock loans are the same on both paths
    cy.get('[data-cy=preview-verdict-title]').should('have.text', 'BTO and resale come out about the same');
    cy.get('[data-cy=preview-verdict-sub]').should('not.exist');
    cy.get('[data-cy=preview-card-monthly]').should('contain', 'A smaller loan').and('contain', 'About the same');
  });

  it('opens every answer from "Edit your answers", and Change goes back to that step with the answers kept', () => {
    planWith(['monthly']);
    cy.get('[data-cy=preview-review]').should('not.have.attr', 'open');
    cy.get('[data-cy=preview-review] summary').should('have.text', 'Edit your answers').click();
    cy.get('[data-cy=plan-review-step-2]').should('contain', 'The other buyer');
    cy.get('[data-cy=plan-review-change-1]').click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=wish-monthly-input]').should('be.checked');
  });
});
