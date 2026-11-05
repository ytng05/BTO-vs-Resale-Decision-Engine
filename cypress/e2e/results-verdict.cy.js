// Results page (redesign, 4 Nov 2026): the winner-first summary, "Would the answer change?", the trade-off, the two
// path cards in plain words, the next step and the hover chart (mock data). Why one path ends ahead is on the Dashboard.
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
    cy.get('[data-cy=results-patha-grants-why]').click();
    cy.get('[data-cy=results-patha-eligibility]').should('be.visible');
  });

  it('uses the team name, "net position", on the path cards', () => {
    completePlan();
    cy.get('[data-cy=results-patha-card]').should('contain', 'Net position').and('contain', 'what this path leaves you with, after costs');
  });

  it('keeps the break-even sentence in view under the verdict, with the full grid folded one click away (D35, D40, D43)', () => {
    completePlan();
    cy.get('[data-cy=results-breakeven] [data-cy=results-breakeven-sentence]').should('be.visible').and('not.be.empty');
    cy.get('[data-cy=results-breakeven] [data-cy=term-break-even-button]').should('be.visible');
    cy.get('[data-cy=results-section-heatmap]').should('not.have.attr', 'open');
    cy.get('[data-cy=results-heatmap-open]').click();
    cy.get('[data-cy=results-section-heatmap]').should('have.attr', 'open');
    cy.focused().should('have.attr', 'id', 'heatmap-title');
    cy.get('td[data-cy^=heatmap-cell-]').should('have.length', 36); // the mock grid is 6 by 6
  });

  it('shows both path cards straight after the verdict, with no extra boxes or links in between', () => {
    completePlan();
    cy.get('[data-cy=results-paths-title]').should('be.visible').and('not.contain', 'in plain words');
    cy.get('[data-cy=results-robustness]').should('not.exist');
    cy.get('[data-cy=results-tradeoff]').should('not.exist');
    cy.get('[data-cy=results-why-dashboard]').should('not.exist');
    cy.get('[data-cy=results-price-basis-change]').should('not.exist');
    cy.get('[data-cy=results-patha-card]').should('be.visible');
    cy.get('[data-cy=results-pathb-card]').should('be.visible');
    cy.get('[data-cy=results-gap-card]').should('not.exist');
    cy.get('[data-cy=results-patha-grants-total]').should('contain', 'for resale flats only').and('not.contain', 'Not eligible for the CPF Housing Grant (Family)');
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
    // The last year is measured as the verdict is (D1), so it shows each path card's own net position.
    cy.get('[data-cy=results-patha-net-position]').invoke('text').then((a) => {
      cy.get('[data-cy=results-trend-bto]').invoke('text').should('eq', a.trim());
    });
    cy.get('[data-cy=results-pathb-net-position]').invoke('text').then((b) => {
      cy.get('[data-cy=results-trend-resale]').invoke('text').should('eq', b.trim());
    });
    cy.get('[data-cy=results-trend-year]').invoke('text').then((last) => {
      cy.get('[data-cy=results-trend-stage]').focus().type('{leftarrow}');
      cy.get('[data-cy=results-trend-year]').invoke('text').should('not.eq', last);
      cy.get('[data-cy=results-trend-stage]').type('{end}');
      cy.get('[data-cy=results-trend-year]').invoke('text').should('eq', last);
    });
    cy.get('[data-cy=results-trend-lead]').invoke('text').should('match', /ahead|About level/);
  });

  it('explains why the leader is ahead, checks the cash, and draws where the answer flips', () => {
    completePlan();
    cy.get('[data-cy=dashboard-cash-card]').invoke('text').should('match', /don't cover|cover the cash|Add your cash savings/);
    // Why: only when a path is called ahead (not too close to call).
    // The mock has BTO clearly ahead, so Why must show.
    cy.get('[data-cy=results-why]').should('be.visible').find('li').should('have.length.at.least', 1);
    // The flip line, when the answer flips inside -2% to 8%: says who is ahead below and above, and marks "You".
    cy.get('body').then(($b) => {
      if ($b.find('[data-cy=results-flip-line]').length) cy.get('[data-cy=results-flip-line]').should('contain', 'ahead below').and('contain', 'You ');
    });
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
