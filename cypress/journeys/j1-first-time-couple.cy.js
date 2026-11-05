// Journey 1 (docs/JOURNEYS.md): a first-time couple asks "BTO or resale?". Live build only.
import { J1, beat, fillPlan, openDashboard, setSlider } from './personas.js';

describe('Journey 1: first-time couple, "BTO or resale?"', () => {
  it('fills the plan, reads the verdict and the reasons, then tries a what-if', () => {
    fillPlan(J1);

    // The verdict: one sentence, then the gap.
    cy.get('[data-cy=results-breakeven-sentence]').should('contain', 'Path A (BTO)');
    cy.get('[data-cy=results-verdict-headline]').should('contain', 'BTO leaves you');
    beat();

    // Each path in plain words, and where the user's own assumptions sit on the heatmap.
    cy.get('[data-cy=results-patha-card]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=results-pathb-card]').should('be.visible');
    beat();
    cy.get('[data-cy=results-heatmap-open]').click(); // the heatmap is folded under "More detail" on Results
    cy.get('[data-cy=heatmap-user-marker]').scrollIntoView().should('be.visible');
    beat();

    // What it's made of, and what if flat prices only grow 1% a year?
    openDashboard();
    // The Dashboard says the answer in Results' words (verdict(), D42).
    cy.get('[data-cy=dashboard-headline]').should('contain', 'BTO leaves you');
    cy.get('[data-cy=dashboard-summary-bto-affordability]').should('contain', 'Within your loan limit');
    cy.get('[data-cy=dashboard-summary-resale-affordability]').should('contain', 'Within your loan limit');
    beat();
    setSlider('whatif-price-growth', 1);
    cy.get('[data-cy=dashboard-headline]').invoke('text').should('match', /better off|Too close to call|about the same/);
  });
});
