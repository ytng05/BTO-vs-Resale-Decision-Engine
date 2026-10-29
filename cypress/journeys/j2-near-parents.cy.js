// Journey 2 (docs/JOURNEYS.md): a couple who want to live near their parents, renting while a long BTO wait
// runs. Resale ends ahead; with no rent while waiting, BTO does. Live build only.
import { J2, beat, fillPlan, openDashboard, setSlider } from './personas.js';

describe('Journey 2: living near parents', () => {
  it('shows resale ahead, why (grants, rent while waiting), the sources, and the rent what-if', () => {
    fillPlan(J2);
    cy.get('[data-cy=results-breakeven-sentence]').should('contain', 'Path B (resale)');
    cy.get('[data-cy=results-gap-sentence]').should('contain', 'resale ends');
    beat();

    // Why: rent while waiting is a line of its own; grants are stated beside the lines.
    cy.get('[data-cy=results-gap-line-RENT_WHILE_WAITING]').scrollIntoView().should('be.visible');
    cy.get('[data-cy=results-gap-grants]').should('be.visible');
    beat();

    // The grants, with every check's reason: the Proximity Housing Grant only on resale, near parents.
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').should('contain', 'Resale ends');
    cy.get('[data-cy=dashboard-grant-phg-resale]').scrollIntoView().should('contain', 'Eligible');
    cy.get('[data-cy=dashboard-grant-phg-bto]').should('contain', 'Not eligible');
    beat();
    // TODO: the PHG map with the 4 km circle, once #69 is merged.

    // What if they live with their parents while waiting (no rent)?
    cy.get('[data-cy=dashboard-whatif]').scrollIntoView();
    setSlider('whatif-rent', 0);
    cy.get('[data-cy=dashboard-headline]').should('contain', 'BTO ends');

    // Every rule links to its official source.
    cy.get('[data-cy=dashboard-sources-link]').scrollIntoView().click();
    cy.location('pathname').should('eq', '/sources');
    cy.get('[data-cy=sources-ruleset-version]').should('be.visible');
    beat();
  });
});
