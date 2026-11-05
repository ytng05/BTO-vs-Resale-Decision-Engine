// Dashboard overview (D35): the cash rings, the four tiles and the jump link to the grants table.
// Version E puts the overview under "More detail" (Cash, savings and keys), so each test opens it first.
// Mock data; same setup as dashboard.cy.js (`VITE_USE_MOCK=true npm run build`, `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
  cy.get('[data-cy=dashboard-more-detail] > summary').click();
  cy.get('[data-cy=dashboard-section-overview] summary').click();
}

describe('dashboard overview', () => {
  it('shows a cash ring per path and the four tiles', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-overview]').should('be.visible');
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-cash-cover-${p}]`).should('be.visible');
      cy.get(`[data-cy=dashboard-cash-cover-${p}-status]`).invoke('text')
        .should('match', /short|Covered|No cash needed|Add your cash savings|Not available/);
      cy.get(`[data-cy=dashboard-summary-${p}-grants]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=dashboard-summary-${p}-keys]`).invoke('text').should('match', /[A-Z][a-z]{2} \d{4}/);
    });
    ['savings', 'grants', 'housing-cash', 'keys'].forEach((tile) => {
      cy.get(`[data-cy=dashboard-tile-${tile}]`).should('be.visible');
    });
  });

  it('jumps from the grants tile to the grants table', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-grants-jump]').click();
    cy.location('pathname').should('eq', '/dashboard');
    cy.location('hash').should('eq', '#grants-heading');
    cy.get('[data-cy=dashboard-section-grants-heading]').should('be.visible');
    cy.get('[data-cy=dashboard-grants]').should('exist');
  });
});
