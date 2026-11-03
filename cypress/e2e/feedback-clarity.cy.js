// Clarity fixes from user testing (2 Nov): plain words for net position, each path's figure shown adding up,
// the prices used as figures, how to read the heatmap, the BTO price on the plan, and the asking-price info.
import { completePlan, fillPath, fillSituation, next } from './helpers/plan.js';

const cents = (text) => Math.round(Number(text.replace(/[^\d.]/g, '')) * 100);

describe('clarity', () => {
  it("shows each path's net position adding up from its parts", () => {
    completePlan();
    ['results-patha', 'results-pathb'].forEach((p) => {
      cy.get(`[data-cy=${p}-card]`).should('contain', 'what this path leaves you with, after costs');
      cy.get(`[data-cy=${p}-breakdown] > div`).then(($rows) => {
        const rows = [...$rows].map((r) => r.querySelector('dd').textContent.trim());
        const total = cents(rows.pop());
        const parts = rows.map((t) => (t.startsWith('−') ? -cents(t) : cents(t)));
        expect(parts.reduce((a, b) => a + b, 0), `${p} parts add up to net position`).to.eq(total);
      });
      cy.get(`[data-cy=${p}-net-position]`).invoke('text').then((t) => {
        cy.get(`[data-cy=${p}-breakdown] > div:last-child dd`).should('have.text', t.trim());
      });
    });
  });

  it('shows the prices used as figures, explains the heatmap, and names the dashboard button plainly', () => {
    completePlan();
    cy.get('[data-cy=results-price-bto]').invoke('text').should('match', /^S\$[\d,]+$/);
    cy.get('[data-cy=results-price-resale]').invoke('text').should('match', /^S\$[\d,]+$/);
    cy.get('[data-cy=results-heatmap-guide] li').should('have.length', 3);
    cy.get('[data-cy=results-dashboard-button]').should('have.text', 'Open the dashboard');
  });

  it('shows the BTO price on the plan, and says what a blank asking price means', () => {
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    fillPath('patha');
    // The figure the comparison uses, in the launch card (the summary card under the illustration was removed with
    // the Calm "Your BTO" layout, so the price is no longer shown twice).
    cy.get('[data-cy=patha-price-estimate]').should('be.visible').invoke('text').should('match', /^S\$[\d,]+$/);
    next();
    // The asking price explains itself in one line under the box (the (i) was dropped: one pattern per field).
    cy.get('[data-cy=pathb-asking-price-help]').should('be.visible').and('contain', 'Leave blank to use recent sales');
  });
});
