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

  // TODO (seat 5): register / login / save scenario / reload and confirm it restores identically
  it.skip('register, log in, build both paths, save, reload', () => {});
});