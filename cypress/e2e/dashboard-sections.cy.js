// Dashboard detail sections (D35): they open and close; the cash-flow chart starts open, the rest closed.
// Mock data; same setup as dashboard.cy.js (`VITE_USE_MOCK=true npm run build`, `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

describe('dashboard sections', () => {
  it('starts with the cash-flow section open and the others closed', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-section-cashflow]').should('have.attr', 'open');
    ['grants', 'costs', 'rpi', 'map'].forEach((key) => {
      cy.get(`[data-cy=dashboard-section-${key}]`).should('not.have.attr', 'open');
    });
  });

  it('opens and closes a section from its header', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-section-costs] summary').click();
    cy.get('[data-cy=dashboard-section-costs]').should('have.attr', 'open');
    cy.get('[data-cy=dashboard-costs]').should('be.visible');
    cy.get('[data-cy=dashboard-section-costs] summary').click();
    cy.get('[data-cy=dashboard-section-costs]').should('not.have.attr', 'open');
  });

  it('expands and collapses every section at once', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-sections-toggle]').should('contain', 'Expand all').click();
    ['cashflow', 'grants', 'costs', 'rpi', 'map'].forEach((key) => {
      cy.get(`[data-cy=dashboard-section-${key}]`).should('have.attr', 'open');
    });
    cy.get('[data-cy=dashboard-sections-toggle]').should('contain', 'Collapse all').click();
    cy.get('[data-cy=dashboard-section-cashflow]').should('not.have.attr', 'open');
  });

  it('the overview grants link opens the grants section', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-grants-jump]').click();
    cy.get('[data-cy=dashboard-section-grants]').should('have.attr', 'open');
    cy.get('#grants-heading').should('be.visible');
  });
});
