// Results page (mock data). Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
// Selector convention: data-cy="<area>-<element>-<action>" (see docs/CONVENTIONS.md).
import { completePlan, fillPath, fillSituation, next } from './helpers/plan.js';

describe('results page', () => {
  it('shows an empty state when opened without a plan', () => {
    cy.visit('/results');
    cy.get('[data-cy=results-empty]').should('be.visible');
    cy.get('[data-cy=results-start-plan-button]').click();
    cy.location('pathname').should('eq', '/plan');
  });

  it('leads with the break-even sentence and shows the ruleset version', () => {
    completePlan();
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible').and('not.be.empty');
    cy.get('[data-cy=results-gap-sentence]').should('contain', 'net financial position');
    cy.get('[data-cy=results-ruleset-version]').should('contain', 'Ruleset');
  });

  it('compares both paths with grants, CPF refund and every eligibility reason', () => {
    completePlan();
    ['results-patha', 'results-pathb'].forEach((p) => {
      cy.get(`[data-cy=${p}-card]`).should('be.visible');
      cy.get(`[data-cy=${p}-net-position]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=${p}-grants-total]`).invoke('text').should('match', /S\$[\d,]+/);
      cy.get(`[data-cy=${p}-cpf-refund]`).should('be.visible');
      // Every eligibility test carries its own reason, never one generic message.
      cy.get(`[data-cy^=${p}-eligibility-item-]`).should('have.length.greaterThan', 0).each(($item) => {
        cy.wrap($item).find('[data-cy*=-eligibility-reason-]').invoke('text').should('not.be.empty');
      });
    });
  });

  it('marks the user’s own assumptions on the heatmap and explains any square on tap', () => {
    completePlan(); // growth defaults: 3% price, 2% income (D38)
    cy.get('td[data-cy^=heatmap-cell-]').should('have.length', 36);
    cy.get('[data-cy=heatmap-legend]').should('be.visible');

    // Mock grid rows/columns are 0%..5%, so 3% price, 2% income is row 2, column 3.
    cy.get('[data-cy=heatmap-user-marker]').closest('td').should('have.attr', 'data-cy', 'heatmap-cell-r2-c3');
    cy.get('[data-cy=heatmap-selected-detail]').should('contain', 'Your assumptions').and('contain', '3%');

    cy.get('[data-cy=heatmap-button-r5-c0]').click();
    cy.get('[data-cy=heatmap-selected-detail]')
      .should('contain', 'Price growth 0%')
      .and('contain', 'income growth 5%')
      .and('contain', 'S$');
  });

  it('never relies on colour alone: every heatmap square is labelled in words', () => {
    completePlan();
    cy.get('[data-cy^=heatmap-button-]').each(($btn) => {
      expect($btn.attr('aria-label')).to.match(/Price growth .*%, income growth .*%: /);
    });
  });

  // Onboarding no longer asks for growth (D38: defaults, changed on the Dashboard), so a plan built through
  // /plan can't put the user's point outside the grid. Bring this back if Results gets its own assumptions.
  it.skip('notes when the user’s assumptions are outside the heatmap range', () => {
    completePlan();
    cy.get('[data-cy=heatmap-outside-note]').should('be.visible');
  });

  it('fits a 375px phone screen without sideways scrolling', () => {
    cy.viewport(375, 667);
    completePlan();
    cy.get('[data-cy=heatmap]').should('be.visible');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('keeps the inputs when going back to change them', () => {
    completePlan();
    cy.get('[data-cy=results-edit-button]').click();
    cy.location('pathname').should('eq', '/plan');
    // The stepper reopens on the last input step with the answers still filled in.
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'BEDOK');
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
  });

  it('says which BTO launch and resale median the prices come from (D26, D33)', () => {
    completePlan();
    // Tampines has two Standard 4-room launches in the mock data; the newest is the default.
    cy.get('[data-cy=results-price-basis-bto]')
      .should('contain', 'MOCK Tampines Bliss').and('contain', 'the middle of').and('contain', 'S$481,000');
    cy.get('[data-cy=results-price-basis-resale]').should('contain', 'the median of 120 sales');
  });

  it('asks which launch when the town has more than one, and prices the one picked', () => {
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    cy.get('[data-cy=patha-town-select]').select('TAMPINES');
    cy.get('[data-cy=patha-project-tampines-bliss-input]').should('be.checked'); // newest first
    cy.get('[data-cy=patha-project-simei-symphony]').click();
    next();
    fillPath('pathb', { town: 'BEDOK' });
    next();
    cy.get('[data-cy=results-price-basis-bto]').should('contain', 'MOCK Simei Symphony');
  });

  it('asks town, then launch (which sets the classification), then the flat types that launch offers, then shows its range', () => {
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    cy.get('[data-cy=patha-town-select]').select('BEDOK');
    cy.get('[data-cy=patha-project-ping-yi-court-input]').should('be.checked'); // the only launch, preselected
    cy.get('[data-cy=patha-project-ping-yi-court]').should('contain', 'Oct 2025').and('contain', 'Standard');
    cy.get('[data-cy=patha-flat-type-5-room]').click(); // Ping Yi Court offers 4- and 5-room
    cy.get('[data-cy=patha-flat-type-3-room]').should('not.exist');
    cy.get('[data-cy=patha-price-basis]')
      .should('contain', 'S$715,000 to S$857,000').and('contain', 'the middle, S$786,000');
    // A Plus launch sets the classification with it.
    cy.get('[data-cy=patha-town-select]').select('TAMPINES');
    cy.get('[data-cy=patha-project-tampines-nova]').should('contain', 'Plus').click();
    cy.get('[data-cy=patha-flat-type-4-room-input]').should('be.checked');
    cy.get('[data-cy=patha-flat-type-3-room]').should('not.exist'); // Nova has 4-room only
  });

  it('takes an optional asking price and says the part above the median is paid in cash (D39)', () => {
    cy.visit('/plan');
    next();
    fillSituation();
    next();
    fillPath('patha');
    next();
    fillPath('pathb', { town: 'BEDOK' });
    cy.get('[data-cy=pathb-asking-price-help]').should('contain', 'S$665,000').and('contain', 'S$620,000 to S$760,000');
    cy.get('[data-cy=pathb-asking-price-input]').type('700000');
    cy.get('[data-cy=pathb-asking-price-cov]').should('contain', 'S$35,000 above the median');
    next();
    cy.get('[data-cy=results-price-basis-resale]')
      .should('contain', 'your asking price, S$700,000').and('contain', 'S$35,000 above the median').and('contain', 'paid in cash');
  });
});
