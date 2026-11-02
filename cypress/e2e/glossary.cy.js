// Plain-English terms: a <Term> opens its definition by tap or keyboard and links to the Glossary on Sources,
// which lists every term, follows the search, and marks the term a link points to.
import { completePlan } from './helpers/plan.js';

describe('glossary and terms', () => {
  it('opens a definition from a grant name on Results, closes it with Esc, and links to the glossary', () => {
    cy.visit('/plan');
    completePlan();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=term-ehg-definition]').first().should('not.be.visible');
    cy.get('[data-cy=term-ehg-button]').first().scrollIntoView().click();
    cy.get('[data-cy=term-ehg-button]').first().should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-cy=term-ehg-definition]').first().should('be.visible').and('contain', 'first-timer');
    cy.get('body').type('{esc}');
    cy.get('[data-cy=term-ehg-definition]').first().should('not.be.visible');
    cy.focused().should('have.attr', 'data-cy', 'term-ehg-button');

    cy.get('[data-cy=term-break-even-button]').first().click();
    cy.get('[data-cy=term-break-even-definition]').first().contains('More in the glossary').click();
    cy.location('pathname').should('eq', '/sources');
    cy.location('hash').should('eq', '#glossary-break-even');
    cy.get('[data-cy=sources-glossary-break-even]').should('have.class', 'sources-glossary__item--current');
  });

  it('lists every term on Sources and filters them with the search', () => {
    cy.visit('/sources');
    cy.get('[data-cy=sources-glossary] dt').should('have.length.greaterThan', 10);
    cy.get('[data-cy=sources-search-input]').type('occupation');
    cy.get('[data-cy=sources-glossary] dt').should('have.length', 1).and('contain', 'Minimum occupation period');
  });
});
