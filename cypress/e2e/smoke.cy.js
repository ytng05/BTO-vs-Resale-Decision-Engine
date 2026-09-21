// Smoke test. Needs: `VITE_USE_MOCK=true npm run build` then `npm start`, then `npm run test:e2e`.
// Selector convention: data-cy="<area>-<element>-<action>" (see docs/CONVENTIONS.md).

describe('smoke', () => {
  it('loads the home page and shows the disclaimer', () => {
    cy.visit('/');
    cy.get('[data-cy=home-title]').should('be.visible');
    cy.get('[data-cy=disclaimer-banner]').should('be.visible');
  });

  it('walks through the stepper to the results page (mock data)', () => {
    cy.visit('/plan');
    cy.get('[data-cy=plan-step-next]').click(); // situation -> path A
    cy.get('[data-cy=plan-step-next]').click(); // path A -> path B
    cy.get('[data-cy=plan-step-next]').click(); // path B -> results
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy^=heatmap-cell-]').should('have.length.greaterThan', 0);
  });

  // TODO (seat 5): register / login / save scenario / reload and confirm it restores identically
  it.skip('register, log in, build both paths, save, reload', () => {});
});
