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

  it('names a path as ahead only when the headline does: one tag and label when not close, none when close (D42)', () => {
    completePlan();
    cy.get('[data-cy=results-verdict-headline]').invoke('text').then((headline) => {
      const close = /^Too close to call|about the same/.test(headline);
      cy.get('[data-cy$=-ahead-tag]').should('have.length', close ? 0 : 1);
      cy.get('[data-cy=results-verdict-eyebrow]').should(close ? 'contain' : 'not.contain', 'Too close to call');
      if (!close) cy.get('[data-cy=results-verdict-eyebrow]').should('contain', 'comes out ahead');
      cy.get('[data-cy$=-ahead-tag]').each(($tag) => expect($tag.text()).to.match(/^Ahead/));
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

  it('uses the team name, "net position", in the table and on the path cards', () => {
    completePlan();
    cy.get('[data-cy=results-key-row-position]').should('contain', 'Net position');
    cy.get('[data-cy=results-patha-card]').should('contain', 'Net position').and('contain', 'what this path leaves you with, after costs');
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

  it('draws both net positions as bars with their figures, and says the difference in words', () => {
    completePlan();
    cy.get('[data-cy=results-verdict-bars]').should('be.visible').and('contain', 'Bars start at S$0');
    ['bto', 'resale'].forEach((k) => {
      cy.get(`[data-cy=results-verdict-bar-${k}]`).invoke('text').should('match', /S\$[\d,]+/);
    });
    cy.get('[data-cy=results-verdict-diff]').invoke('text').should('match', /^Difference: /);
  });

  it('says the gap is small, instead of who is ahead, when too close to call (D42)', () => {
    completePlan();
    // The wording of the reason line is covered by the unit tests; here only the close case, which has one fixed line.
    cy.get('[data-cy=results-verdict-headline]').invoke('text').then((headline) => {
      if (/^Too close to call|about the same/.test(headline)) {
        cy.get('[data-cy=results-verdict-reason]').invoke('text').should('match', /small enough|about the same place/);
      }
    });
  });

  it('adds a Difference column to the side-by-side table, in words', () => {
    completePlan();
    ['position', 'grants', 'cash', 'keys'].forEach((id) => {
      cy.get(`[data-cy=results-key-${id}-diff]`).invoke('text').should('match', /more with|less with|sooner with|Same for both/);
    });
  });
});
