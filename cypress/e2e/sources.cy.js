// Sources page: the ruleset behind every figure, its sources, assumptions and datasets (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
// Rule sections start hidden: pick a topic chip, use "Show all", search, or open /sources#<section>.

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

  it('shows no rule sections until a topic is picked', () => {
    cy.get('[data-cy=sources-rules-hint]').should('contain', 'Pick a topic above or search');
    cy.get('[data-cy=sources-rules-table] details').should('not.exist');
  });

  it('shows and hides every rule section with one button', () => {
    cy.get('[data-cy=sources-expand-all]').should('contain', 'Show all').click();
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1).then(($all) => {
      cy.get('[data-cy=sources-rules-table] details[open]').should('have.length', $all.length);
    });
    cy.get('[data-cy=sources-expand-all]').should('contain', 'Hide all').click();
    cy.get('[data-cy=sources-rules-table] details').should('not.exist');
    cy.get('[data-cy=sources-rules-hint]').should('be.visible');
  });

  it('toggles a section with its topic chip', () => {
    cy.contains('button.sources-chip', 'Loans').should('have.attr', 'aria-pressed', 'false').click();
    cy.contains('button.sources-chip', 'Loans').should('have.attr', 'aria-pressed', 'true');
    cy.get('#sources-section-loans').should('have.attr', 'open');
    cy.contains('button.sources-chip', 'Loans').click();
    cy.get('#sources-section-loans').should('not.exist');
  });

  it('opens the section named in the URL hash', () => {
    cy.visit('/sources#loans');
    cy.get('#sources-section-loans').should('have.attr', 'open');
    cy.contains('button.sources-chip', 'Loans').should('have.attr', 'aria-pressed', 'true');
  });

  it('shows every section that matches a search, whatever chips are selected', () => {
    cy.get('[data-cy=sources-search-input]').type('stamp duty');
    cy.get('[data-cy=sources-rules-table] details').should('have.length', 1).and('have.attr', 'open');
    cy.get('[data-cy=sources-search-input]').clear();
    cy.get('[data-cy=sources-rules-table] details').should('not.exist');
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
