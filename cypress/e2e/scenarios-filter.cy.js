// My scenarios filter bar: search, dropdowns, price range, "N of M scenarios", Clear filters and "no matches".
// The list is stubbed with cy.intercept (no database needed), and the user is "logged in" with a stored token.
// Needs: `VITE_USE_MOCK=true npm run build`, then `npm start`, then `npm run test:e2e`.

const scenarios = [
  {
    id: 's1', name: 'Tampines BTO vs Bedok resale', rulesetVersion: '2026-08-24', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    summary: { btoTown: 'TAMPINES', btoFlatType: '4 ROOM', resaleTown: 'BEDOK', resaleFlatType: '4 ROOM', ahead: 'A', btoPriceCents: 54_000_000, resalePriceCents: 62_000_000 },
  },
  {
    id: 's2', name: 'Punggol plan', rulesetVersion: '2026-08-24', createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
    summary: { btoTown: 'PUNGGOL', btoFlatType: '5 ROOM', resaleTown: 'TAMPINES', resaleFlatType: '5 ROOM', ahead: 'B', btoPriceCents: 70_000_000, resalePriceCents: 80_000_000 },
  },
  {
    id: 's3', name: 'Draft', rulesetVersion: '2026-08-24', createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
    summary: { btoTown: 'BEDOK', btoFlatType: '3 ROOM', resaleTown: 'BEDOK', resaleFlatType: '3 ROOM', ahead: null, btoPriceCents: null, resalePriceCents: null },
  },
];

function visitScenarios() {
  cy.intercept('GET', '/api/scenarios', { body: { scenarios } });
  cy.visit('/scenarios', {
    onBeforeLoad(win) {
      win.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: 'stub-token', user: { name: 'Test Buyer', email: 'buyer@example.com' } }));
    },
  });
  cy.get('[data-cy=scenarios-list] li').should('have.length', 3);
}

describe('My scenarios filter bar', () => {
  it('shows the count and a summary line for each scenario', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-filter-count]').should('have.text', '3 scenarios');
    cy.get('[data-cy=scenarios-filter-clear]').should('not.exist');
    cy.get('[data-cy=scenarios-row-s1] [data-cy=scenarios-row-summary]').should('have.text', 'Tampines 4-room BTO vs Bedok 4-room resale · BTO ahead');
    cy.get('[data-cy=scenarios-row-s3] [data-cy=scenarios-row-summary]').should('contain', 'Not calculated');
  });

  it('searches by name', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-filter-search]').type('punggol');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'Punggol plan');
    cy.get('[data-cy=scenarios-filter-count]').should('have.text', '1 of 3 scenarios');
  });

  it('filters by town (either path), path ahead and price range', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-filter-town]').select('Tampines');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 2);
    cy.get('[data-cy=scenarios-filter-ahead]').select('Resale ahead');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'Punggol plan');

    cy.get('[data-cy=scenarios-filter-clear]').click();
    cy.get('[data-cy=scenarios-list] li').should('have.length', 3);
    cy.get('[data-cy=scenarios-filter-max-price]').type('600000');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 1).and('contain', 'Tampines BTO vs Bedok resale');
  });

  it('says when nothing matches, and Clear filters brings everything back', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-filter-flat-type]').select('3-room');
    cy.get('[data-cy=scenarios-filter-ahead]').select('BTO ahead');
    cy.get('[data-cy=scenarios-list]').should('not.exist');
    cy.get('[data-cy=scenarios-no-matches]').should('contain', 'No scenarios match');
    cy.get('[data-cy=scenarios-filter-count]').should('have.text', '0 of 3 scenarios');
    cy.get('[data-cy=scenarios-no-matches-clear]').click();
    cy.get('[data-cy=scenarios-list] li').should('have.length', 3);
    cy.get('[data-cy=scenarios-filter-town]').should('have.value', '');
  });

  it('keeps ticked scenarios in the list while filtering in compare mode', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-compare-mode-button]').click();
    cy.get('[data-cy=scenarios-row-s1] [data-cy=scenarios-compare-checkbox]').check();
    cy.get('[data-cy=scenarios-row-s2] [data-cy=scenarios-compare-checkbox]').check();
    cy.get('[data-cy=scenarios-filter-search]').type('draft');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 3);
    cy.get('[data-cy=scenarios-filter-count]').should('have.text', '1 of 3 scenarios');
    cy.get('[data-cy=scenarios-row-s1] [data-cy=scenarios-compare-checkbox]').uncheck();
    cy.get('[data-cy=scenarios-list] li').should('have.length', 2);
    cy.get('[data-cy=scenarios-row-s1]').should('not.exist');
  });

  it('resets the town filter when the last scenario in that town is deleted', () => {
    visitScenarios();
    cy.intercept('DELETE', '/api/scenarios/s2', { statusCode: 204 });
    cy.get('[data-cy=scenarios-filter-town]').select('Punggol');
    cy.get('[data-cy=scenarios-row-s2] [data-cy=scenarios-delete-button]').click();
    cy.get('[data-cy=scenarios-row-s2] [data-cy=scenarios-delete-confirm]').click();
    cy.get('[data-cy=scenarios-filter-town]').should('have.value', '');
    cy.get('[data-cy=scenarios-list] li').should('have.length', 2);
  });

  it('warns when the price range cannot match anything', () => {
    visitScenarios();
    cy.get('[data-cy=scenarios-filter-price-hint]').should('not.exist');
    cy.get('[data-cy=scenarios-filter-min-price]').type('700000');
    cy.get('[data-cy=scenarios-filter-max-price]').type('500000');
    cy.get('[data-cy=scenarios-filter-price-hint]').should('contain', 'higher than');
  });
});
