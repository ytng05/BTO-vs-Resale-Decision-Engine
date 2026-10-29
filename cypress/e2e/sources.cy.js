// Sources page: the ruleset behind every figure, its sources, assumptions and datasets (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.

describe('sources page', () => {
  beforeEach(() => {
    cy.visit('/sources');
    cy.get('[data-cy=sources-title]').should('be.visible');
  });

  it('shows which ruleset version the app uses, and whether it is verified', () => {
    cy.get('[data-cy=sources-ruleset-version]')
      .should('contain', 'Version')
      .invoke('text')
      .should('match', /\d{4}-\d{2}-\d{2}/); // e.g. 2026-08-24
    // Either "Verified" or the template warning, never neither.
    cy.get('body').then(($body) => {
      const hasTemplateBadge = $body.find('[data-cy=sources-template-badge]').length > 0;
      if (!hasTemplateBadge) cy.contains('.sources-verified-badge', 'Verified').should('be.visible');
    });
  });

  it('expands and collapses every rule section with one button', () => {
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1).then(($all) => {
      const total = $all.length;
      cy.get('[data-cy=sources-expand-all]').should('contain', 'Expand all').click();
      cy.get('[data-cy=sources-rules-table] details[open]').should('have.length', total);
      cy.get('[data-cy=sources-expand-all]').should('contain', 'Collapse all').click();
      cy.get('[data-cy=sources-rules-table] details[open]').should('have.length', 0);
    });
  });

  it('lists rules with values once a section is opened', () => {
    cy.get('[data-cy=sources-expand-all]').click();
    cy.get('[data-cy=sources-rules-table] tbody tr').should('have.length.greaterThan', 0);
    cy.get('[data-cy=sources-rules-table] .sources-table__value').first().invoke('text').should('not.be.empty');
  });

  it('opens every source in a new tab, safely, on an https link', () => {
    cy.get('[data-cy=sources-expand-all]').click();
    cy.get('[data-cy=sources-source-link]').should('have.length.greaterThan', 0).each(($a) => {
      expect($a.attr('href'), 'href').to.match(/^https:\/\//);
      expect($a.attr('target'), 'target').to.eq('_blank');
      expect($a.attr('rel'), 'rel').to.contain('noopener');
    });
  });

  it('states the assumptions and the datasets used', () => {
    cy.get('[data-cy=sources-assumptions] article').should('have.length.greaterThan', 0);
    cy.get('[data-cy=sources-datasets] tbody tr').should('have.length.greaterThan', 0);
    cy.get('[data-cy=sources-datasets]').should('contain', 'data.gov.sg');
  });
});
