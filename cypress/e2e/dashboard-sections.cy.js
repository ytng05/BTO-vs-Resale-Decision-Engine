// Dashboard layout: the answer as a compact card tinted in the leading path's colour, the savings strip,
// "At a glance" tiles, "Why … comes out ahead?" (closed until asked), how each purchase is paid, how each net position
// adds up, the heatmap (a square tries its rates in the What-if panel), and "Explore the detail" pop-ups.
// Mock data; same setup as dashboard.cy.js (`VITE_USE_MOCK=true npm run build`, `npm start`, `npm run test:e2e`).
import { completePlan } from './helpers/plan.js';

function openDashboard() {
  completePlan();
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

describe('dashboard sections', () => {
  it('leads with the answer, the cash strip, the tiles, how each purchase is paid and the What-if panel; no pop-up open', () => {
    openDashboard();
    ['dashboard-verdict', 'dashboard-cash-card', 'dashboard-side-by-side', 'dashboard-paid', 'dashboard-section-cashflow', 'dashboard-whatif'].forEach((hook) => {
      // Scroll first: the What-if panel is sticky, which Cypress treats like position: fixed and calls "not visible"
      // while it starts below the fold of the 1280x720 test window.
      cy.get(`[data-cy=${hook}]`).scrollIntoView().should('be.visible');
    });
    cy.get('[role=dialog]').should('not.exist');
  });

  it('opens a detail in a pop-up and closes it with the close button, Escape or a click outside', () => {
    openDashboard();
    // Close button: focus starts on it, and goes back to the card that opened the pop-up.
    cy.get('[data-cy=dashboard-explore-costs]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-section-costs]').should('be.visible').and('have.attr', 'aria-modal', 'true');
    cy.get('[data-cy=dashboard-costs], [data-cy=dashboard-costs-empty]').should('exist');
    cy.focused().should('have.attr', 'data-cy', 'dashboard-modal-close');
    // The page behind can't be reached with Tab while the pop-up is open.
    cy.get('.dash-e').should('have.attr', 'inert');
    cy.get('[data-cy=nav-bar]').should('have.attr', 'inert');
    cy.get('[data-cy=dashboard-modal-close]').click();
    cy.get('[role=dialog]').should('not.exist');
    cy.get('.dash-e').should('not.have.attr', 'inert');
    cy.get('[data-cy=nav-bar]').should('not.have.attr', 'inert');
    cy.focused().should('have.attr', 'data-cy', 'dashboard-explore-costs');
    // Escape
    cy.get('[data-cy=dashboard-explore-rpi]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-section-rpi]').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('[role=dialog]').should('not.exist');
    // Click on the dark backdrop, outside the box
    cy.get('[data-cy=dashboard-explore-size]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-section-size]').should('be.visible');
    cy.get('.dash-modal').click('topLeft');
    cy.get('[role=dialog]').should('not.exist');
  });

  it('says in each tile which path it favours, never on grants (D1)', () => {
    openDashboard();
    cy.get('[data-cy^=dashboard-sbs-]').should('have.length', 4);
    cy.get('[data-cy=dashboard-sbs-grants] .is-bto, [data-cy=dashboard-sbs-grants] .is-resale').should('not.exist');
  });

  it('keeps why the leading path is ahead closed until asked, then opens it from the gap breakdown', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-why]').should('not.exist');
    cy.get('[data-cy=dashboard-why-toggle]').should('have.attr', 'aria-expanded', 'false').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-why-toggle]').should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-cy=dashboard-why]').should('be.visible').and('contain', 'Total gap');
    cy.get('[data-cy=dashboard-why] [data-cy^=dashboard-driver-]').should('have.length.within', 1, 4);
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
    cy.get('[data-cy=whatif-price-growth-preset-5]').click({ scrollBehavior: 'center' }).should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '5% / yr');
    cy.get('[data-cy=whatif-price-growth-reset]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '3% / yr');
    cy.get('[data-cy=whatif-price-growth-reset]').should('not.exist');
  });

  it('applies a quick scenario chip in one click, and Reset goes back to the plan', () => {
    openDashboard();
    cy.get('[data-cy=whatif-preset-flat]').click({ scrollBehavior: 'center' }).should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '0% / yr');
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Since your inputs');
    cy.get('[data-cy=dashboard-whatif-reset]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=whatif-preset-flat]').should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '3% / yr');
  });

  it('steps the application and comparison years one at a time', () => {
    openDashboard();
    cy.get('[data-cy=whatif-year-value]').invoke('text').then((year) => {
      cy.get('[data-cy=whatif-year-plus]').click({ scrollBehavior: 'center' });
      cy.get('[data-cy=whatif-year-value]').should('have.text', String(Number(year) + 1));
    });
  });

  it('tints the answer card in the leading path\'s colour, and scrolls with the page', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-verdict]').should('not.have.css', 'position', 'sticky');
    cy.get('[data-cy=dashboard-headline]').invoke('text').then((h) => {
      const tone = /^BTO leaves/.test(h) ? 'bto' : /^Resale leaves/.test(h) ? 'resale' : 'none';
      cy.get('[data-cy=dashboard-verdict]').should('have.class', `dash-verdict-bar--${tone}`);
    });
  });

  it('tries a heatmap square in the What-if panel: both growth sliders move to it', () => {
    openDashboard();
    cy.get('[data-cy=dashboard-section-heatmap]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Try a what-if');
    cy.get('[data-cy=dashboard-section-heatmap] [data-cy=heatmap-button-r0-c0]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-updating]', { timeout: 10000 }).should('not.exist');
    cy.get('[data-cy=dashboard-since-inputs]').should('contain', 'Since your inputs');
  });

  it('undoes a quick scenario when its chip is clicked again, and says what it is trying', () => {
    openDashboard();
    cy.get('[data-cy=whatif-presets-status]').should('contain', 'Click it again to undo');
    cy.get('[data-cy=whatif-preset-boom]').click({ scrollBehavior: 'center' }).should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=whatif-presets-status]').should('contain', 'Trying flat prices +5% a year');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '5% / yr');
    cy.get('[data-cy=whatif-preset-boom]').click({ scrollBehavior: 'center' }).should('have.attr', 'aria-pressed', 'false');
    cy.get('[data-cy=whatif-price-growth-value]').should('contain', '3% / yr');
    cy.get('[data-cy=whatif-presets-status]').should('contain', 'Click it again to undo');
  });
});
