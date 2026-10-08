// Results page (mock data). Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
// Selector convention: data-cy="<area>-<element>-<action>" (see docs/CONVENTIONS.md).
import { completePlan } from './helpers/plan.js';

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
    completePlan({ priceGrowth: '3', incomeGrowth: '2' });
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

  it('notes when the user’s assumptions are outside the heatmap range', () => {
    completePlan({ priceGrowth: '12', incomeGrowth: '2' });
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
});