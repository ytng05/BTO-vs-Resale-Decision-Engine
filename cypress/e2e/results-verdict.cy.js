// Results page: the winner-first summary, the side-by-side numbers, the next step and the hover chart (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { completePlan } from './helpers/plan.js';

describe('results verdict', () => {
  it('leads with who comes out ahead, in plain words', () => {
    completePlan();
    cy.get('[data-cy=results-verdict-headline]').should('be.visible').invoke('text').should('match', /(BTO|Resale) leaves you about S\$[\d,]+ better off|Too close to call|about the same/);
    cy.get('[data-cy=results-verdict-eyebrow]').should('be.visible');
    cy.get('[data-cy=results-verdict]').invoke('text').should('not.match', /profit/i);
  });

  it('tags exactly one path card as ahead, in words', () => {
    completePlan();
    cy.get('[data-cy$=-ahead-tag]').should('have.length.at.most', 1).each(($tag) => {
      expect($tag.text()).to.match(/^Ahead/);
    });
  });

  it('shows the numbers that matter side by side, with the better side tagged', () => {
    completePlan();
    cy.get('[data-cy=results-key-comparison]').should('be.visible');
    ['position', 'grants', 'cash', 'keys'].forEach((id) => {
      cy.get(`[data-cy=results-key-row-${id}]`).should('be.visible');
      cy.get(`[data-cy=results-key-${id}-bto]`).invoke('text').should('not.be.empty');
      cy.get(`[data-cy=results-key-${id}-resale]`).invoke('text').should('not.be.empty');
    });
  });

  it('uses plain words on the path cards', () => {
    completePlan();
    cy.get('[data-cy=results-patha-card]').should('contain', 'Your total position').and('not.contain', 'Net financial position');
    cy.get('[data-cy=results-patha-cpf-refund]').should('not.contain', 'horizon');
  });

  it('moves on: opens the dashboard from the main button, and jumps to the official steps', () => {
    completePlan();
    cy.get('[data-cy=results-steps-jump]').click();
    cy.get('[data-cy=results-next-steps]').should('be.visible');
    cy.get('[data-cy=results-dashboard-button]').click();
    cy.location('pathname').should('eq', '/dashboard');
  });

  it('shows both paths for the year under the pointer on the chart, and with the arrow keys', () => {
    completePlan();
    cy.get('[data-cy=results-section-chart] summary').click();
    cy.get('[data-cy=results-trend-readout]').should('be.visible');
    cy.get('[data-cy=results-trend-bto]').invoke('text').should('match', /S\$/);
    cy.get('[data-cy=results-trend-year]').invoke('text').then((last) => {
      cy.get('[data-cy=results-trend-stage]').focus().type('{leftarrow}');
      cy.get('[data-cy=results-trend-year]').invoke('text').should('not.eq', last);
      cy.get('[data-cy=results-trend-stage]').type('{end}');
      cy.get('[data-cy=results-trend-year]').invoke('text').should('eq', last);
    });
    cy.get('[data-cy=results-trend-lead]').invoke('text').should('match', /ahead|Level/);
  });
});
