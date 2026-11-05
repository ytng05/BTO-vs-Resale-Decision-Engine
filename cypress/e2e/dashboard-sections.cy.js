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
    ['dashboard-verdict', 'dashboard-cash-card', 'dashboard-side-by-side', 'dashboard-paid', 'dashboard-whatif'].forEach((hook) => {
      // Scroll first: the What-if panel is sticky, which Cypress treats like position: fixed and calls "not visible"
      // while it starts below the fold of the 1280x720 test window.
      cy.get(`[data-cy=${hook}]`).scrollIntoView().should('be.visible');
    });
    cy.get('[data-cy=dashboard-more-detail]').should('not.have.attr', 'open');
    ['overview', 'cashflow', 'grants', 'costs', 'rpi', 'map', 'size'].forEach((key) => {
      cy.get(`[data-cy=dashboard-section-${key}]`).should('not.have.attr', 'open');
    });
  });

  it('opens and closes a section from its header', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-more-detail] > summary').click();
    cy.get('[data-cy=dashboard-section-costs] summary').click();
    cy.get('[data-cy=dashboard-section-costs]').should('have.attr', 'open');
    cy.get('[data-cy=dashboard-costs]').should('be.visible');
    cy.get('[data-cy=dashboard-section-costs] summary').click();
    cy.get('[data-cy=dashboard-section-costs]').should('not.have.attr', 'open');
  });

  it('expands and collapses every section at once', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-more-detail] > summary').click();
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
      // The mock outcomes have no purchase price, so the card leaves out the price and fees lines (hasPrice guard);
      // the grants, CPF, loan and cash lines are always there.
      cy.get(`[data-cy=dashboard-paid-${p}]`).should('contain', 'Grants').and('contain', 'Housing loan').and('contain', 'Cash needed');
    });
    cy.get('[data-cy=dashboard-paid-sentence]').invoke('text').should('match', /cash up front/);
  });

  it('says what changed since your inputs once a slider moves', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Try a what-if');
    cy.get('[data-cy=whatif-price-growth-slider]').invoke('val', 5).trigger('input');
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Since your inputs: flat price growth 3% → 5% a year');
  });

  it('moves flat price growth with the quick picks and resets it to your input', () => {
    openDashboard();
    cy.get('[data-cy=whatif-price-growth-preset-5]').click().should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '5% / yr');
    cy.get('[data-cy=whatif-price-growth-reset]').click();
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '3% / yr');
    cy.get('[data-cy=whatif-price-growth-reset]').should('not.exist');
  });

  it('steps the application and comparison years one at a time', () => {
    openDashboard();
    cy.get('[data-cy=whatif-year-value]').invoke('text').then((year) => {
      cy.get('[data-cy=whatif-year-plus]').click();
      cy.get('[data-cy=whatif-year-value]').should('have.text', String(Number(year) + 1));
    });
  });

  it('the overview grants link opens the grants section', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-more-detail] > summary').click();
    cy.get('[data-cy=dashboard-section-overview] summary').click();
    cy.get('[data-cy=dashboard-grants-jump]').click();
    cy.get('[data-cy=dashboard-section-grants]').should('have.attr', 'open');
    cy.get('[data-cy=dashboard-section-grants-heading]').should('be.visible');
  });
});
