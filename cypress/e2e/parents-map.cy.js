// Resale flat step: "Check on a map" beside "Your parents" opens the Near parents map (the Dashboard's card) in a
// pop-up, without leaving the plan. Mock data: the map's postal code lookups are not made here.
import { fillPath, fillSituation, next, pickWishes } from './helpers/plan.js';

// To the Resale flat step, with "Near my parents" picked in step 1 so the Your parents row shows.
function toResaleStep() {
  cy.visit('/plan');
  pickWishes(['parents']);
  next();
  fillSituation();
  next();
  fillPath('patha');
  next();
  cy.get('[data-cy=pathb-living]').should('be.visible');
}

describe('parents map on the Resale flat step', () => {
  it('opens the map in a pop-up from the Your parents row, and closes it back to the button', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-living-map-button]').should('be.visible').click();
    cy.get('[data-cy=pathb-living-map-dialog]').should('be.visible').and('contain', 'Near parents');
    cy.get('[data-cy=pathb-living-map-dialog] [data-cy=phg-parents-postal-input]').should('be.visible');
    cy.focused().should('have.attr', 'data-cy', 'pathb-living-map-close');

    // Esc closes it and focus goes back to the button.
    cy.get('body').type('{esc}');
    cy.get('[data-cy=pathb-living-map-dialog]').should('not.be.visible');
    cy.focused().should('have.attr', 'data-cy', 'pathb-living-map-button');

    // The close button too; the answer picked on the step is unchanged by the map (display only).
    cy.get('[data-cy=pathb-living-near]').click();
    cy.get('[data-cy=pathb-living-map-button]').click();
    cy.get('[data-cy=pathb-living-map-dialog]').should('contain', 'check the 4 km rule');
    cy.get('[data-cy=pathb-living-map-close]').click();
    cy.get('[data-cy=pathb-living-map-dialog]').should('not.be.visible');
    cy.get('[data-cy=pathb-living-near-input]').should('be.checked');
  });

  it('keeps the postal code typed in the map after closing and opening it again', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-living-map-button]').click();
    cy.get('[data-cy=phg-parents-postal-input]').type('520123');
    cy.get('[data-cy=pathb-living-map-close]').click();
    cy.get('[data-cy=pathb-living-map-button]').click();
    cy.get('[data-cy=phg-parents-postal-input]').should('have.value', '520123');
  });

    // A mock build places postal codes and towns with MOCK points (api/mock/mockOneMap.js), so no OneMap calls.
    function showParents() {
    cy.get('[data-cy=phg-parents-postal-input]').clear().type('739018');
    cy.get('[data-cy=phg-show-button]').click();
  }

  it('gives the distance to the resale town picked on the step, as on the Dashboard', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-town-select]').select('BEDOK');
    cy.get('[data-cy=pathb-living-map-button]').click();
    showParents();
    cy.get('[data-cy=phg-distance]').should('contain', 'Bedok town centre').and('contain', 'km');
    cy.get('[data-cy=phg-distance-approximate]').should('contain', "Add the resale flat's postal code");
    cy.get('[data-cy=phg-check-note]').should('be.visible');

    // With the flat's postal code the distance is exact, and the town-centre line goes.
    cy.get('[data-cy=phg-flat-postal-input]').type('529510');
    cy.get('[data-cy=phg-show-button]').click();
    cy.get('[data-cy=phg-distance]').should('contain', 'Resale flat');
    cy.get('[data-cy=phg-distance-approximate]').should('not.exist');
  });

  it('measures again when the resale town is picked or changed after the map was first opened', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-living-map-button]').click(); // no resale town yet
    showParents();
    cy.get('[data-cy=phg-distance]').should('not.exist');
    cy.get('[data-cy=phg-distance-missing]').should('be.visible');
    cy.get('[data-cy=pathb-living-map-close]').click();

    // Picked after: reopening measures to it, without pressing Show again.
    cy.get('[data-cy=pathb-town-select]').select('BEDOK');
    cy.get('[data-cy=pathb-living-map-button]').click();
    cy.get('[data-cy=phg-distance]').should('contain', 'Bedok town centre');
    cy.get('[data-cy=phg-distance-missing]').should('not.exist');
    cy.get('[data-cy=phg-distance] strong').invoke('text').then((bedokKm) => {
    cy.get('[data-cy=pathb-living-map-close]').click();

    // Changed: the distance follows the new town.
    cy.get('[data-cy=pathb-town-select]').select('TAMPINES');
    cy.get('[data-cy=pathb-living-map-button]').click();
    cy.get('[data-cy=phg-distance]').should('contain', 'Tampines town centre');
    cy.get('[data-cy=phg-distance] strong').should('not.have.text', bedokKm);
    });
  });

  [[320, 568], [375, 667], [1280, 800]].forEach(([width, height]) => {
    it(`the row and the pop-up fit a ${width}px screen`, () => {
      cy.viewport(width, height);
      toResaleStep();
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth);
      });
      cy.get('[data-cy=pathb-living-map-button]').click();
      cy.get('[data-cy=pathb-living-map-close]').should('be.visible').then(($btn) => {
        const box = $btn[0].getBoundingClientRect();
        expect(box.right, 'close button inside the screen').to.be.at.most($btn[0].ownerDocument.documentElement.clientWidth);
      });
    });
  });
});
