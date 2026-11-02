// Resale flat step: find the listing by postal code or address (GET /api/data/resale-flat), mock data.
// Mock: 000000 finds nothing, 111111 is not an HDB block, anything else is MOCK Blk 123 Simei St 1, Tampines (1988).
import { fillPath, fillSituation, next } from './helpers/plan.js';

function toResaleStep() {
  cy.visit('/plan');
  next(); // what matters most -> about you
  fillSituation();
  next(); // -> your BTO
  fillPath('patha');
  next(); // -> resale flat
  cy.get('[data-cy=pathb-flat-search]').should('be.visible');
}

describe('resale flat search', () => {
  it('is optional: Find waits for something to search for', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-flat-search-button]').should('be.disabled');
    cy.get('[data-cy=pathb-flat-search-input]').type('520123');
    cy.get('[data-cy=pathb-flat-search-button]').should('not.be.disabled');
  });

  it('finds the block and says what it found; Enter searches without leaving the step', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-flat-search-input]').type('520123{enter}');
    cy.get('[data-cy=plan-step-4-panel]').should('exist'); // still on Resale flat
    cy.get('[data-cy=pathb-flat-search-found]')
      .should('contain', 'Blk 123 Simei St 1, Tampines')
      .and('contain', 'Lease from 1988')
      .and('contain', 'about 61 years left');
  });

  it('says plainly when nothing is found, or when the address is not an HDB block', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-flat-search-input]').type('000000');
    cy.get('[data-cy=pathb-flat-search-button]').click();
    cy.get('[data-cy=pathb-flat-search-error]').should('contain', 'could not find');
    cy.get('[data-cy=pathb-flat-search-input]').clear().type('111111');
    cy.get('[data-cy=pathb-flat-search-button]').click();
    cy.get('[data-cy=pathb-flat-search-error]').should('contain', "isn't an HDB block");
  });

  it('fills in the town and remaining lease from the block, and leaves the flat type to the user', () => {
    toResaleStep();
    cy.get('[data-cy=pathb-flat-search-input]').type('520123{enter}');
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'TAMPINES');
    cy.get('[data-cy=pathb-lease-band-60-69-input]').should('be.checked');
    cy.get('[data-cy=pathb-flat-search-found]').should('contain', 'filled in the town and remaining lease').and('not.contain', 'flat type');
    // The mock block sold 3- and 4-room flats, so the flat type stays as it was (4-room, from the BTO step).
    cy.get('[data-cy=pathb-flat-type-4-room-input]').should('be.checked');
  });
});
