//Dashboard overview: the net position bars and badges, ... the savings strip, the "At a glance" tiles, and the grants pop-up.
//Mock data; same setup as dashboard.cy.js (`VITE_USE_MOCK=true npm run build`, `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

describe('dashboard overview', () => {
  it('shows both net positions, how each purchase is paid, and a tile per comparison', () => {
    openDashboard();
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-summary-${p}-net]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=dashboard-paid-${p}-tags]`).should('contain', 'Keys');
    });
    // The path ahead in the comparison year is badged (unless it's too close to call).
    cy.get('[data-cy=dashboard-headline]').invoke('text').then((h) => {
        if (/better off/.test(h)) cy.get('[data-cy^=dashboard-badge-]').invoke('text').should('match', /Ahead in \d{4}|Comes out ahead/);
    });
    // Whether savings cover the cash is on Results (results-verdict.cy.js); here, the cash each purchase needs.
    cy.get('[data-cy=dashboard-paid-sentence]').invoke('text').should('match', /cash/i);
    cy.get('[data-cy=dashboard-side-by-side]').scrollIntoView().should('be.visible');
    // Each tile shows both paths' figures.
    cy.get('[data-cy^=dashboard-sbs-]').each(($tile) => {
      cy.wrap($tile).should('contain', 'BTO').and('contain', 'Resale');
    });
    // The last tile is when you get the keys: a month and year per path.
    cy.get('[data-cy^=dashboard-sbs-]').last().invoke('text').should('match', /[A-Z][a-z]{2} \d{4}/);
  });

  it('opens the grants table in a pop-up from its Explore card', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-explore-grants]').click({ scrollBehavior: 'center' });
    cy.location('pathname').should('eq', '/dashboard');
    cy.get('[data-cy=dashboard-section-grants]').should('be.visible');
    cy.get('#dash-modal-title').should('contain', 'Grants');
    cy.get('[data-cy=dashboard-grants]').should('exist');
  });
});
