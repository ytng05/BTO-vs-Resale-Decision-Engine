// Dashboard (version E): the summary at the top, and the detail sections under "More detail", all closed at first.
// Mock data; same setup as dashboard.cy.js (`VITE_USE_MOCK=true npm run build`, `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

describe('dashboard sections', () => {
  it('leads with the verdict, the cash card, side by side and how each purchase is paid; every section closed', () => {
    openDashboard();
    ['dashboard-verdict', 'dashboard-cash-card', 'dashboard-side-by-side', 'dashboard-paid', 'dashboard-whatif'].forEach((cy) => {
      cy.get(`[data-cy=${cy}]`).should('be.visible');
    });
    ['overview', 'cashflow', 'grants', 'costs', 'rpi', 'map', 'size'].forEach((key) => {
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
    ['overview', 'cashflow', 'grants', 'costs', 'rpi', 'map', 'size'].forEach((key) => {
      cy.get(`[data-cy=dashboard-section-${key}]`).should('have.attr', 'open');
    });
    cy.get('[data-cy=dashboard-sections-toggle]').should('contain', 'Collapse all').click();
    cy.get('[data-cy=dashboard-section-cashflow]').should('not.have.attr', 'open');
  });

  it('says in each side-by-side row which path it favours, never on grants (D1)', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-sbs-net]').invoke('text').should('match', /(BTO|Resale) ahead by S\$[\d,]+|About the same/);
    cy.get('[data-cy=dashboard-sbs-grants] .dash-chip--bto, [data-cy=dashboard-sbs-grants] .dash-chip--resale').should('not.exist');
  });

  it('opens why the leading path is ahead, from the gap breakdown', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-why-toggle]').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('[data-cy=dashboard-why]').should('be.visible').and('contain', 'Total gap');
    cy.get('[data-cy=dashboard-why] [data-cy^=dashboard-driver-]').should('have.length', 3);
  });

  it('shows how each purchase is paid, down to the cash needed', () => {
    openDashboard();
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-paid-${p}]`).should('contain', 'Price before grants').and('contain', 'Cash needed');
    });
    cy.get('[data-cy=dashboard-paid-sentence]').invoke('text').should('match', /cash up front/);
  });

  it('says what changed since your inputs once a slider moves', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Try a what-if');
    cy.get('[data-cy=whatif-price-growth-slider]').invoke('val', 5).trigger('input');
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'You changed: flat price growth 3% → 5% a year');
  });

  it('the overview grants link opens the grants section', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-section-overview] summary').click();
    cy.get('[data-cy=dashboard-grants-jump]').click();
    cy.get('[data-cy=dashboard-section-grants]').should('have.attr', 'open');
    cy.get('#grants-heading').should('be.visible');
  });
});
