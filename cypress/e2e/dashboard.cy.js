// Financial dashboard (feature 2), mock data. Same setup as results.cy.js:
// `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { completePlan } from './helpers/plan.js';

// Opens one "Explore the detail" card; its detail shows in a pop-up (role="dialog").
function openDetail(key) {
  cy.get(`[data-cy=dashboard-explore-${key}]`).click({ scrollBehavior: 'center' });
  cy.get(`[data-cy=dashboard-section-${key}]`).should('be.visible');
}

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
    openDetail('grants');
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
    // The chart is always open (What-if analysis); the costs open from their Explore card.
    cy.get('[data-cy=dashboard-section-cashflow]').scrollIntoView();
    cy.get('[data-cy=dashboard-cashflow] canvas').should('be.visible');
    openDetail('costs');
    cy.get('[data-cy=dashboard-costs], [data-cy=dashboard-costs-empty]').should('exist');
  });

  it('puts the two flats side by side: size, price and price per m²', () => {
    openDashboard();
    openDetail('size');
    cy.get('[data-cy=dashboard-size-price]').should('be.visible');
    ['bto', 'resale'].forEach((p) => {
      cy.get(`[data-cy=dashboard-size-price-area-${p}]`).invoke('text').should('match', /\d+(\.\d)?(–\d+)? m²/);
      cy.get(`[data-cy=dashboard-size-price-price-${p}]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=dashboard-size-price-per-sqm-${p}]`).invoke('text').should('match', /S\$[\d,]+/);
    });
    cy.get('[data-cy=dashboard-size-price-lease-bto]').should('contain', '99 years');
  });

  it('re-runs when the comparison year moves, and resets to the plan', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').invoke('text').then((before) => {
      const startYear = before.match(/by (\d{4})/)[1];
      cy.get('[data-cy=whatif-horizon-value]').invoke('text').then((year) => {
        cy.get('[data-cy=whatif-horizon-plus]').click(); // "Compare in" is a stepper
        cy.get('[data-cy=whatif-horizon-value]').should('contain', String(Number(year) + 1));
        cy.get('[data-cy=dashboard-headline]').should('contain', `by ${Number(year) + 1}`);
        cy.get('[data-cy=dashboard-whatif-reset]').click();
        cy.get('[data-cy=dashboard-headline]').should('contain', `by ${startYear}`);
      });
    });
  });

  it('moves the BTO price within HDB\'s range for the launch (D26)', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-whatif-more] summary').click(); // housing-cost sliders sit under "More assumptions"
    cy.get('[data-cy=whatif-bto-price-value]').should('contain', 'S$540,500'); // the midpoint
    cy.get('[data-cy=whatif-bto-price-hint]').should('contain', 'MOCK Tampines Bliss');
    cy.get('[data-cy=whatif-bto-price-slider]').invoke('val', 600000).trigger('input');
    cy.get('[data-cy=whatif-bto-price-value]').should('contain', 'S$600,000');
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-whatif-reset]').click();
    cy.get('[data-cy=whatif-bto-price-value]').should('contain', 'S$540,500');
  });

  it('marks where the verdict flips on the BTO price slider, and says it in the hint (D40)', () => {
    openDashboard();
    // Mock: the flip is 80% of the way up MOCK Tampines Bliss's S$481,000 to S$600,000 range, at S$576,200.
    cy.get('[data-cy=whatif-bto-price-hint]')
      .should('contain', 'Estimated from MOCK Tampines Bliss')
      .and('contain', 'Starts at the middle')
      .and('contain', 'Above about S$576,000 (the mark), resale comes out ahead.');
    cy.get('[data-cy=whatif-bto-price-mark]').should('have.attr', 'aria-hidden', 'true')
      .invoke('attr', 'style').should('contain', '--at: 0.8');
  });

  it('moves the resale price around the median, which stays the valuation (D39)', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-whatif-more] summary').click(); // housing-cost sliders sit under "More assumptions"
    cy.get('[data-cy=whatif-resale-price-value]').should('contain', 'S$665,000');
    cy.get('[data-cy=whatif-resale-price-hint]').should('contain', 'Median of recent sales S$665,000');
    cy.get('[data-cy=whatif-resale-price-slider]').invoke('val', 700000).trigger('input');
    cy.get('[data-cy=whatif-resale-price-value]').should('contain', 'S$700,000');
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-update-error]').should('not.exist');
  });

  it('shows how many hidden assumptions have changed', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-whatif-more-count]').should('not.exist');
    cy.get('[data-cy=dashboard-whatif-more] summary').click();
    cy.get('[data-cy=whatif-rent-slider]').invoke('val', 1500).trigger('input');
    cy.get('[data-cy=dashboard-whatif-more] summary').click();
    cy.get('[data-cy=dashboard-whatif-more-count]').should('contain', '1 changed');
    cy.get('[data-cy=dashboard-whatif-reset]').click();
    cy.get('[data-cy=dashboard-whatif-more-count]').should('not.exist');
  });
});