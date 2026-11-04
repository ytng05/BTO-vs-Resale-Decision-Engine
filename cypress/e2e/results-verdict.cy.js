// Results page (redesign, 4 Nov 2026): the winner-first summary, "Would the answer change?", the trade-off, why one
// path comes out ahead, the grants, the two path cards (folded), the next step and the hover chart (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
import { completePlan, openPathCards } from './helpers/plan.js';

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

  it('shows a Back to top button after scrolling, and it returns to the top', () => {
    completePlan();
    cy.get('[data-cy=back-to-top]').should('not.exist');
    cy.scrollTo('bottom');
    cy.get('[data-cy=back-to-top]').should('be.visible').click();
    cy.window().its('scrollY').should('eq', 0);
    cy.get('[data-cy=back-to-top]').should('not.exist');
  });

  it('has no side-by-side table on Results (it lives on the Dashboard)', () => {
    completePlan();
    cy.get('[data-cy=results-verdict]').should('be.visible');
    cy.get('[data-cy=results-key-comparison]').should('not.exist');
  });

  it('explains each path in three plain lines, with the exact parts in "Full breakdown"', () => {
    completePlan();
    cy.get('[data-cy=results-paths]').should('not.have.attr', 'open'); // folded under "Why"
    openPathCards();
    ['results-patha', 'results-pathb'].forEach((p) => {
      cy.get(`[data-cy=${p}-summary-value]`).should('be.visible').and('contain', 'would be worth about');
      cy.get(`[data-cy=${p}-summary-owed]`).should('be.visible').and('contain', 'Taken off');
      cy.get(`[data-cy=${p}-summary-cash]`).should('be.visible').and('contain', 'in cash');
      cy.get(`[data-cy=${p}-grants-total]`).should('be.visible');
      cy.get(`[data-cy=${p}-full-breakdown]`).should('not.have.attr', 'open');
      cy.get(`[data-cy=${p}-full-breakdown] > summary`).click();
      cy.get(`[data-cy=${p}-full-breakdown]`).should('have.attr', 'open');
      cy.get(`[data-cy=${p}-breakdown]`).should('be.visible');
    });
  });

  it('opens the full breakdown from "Why" next to the grants', () => {
    completePlan();
    openPathCards();
    cy.get('[data-cy=results-patha-grants-why]').click();
    cy.get('[data-cy=results-patha-eligibility]').should('be.visible');
  });

  it('uses the team name, "net position", on the path cards', () => {
    completePlan();
    cy.get('[data-cy=results-patha-card]').should('contain', 'Net position').and('contain', 'what this path leaves you with, after costs');
  });

  it('says whether the answer would change, with the grid in small and the full grid one click away (D35, D40)', () => {
    completePlan();
    cy.get('[data-cy=results-robustness]').should('be.visible');
    cy.get('[data-cy=results-robustness-line]').invoke('text').should('match', /growth combinations? we tested/);
    cy.get('[data-cy=results-mini-grid] span').should('have.length', 36); // the mock grid is 6 by 6
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy=results-heatmap-open]').click();
    cy.get('[data-cy=results-section-heatmap]').should('have.attr', 'open');
    cy.focused().should('have.attr', 'id', 'heatmap-title');
  });

  it('shows the trade-off in three rows, the better side marked in words and with a tick, grants not a row (D1)', () => {
    completePlan();
    ['position', 'cash', 'keys'].forEach((id) => {
      cy.get(`[data-cy=results-tradeoff-${id}-bto]`).invoke('text').should('not.be.empty');
      cy.get(`[data-cy=results-tradeoff-${id}-resale]`).invoke('text').should('not.be.empty');
    });
    cy.get('[data-cy=results-tradeoff]').should('contain', '(better)').and('contain', '✓');
    cy.get('[data-cy=results-tradeoff-grants]').should('not.exist');
  });

  it('says why one path comes out ahead, line by line, adding up to the gap (D34)', () => {
    completePlan();
    cy.get('[data-cy=results-gap-card]').should('contain', 'comes out ahead');
    cy.get('[data-cy=results-why-sentence]').invoke('text').should('match', /mostly on the .+ in its favour\./);
    cy.get('[data-cy^=results-gap-line-]').should('have.length.greaterThan', 0).each(($li) => {
      cy.wrap($li).invoke('text').should('match', /Favours (BTO|resale)/);
    });
    cy.get('[data-cy=results-gap-total]').invoke('text').should('match', /ends S\$[\d,]+ ahead/);
  });

  it('lists the grants as already counted, never "not eligible" for the resale-only ones on a BTO', () => {
    completePlan();
    cy.get('[data-cy=results-grants]').should('contain', 'Already counted');
    cy.get('[data-cy=results-grants-bto]').should('not.contain', 'Family').and('not.contain', 'Proximity');
    cy.get('[data-cy=results-grants-why]').click();
    cy.get('[data-cy=results-paths]').should('have.attr', 'open');
    cy.focused().should('have.attr', 'id', 'path-details-title');
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

});
