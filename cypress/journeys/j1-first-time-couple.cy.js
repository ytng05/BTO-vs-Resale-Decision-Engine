// Journey 1 (docs/JOURNEYS.md): a first-time couple asks "BTO or resale?". Live build only.
import { J1, beat, fillPlan, openDashboard, setSlider } from './personas.js';

describe('Journey 1: first-time couple, "BTO or resale?"', () => {
  it('fills the plan, reads the verdict and the reasons, then tries a what-if', () => {
    fillPlan(J1);

    // The verdict: one sentence, then the gap.
    cy.get('[data-cy=results-breakeven-sentence]').should('contain', 'Path A (BTO)');
    cy.get('[data-cy=results-gap-total]').should('contain', 'BTO ends');
    beat();

    // Why: the gap line by line, and where the user's own assumptions sit on the heatmap.
    cy.get('[data-cy=results-gap-card]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=results-gap-list]').should('be.visible');
    beat();
    cy.get('[data-cy=heatmap-user-marker]').scrollIntoView().should('be.visible');
    beat();

    // What it's made of, and what if flat prices only grow 1% a year?
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').should('contain', 'BTO ends');
    cy.get('[data-cy=dashboard-summary-bto-affordability]').should('contain', 'Within your loan limit');
    cy.get('[data-cy=dashboard-summary-resale-affordability]').should('contain', 'Within your loan limit');
    beat();
    setSlider('whatif-price-growth', 1);
    cy.get('[data-cy=dashboard-headline]').should('contain', 'ahead');
  });
});
