// Single-page-app basics for keyboard and screen-reader users: a skip link, a page title per page,
// focus on the new page after in-app navigation, a new page starting at the top, and a 404 page.

describe('accessibility basics', () => {
  it('offers a skip link as the first Tab stop, which moves focus to the main content', () => {
    cy.visit('/sources');
    cy.get('[data-cy=skip-link]').focus().should('be.visible').and('have.attr', 'href', '#main');
    cy.get('[data-cy=skip-link]').click();
    cy.focused().should('have.attr', 'id', 'main');
  });

  it('names each page in the browser tab', () => {
    cy.visit('/');
    cy.title().should('eq', 'BTO vs Resale');
    cy.visit('/sources');
    cy.title().should('eq', 'Sources · BTO vs Resale');
    cy.visit('/plan');
    cy.title().should('eq', 'Plan · BTO vs Resale');
  });

  it('moves focus to the new page heading after in-app navigation', () => {
    cy.visit('/');
    cy.get('[data-cy=nav-sources-link]').click({ force: true });
    cy.focused().should('have.attr', 'data-cy', 'sources-title');
    cy.get('[data-cy=nav-plan-link]').click({ force: true });
    cy.focused().should('have.attr', 'data-cy', 'plan-page-title');
  });

  it('starts a new page at the top', () => {
    cy.visit('/sources');
    cy.scrollTo('bottom');
    // Wait until the scroll has finished at the bottom (not mid-way), then leave the page.
    cy.window().should((win) => {
      expect(win.scrollY).to.be.greaterThan(0);
      expect(win.scrollY + win.innerHeight).to.be.closeTo(win.document.documentElement.scrollHeight, 2);
    });
    cy.get('[data-cy=nav-brand-home]').click();
    cy.window().its('scrollY').should('eq', 0);
  });

  it('shows a page-not-found page with ways back for an unknown address', () => {
    cy.visit('/no-such-page');
    cy.get('[data-cy=not-found]').should('contain', "couldn't find that page").and('contain', '/no-such-page');
    cy.title().should('eq', 'Page not found · BTO vs Resale');
    cy.get('[data-cy=not-found-home-link]').click();
    cy.location('pathname').should('eq', '/');
  });
});
