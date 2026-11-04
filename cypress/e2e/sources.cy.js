// Sources page: the ruleset behind every figure, its sources, assumptions and datasets (mock data).
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.
// "Rules and sources" starts folded: its heading opens and closes it. A topic chip, a search or /sources#<section>
// opens it. Inside, every rule section shows, open; a chip, a search or the hash filters them.
const openRules = () => {
  cy.get('[data-cy=sources-rules-toggle]').click();
  cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'true');
};

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

  it('hides the rules on load, and its heading opens and closes them', () => {
    cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-cy=sources-rules-table]').should('not.be.visible');
    cy.get('[data-cy=sources-rules-teaser]').should('be.visible');
    cy.get('[data-cy=sources-expand-all]').should('not.exist');
    openRules();
    cy.get('[data-cy=sources-rules-table]').should('be.visible');
    cy.get('[data-cy=sources-rules-teaser]').should('not.exist');
    cy.get('[data-cy=sources-rules-toggle]').click();
    cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-cy=sources-rules-table]').should('not.be.visible');
  });

  it('shows every rule section, open, once opened', () => {
    openRules();
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1).then(($all) => {
      cy.get('[data-cy=sources-rules-table] details[open]').should('have.length', $all.length);
    });
    cy.get('[data-cy=sources-rules-hint]').should('not.exist');
    cy.get('button.sources-chip[aria-pressed=true]').should('not.exist');
  });

  it('collapses and expands every shown section with one button', () => {
    openRules();
    cy.get('[data-cy=sources-expand-all]').should('contain', 'Collapse all').click();
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1);
    cy.get('[data-cy=sources-rules-table] details[open]').should('not.exist');
    cy.get('[data-cy=sources-expand-all]').should('contain', 'Expand all').click();
    cy.get('[data-cy=sources-rules-table] details').then(($all) => {
      cy.get('[data-cy=sources-rules-table] details[open]').should('have.length', $all.length);
    });
  });

  it('filters to a topic when its chip is clicked, and folds the rules again when clicked again', () => {
    cy.get('[data-cy=sources-rules-table] details').its('length').then((total) => {
      cy.contains('button.sources-chip', 'EHG').should('have.attr', 'aria-pressed', 'false').click();
      cy.contains('button.sources-chip', 'EHG').should('have.attr', 'aria-pressed', 'true').and('have.class', 'btn-primary');
      cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'true'); // a chip opens the rules
      cy.get('[data-cy=sources-rules-table] details').should('have.length', 1);
      cy.get('#sources-section-ehg').should('have.attr', 'open');
      cy.get('[data-cy=sources-rules-hint]').should('contain', 'Showing EHG only');
      cy.contains('button.sources-chip', 'EHG').click();
      cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'false');
      cy.get('[data-cy=sources-rules-table]').should('not.be.visible');
      cy.get('[data-cy=sources-rules-table] details').should('have.length', total);
      cy.contains('button.sources-chip', 'EHG').should('have.attr', 'aria-pressed', 'false').and('have.class', 'btn-outline-primary');
      cy.get('[data-cy=sources-rules-hint]').should('not.exist');
    });
  });

  it('"Show all topics" clears a chip filter', () => {
    cy.contains('button.sources-chip', 'Loans').click();
    cy.get('[data-cy=sources-rules-table] details').should('have.length', 1);
    cy.get('[data-cy=sources-show-all-topics]').click();
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1);
    cy.get('[data-cy=sources-rules-table]').should('be.visible'); // "Show all topics" keeps the rules open
    cy.contains('button.sources-chip', 'Loans').should('have.attr', 'aria-pressed', 'false');
  });

  it('collapses one section with its chevron, leaving it listed', () => {
    openRules();
    cy.get('#sources-section-ehg > summary').click();
    cy.get('#sources-section-ehg').should('exist').and('not.have.attr', 'open');
    cy.get('#sources-section-ehg > summary').click();
    cy.get('#sources-section-ehg').should('have.attr', 'open');
  });

  it('opens the topic named in the URL hash', () => {
    cy.visit('/sources#loans');
    cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'true');
    cy.get('#sources-section-loans').should('be.visible').and('have.attr', 'open');
    cy.contains('button.sources-chip', 'Loans').should('have.attr', 'aria-pressed', 'true');
  });

  it('removes the hash when its topic filter is cleared', () => {
    cy.visit('/sources#loans');
    cy.get('#sources-section-loans').should('exist');
    cy.contains('button.sources-chip', 'Loans').click();
    cy.get('[data-cy=sources-rules-table] details').should('have.length.greaterThan', 1);
    cy.location('hash').should('eq', '');
  });

  it('shows every section that matches a search, whatever chip is selected, and announces the count', () => {
    cy.contains('button.sources-chip', 'EHG').click();
    cy.get('[data-cy=sources-search-input]').type('stamp duty');
    cy.get('[data-cy=sources-rules-table] details').should('have.length', 1).and('have.attr', 'open');
    cy.get('[data-cy=sources-search-status]').should('contain', 'Showing 1 rule section');
    cy.get('[data-cy=sources-search-input]').clear();
    cy.get('[data-cy=sources-rules-table] details').should('have.length', 1);
    cy.get('#sources-section-ehg').should('exist');
    cy.get('[data-cy=sources-search-status]').should('have.text', '');
  });

  it('opens the rules when a search matches them', () => {
    cy.get('[data-cy=sources-search-input]').type('stamp duty');
    cy.get('[data-cy=sources-rules-toggle]').should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-cy=sources-rules-table] details').should('be.visible');
  });

  it('scrolls back to a band table after it is collapsed', () => {
    openRules();
    cy.contains('#sources-section-ehg button.sources-tier-toggle', /Show all \d+ bands/).scrollIntoView().click();
    cy.contains('#sources-section-ehg button.sources-tier-toggle', 'Show first 5 bands').scrollIntoView().click();
    cy.get('#sources-section-ehg .sources-table__caption').should(($caption) => {
      const { top, bottom } = $caption[0].getBoundingClientRect();
      expect(top, 'caption top').to.be.at.least(0);
      expect(bottom, 'caption bottom').to.be.at.most(Cypress.config('viewportHeight'));
    });
  });

  it('lists rules with values', () => {
    openRules();
    cy.get('[data-cy=sources-rules-table] tbody tr').should('have.length.greaterThan', 0);
    cy.get('[data-cy=sources-rules-table] .sources-table__value').first().invoke('text').should('not.be.empty');
  });

  it('opens every source in a new tab, safely, on an https link', () => {
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
