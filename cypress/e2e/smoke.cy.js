// Smoke test. Needs: `VITE_USE_MOCK=true npm run build` then `npm start`, then `npm run test:e2e`.
// Selector convention: data-cy="<area>-<element>-<action>" (see docs/CONVENTIONS.md).

const nextYear = new Date().getFullYear() + 1;

// Fills each plan step with valid input so validation lets the stepper move on.
// Contract v2: exactly two buyers (at least one SC); "compare in year" is optional, so it is left blank.
function fillSituation() {
  [1, 2].forEach((n) => {
    cy.get(`[data-cy=situation-buyer-${n}-age-input]`).type(n === 1 ? '30' : '29');
    cy.get(`[data-cy=situation-buyer-${n}-citizenship-select]`).select('SC');
    cy.get(`[data-cy=situation-buyer-${n}-first-timer-switch]`).check();
    cy.get(`[data-cy=situation-buyer-${n}-income-input]`).type('5000');
    cy.get(`[data-cy=situation-buyer-${n}-cpf-input]`).type('40000');
  });
  cy.get('[data-cy=situation-cash-savings-input]').type('20000');
  cy.get('[data-cy=situation-price-growth-input]').type('3');
  cy.get('[data-cy=situation-income-growth-input]').type('2');
}

function fillPath(prefix, flatType, leaseBand) {
  cy.get(`[data-cy=${prefix}-year-input]`).type(String(nextYear));
  cy.get(`[data-cy=${prefix}-town-select]`).select('TAMPINES');
  cy.get(`[data-cy=${prefix}-flat-type-select]`).select(flatType);
  if (leaseBand) {
    cy.get(`[data-cy=${prefix}-lease-band-select]`).select(leaseBand);
  }
}

describe('smoke', () => {
  it('loads the home page and shows the disclaimer', () => {
    cy.visit('/');
    cy.get('[data-cy=home-title]').should('be.visible');
    cy.get('[data-cy=disclaimer-banner]').should('be.visible');
  });

  it('blocks the stepper until the current step is valid', () => {
    cy.visit('/plan');
    cy.get('[data-cy=plan-step-next]').click();
    cy.get('[data-cy=plan-step-errors]').should('be.visible');
    cy.get('[data-cy=plan-step-1-panel]').should('exist'); // still on Situation
  });

  it('walks through the stepper to the results page (mock data)', () => {
    cy.visit('/plan');
    fillSituation();
    cy.get('[data-cy=plan-step-next]').click(); // situation -> path A
    fillPath('patha', '4 ROOM');
    cy.get('[data-cy=plan-step-next]').click(); // path A -> path B
    fillPath('pathb', '4 ROOM', '80-89');
    cy.get('[data-cy=plan-step-next]').click(); // path B -> results
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
    cy.get('[data-cy^=heatmap-cell-]').should('have.length.greaterThan', 0);
  });

  // Needs the server connected to a database
  // pointing at a TEST database, never the real one). The mock build's login form is mocked, so the
  // account registers and logs in through the real API, and the token is stored where stores/auth.js
  // keeps it (the same approach as scenarios.cy.js).
  it('register, log in, build both paths, save, reload', () => {
    const account = { name: 'Smoke tester', email: `smoke-${Date.now()}@example.com`, password: 'smoke-password-1' };
    cy.request('POST', '/api/auth/register', account).its('status').should('eq', 201);
    cy.request('POST', '/api/auth/login', { email: account.email, password: account.password })
      .its('body')
      .then(({ token, user }) => {
        window.localStorage.setItem('hdb-app:auth', JSON.stringify({ token, user }));
      });

    // Build both paths and save the result.
    cy.visit('/plan');
    fillSituation();
    cy.get('[data-cy=plan-step-next]').click();
    fillPath('patha', '4 ROOM');
    cy.get('[data-cy=plan-step-next]').click();
    fillPath('pathb', '4 ROOM', '80-89');
    cy.get('[data-cy=plan-step-next]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-name-input]').clear().type('Smoke scenario');
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('contain', 'Smoke scenario');

    // Reload: still logged in, and the scenario is still saved.
    cy.reload();
    cy.get('[data-cy=nav-account-toggle]').should('contain', 'Smoke tester');
    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-list]').should('contain', 'Smoke scenario');
    cy.reload();
    cy.get('[data-cy=scenarios-list]').should('contain', 'Smoke scenario');

    // Opening it restores the same inputs.
    cy.get('[data-cy=scenarios-open-button]').click();
    cy.location('pathname').should('eq', '/results');
    cy.get('[data-cy=results-edit-button]').click();
    cy.get('[data-cy=plan-step-3-panel]').should('exist');
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'TAMPINES');
    cy.get('[data-cy=pathb-flat-type-select]').should('have.value', '4 ROOM');
    cy.get('[data-cy=pathb-lease-band-select]').should('have.value', '80-89');
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=plan-step-back]').click();
    cy.get('[data-cy=situation-buyer-1-age-input]').should('have.value', '30');
    cy.get('[data-cy=situation-buyer-2-age-input]').should('have.value', '29');

    // Clean up, so local runs do not pile up scenarios.
    cy.get('[data-cy=nav-scenarios-link]').click();
    cy.get('[data-cy=scenarios-delete-button]').click();
    cy.get('[data-cy=scenarios-delete-confirm]').click();
    cy.get('[data-cy=scenarios-empty]').should('be.visible');
  });

});