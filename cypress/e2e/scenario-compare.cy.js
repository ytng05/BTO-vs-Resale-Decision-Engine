// Side-by-side scenario view (/scenarios/compare).
// Runs against the mock build (VITE_USE_MOCK=true). Ids starting with "mock-" come from
// MOCK_SCENARIOS in client/src/api/scenarioCompare.js; an unknown mock- id is "not found".
// The page is for logged-in users, as My scenarios is. Mock ids never reach the API, so a stored token and a stubbed
// list (the navbar's count) are enough for them; only the test with real saved scenarios needs a database.

import { registerFreshUser, saveScenario } from './helpers/scenarios.js'

function visitLoggedIn(path) {
  cy.intercept('GET', '/api/scenarios', { body: { scenarios: [] } })
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: 'stub-token', user: { name: 'Test Buyer' } }))
    },
  })
}

describe('Compare saved scenarios', () => {
  it('shows both scenarios, the Ahead badges and the headline', () => {
    visitLoggedIn('/scenarios/compare?a=mock-a&b=mock-b')

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
    visitLoggedIn('/scenarios/compare?a=mock-a&b=mock-b')
    cy.get('[data-cy=compare-card-b] [data-cy=compare-open-results-button]').click()
    cy.location('pathname').should('eq', '/results')
  })

  it('asks for two scenarios when the link is incomplete', () => {
    visitLoggedIn('/scenarios/compare?a=mock-a')
    cy.get('[data-cy=compare-invalid]').should('be.visible')
  })

  it('explains when a scenario has been deleted', () => {
    visitLoggedIn('/scenarios/compare?a=mock-a&b=mock-deleted')
    cy.get('[data-cy=compare-not-found]').should('be.visible')
  })

  it('stacks the cards at phone width', () => {
    cy.viewport(375, 812)
    visitLoggedIn('/scenarios/compare?a=mock-a&b=mock-b')
    cy.get('[data-cy=compare-card-a]').then(($a) => {
      cy.get('[data-cy=compare-card-b]').then(($b) => {
        expect($b.offset().top).to.be.greaterThan($a.offset().top + $a.outerHeight() - 1)
      })
    })
  })

  // Real saved scenarios, so this one needs a database.
  it('picks two scenarios on My scenarios and opens the compare page', () => {
    registerFreshUser()
    ;['First plan', 'Second plan', 'Third plan'].forEach((name) => saveScenario(name))
    cy.visit('/scenarios')
    cy.get('[data-cy=scenarios-compare-mode-button]').click()
    cy.get('[data-cy=scenarios-open-button]').should('not.exist')
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(0).check()
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(1).check()
    cy.get('[data-cy=scenarios-compare-checkbox]').eq(2).should('be.disabled')
    cy.get('[data-cy=compare-bar-compare-button]').click()
    cy.location('pathname').should('eq', '/scenarios/compare')
    cy.get('[data-cy=compare-card-a] [data-cy=compare-card-name]').should('be.visible')
    cy.get('[data-cy=compare-card-b] [data-cy=compare-card-name]').should('be.visible')
  })
})

describe('Compare saved scenarios, logged out', () => {
  it('shows the same log-in prompt as My scenarios, without asking the API', () => {
    // Real ids (mock- ids never reach the API), so a request here means the login check is gone.
    cy.intercept('GET', '/api/scenarios/*').as('scenario')
    cy.visit('/scenarios/compare?a=real-a&b=real-b')
    cy.get('[data-cy=compare-logged-out]').should('be.visible').and('contain', 'Log in to compare')
    cy.get('[data-cy=compare-error]').should('not.exist')
    cy.get('[data-cy=compare-login-link]').should('have.attr', 'href').and('include', 'redirect=')
    cy.get('@scenario.all').should('have.length', 0)
  })

  it('comes back to the same comparison after logging in', () => {
    cy.visit('/scenarios/compare?a=mock-a&b=mock-b')
    cy.get('[data-cy=compare-login-link]').click()
    cy.location('pathname').should('eq', '/login')
    cy.location('search').should((search) => {
      expect(new URLSearchParams(search).get('redirect')).to.equal('/scenarios/compare?a=mock-a&b=mock-b')
    })
  })

  it('shows the prompt, not an error, when the login has expired, and logs out', () => {
    // A token the server no longer accepts.
    cy.visit('/scenarios/compare?a=real-a&b=real-b', {
      onBeforeLoad(win) {
        win.localStorage.setItem('hdb-app:auth', JSON.stringify({ token: 'expired', user: { id: 'x', name: 'Old tab' } }))
      },
    })
    cy.get('[data-cy=compare-logged-out]').should('be.visible')
    cy.get('[data-cy=compare-error]').should('not.exist')
    cy.get('[data-cy=nav-login-link]').should('be.visible')
    cy.window().its('localStorage').invoke('getItem', 'hdb-app:auth').should('equal', null)
  })
})
