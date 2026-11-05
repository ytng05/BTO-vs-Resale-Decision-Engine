// Journey 2 (docs/JOURNEYS.md): a couple who want to live near their parents. Living with them until keys, BTO
// ends ahead; renting at S$2,800 while a long BTO wait runs, resale does (grants incl. PHG, no rent). Live build only.
import { J2, beat, fillPlan, openDashboard, setSlider } from './personas.js';

describe('Journey 2: living near parents', () => {
  it('shows the grants with the PHG, the rent what-if that turns it to resale, and the sources', () => {
    fillPlan(J2);
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    // They answered the parents question (picked in step 1), so Results doesn't say the PHG was left out.
    cy.get('[data-cy=results-phg-note]').should('not.exist');
    cy.get('[data-cy=results-pathb-grants-total]').scrollIntoView().should('be.visible');
    beat();

    // The grants, with every check's reason: the Proximity Housing Grant only on resale, near parents.
    openDashboard();
    cy.get('[data-cy=dashboard-headline]').should('contain', 'BTO leaves you'); // Results' wording (verdict(), D42)
    // The grants open in a pop-up from their "Explore the detail" card.
    cy.get('[data-cy=dashboard-explore-grants]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-grant-phg-resale]').should('contain', 'Eligible');
    cy.get('[data-cy=dashboard-grant-phg-bto]').should('contain', 'Not eligible');
    beat();
    cy.get('[data-cy=dashboard-modal-close]').click(); // close the pop-up before using the sliders

    // What if they rent while waiting for the BTO keys instead of living with their parents?
    cy.get('[data-cy=dashboard-whatif]').scrollIntoView();
    setSlider('whatif-rent', 2800);
    cy.get('[data-cy=dashboard-headline]').should('contain', 'Resale leaves you');

    // Every rule links to its official source: the link sits in the Grants pop-up.
    cy.get('[data-cy=dashboard-explore-grants]').click({ scrollBehavior: 'center' });
    cy.get('[data-cy=dashboard-sources-link]').click();
    cy.location('pathname').should('eq', '/sources');
    cy.get('[data-cy=sources-ruleset-version]').should('be.visible');
    beat();
  });
});
