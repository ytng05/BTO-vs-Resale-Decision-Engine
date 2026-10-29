// Journey 3 (docs/JOURNEYS.md): a couple who must move in by 2032 ask "when should we apply?". Live build only.
import { J3, beat, fillPlan } from './personas.js';

describe('Journey 3: move-in deadline, "when should we apply?"', () => {
  it('ranks the application years, names the best one and says which years miss the deadline', () => {
    fillPlan(J3);
    cy.get('[data-cy=results-timing-card]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=results-timing-loading]', { timeout: 60000 }).should('not.exist');
    cy.get('[data-cy=results-timing-headline]').should('be.visible');
    cy.get('[data-cy^=results-timing-best-]').should('have.length', 1);
    beat();
    // Keys for a 2031 application come after 2032.
    cy.get('[data-cy=results-timing-skipped-2031]').should('contain', 'move-in');
    cy.get('[data-cy=results-timing-explanation]').should('contain', 'Grants change with the year you apply');
    beat();
  });
});
