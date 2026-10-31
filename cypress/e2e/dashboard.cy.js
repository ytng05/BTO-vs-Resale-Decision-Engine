// Financial dashboard (feature 2), mock data. Same setup as results.cy.js:
// `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
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

  it('leads with who ends ahead in which year, and shows the ruleset version', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').invoke('text')
      .should('match', /(BTO|Resale) ends S\$[\d,]+ ahead by \d{4}|Both paths end level by \d{4}/);
    cy.get('[data-cy=dashboard-ruleset-version]').should('contain', 'Ruleset');
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-summary-${p}-net]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=dashboard-summary-${p}-affordability]`).invoke('text')
        .should('match', /Within your loan limit|Loan short by S\$[\d,]+/);
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

  it('explains each warning in a sentence, not as a code', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-warnings]').should('contain', 'usual BTO wait').and('not.contain', 'BTO_WAIT_ASSUMED');
  });

  it('draws how the net position adds up, and lists the costs', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-cashflow] canvas').should('be.visible');
    cy.get('[data-cy=dashboard-costs], [data-cy=dashboard-costs-empty]').should('exist');
  });

  it('re-runs when the comparison year moves, and resets to the plan', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').invoke('text').then((before) => {
      const startYear = before.match(/by (\d{4})/)[1];
      cy.get('[data-cy=whatif-horizon-slider]').invoke('attr', 'max').then((max) => {
        cy.get('[data-cy=whatif-horizon-slider]').invoke('val', max).trigger('input');
        cy.get('[data-cy=whatif-horizon-value]').should('contain', max);
        cy.get('[data-cy=dashboard-headline]').should('contain', `by ${max}`);
        cy.get('[data-cy=dashboard-whatif-reset]').click();
        cy.get('[data-cy=dashboard-headline]').should('contain', `by ${startYear}`);
      });
    });
  });
});