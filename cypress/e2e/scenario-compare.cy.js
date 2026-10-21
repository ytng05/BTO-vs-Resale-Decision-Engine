// Side-by-side scenario view (/scenarios/compare).
// Runs against the mock build (VITE_USE_MOCK=true): mock-a and mock-b come from
// client/src/api/scenarioCompare.js, which only uses them in mock mode.

describe('Compare saved scenarios', () => {
  it('shows both scenarios, the Ahead badges and the headline', () => {
    cy.visit('/scenarios/compare?a=mock-a&b=mock-b')

    cy.get('[data-cy=compare-card-a] [data-cy=compare-card-name]').should('contain', 'BTO Tampines 2027')
    cy.get('[data-cy=compare-card-b] [data-cy=compare-card-name]').should('contain', 'Resale Bedok 2028')

    // A: BTO 412,000 beats Resale 398,000. B: Resale 399,000 beats BTO 371,000.
    cy.get('[data-cy=compare-card-a] [data-cy=compare-path-pathA] [data-cy=compare-ahead-badge]').should('exist')
    cy.get('[data-cy=compare-card-b] [data-cy=compare-path-pathB] [data-cy=compare-ahead-badge]').should('exist')

    // mock-a (2036) and mock-b (2037) have different horizons, so no winner or dollar gap is named.
    cy.get('[data-cy=compare-headline-sentence]')
      .should('contain', "can't be compared directly")
      .and('not.contain', 'ahead of')
    cy.get('[data-cy=compare-horizon-note]').should('contain', '2036').and('contain', '2037')
  })

  it('opens a scenario on Results', () => {
    cy.visit('/scenarios/compare?a=mock-a&b=mock-b')
    cy.get('[data-cy=compare-card-b] [data-cy=compare-open-results-button]').click()
    cy.location('pathname').should('eq', '/results')
  })

  it('asks for two scenarios when the link is incomplete', () => {
    cy.visit('/scenarios/compare?a=mock-a')
    cy.get('[data-cy=compare-invalid]').should('be.visible')
  })

  it('explains when a scenario has been deleted', () => {
    cy.visit('/scenarios/compare?a=mock-a&b=deleted-id')
    cy.get('[data-cy=compare-not-found]').should('be.visible')
  })

  it('stacks the cards at phone width', () => {
    cy.viewport(375, 812)
    cy.visit('/scenarios/compare?a=mock-a&b=mock-b')
    cy.get('[data-cy=compare-card-a]').then(($a) => {
      cy.get('[data-cy=compare-card-b]').then(($b) => {
        expect($b.offset().top).to.be.greaterThan($a.offset().top + $a.outerHeight() - 1)
      })
    })
  })

  // TODO: enable once the mock build has a logged-in user and 2+ saved scenarios on My scenarios.
  // Compare mode and CompareBar are wired in; this test checks the bar's Compare button.
  it.skip('picks two scenarios on My scenarios and opens the compare page', () => {
    cy.visit('/scenarios')
    cy.get('[data-cy=scenarios-compare-mode-button]').click()
    cy.get('[data-cy=scenarios-open-button]').should('not.exist')
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(0).check()
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(1).check()
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(2).should('be.disabled')
    cy.get('[data-cy=compare-bar-compare-button]').click()
    cy.location('pathname').should('eq', '/scenarios/compare')
  })
})