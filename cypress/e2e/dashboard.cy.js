// Financial dashboard (feature 2), mock data. Same setup as results.cy.js:
// `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan(); // the helper uses a 10-year holding period
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

describe('financial dashboard', () => {
  it('shows an empty state when opened without a plan', () => {
    cy.visit('/dashboard');
    cy.get('[data-cy=dashboard-empty]').should('be.visible');
    cy.get('[data-cy=dashboard-start-plan-button]').click();
    cy.location('pathname').should('eq', '/plan');
  });

  it('leads with who ends ahead and shows the ruleset version', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').invoke('text')
      .should('match', /(BTO|Resale) ends S\$[\d,]+ ahead after 10 years|Both paths end level/);
    cy.get('[data-cy=dashboard-ruleset-version]').should('contain', 'Ruleset');
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-summary-${p}-net]`).invoke('text').should('match', /S\$[\d,]+/);
    });
  });

  it('gives every grant check its own reason', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-grants] tbody tr[data-cy^=dashboard-grant-]').should('have.length.greaterThan', 0);
    cy.get('[data-cy=dashboard-grant-reason]').each(($li) => {
      cy.wrap($li).invoke('text').should('not.be.empty');
    });
    cy.get('[data-cy=dashboard-sources-link]').should('have.attr', 'href', '/sources');
  });

  it('draws the money in and out chart', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-cashflow] canvas').should('be.visible');
  });

  it('re-runs when a what-if slider moves, and resets to the plan', () => {
    openDashboard();
    cy.get('[data-cy=whatif-holding-slider]').invoke('val', 15).trigger('input');
    cy.get('[data-cy=whatif-holding-value]').should('contain', '15 years');
    cy.get('[data-cy=dashboard-headline]').should('contain', 'after 15 years');
    cy.get('[data-cy=dashboard-whatif-reset]').click();
    cy.get('[data-cy=dashboard-headline]').should('contain', 'after 10 years');
  });
});