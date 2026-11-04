// Shared Cypress steps for filling in the plan stepper with valid input (D38 onboarding).
// Steps: 1 What matters most (optional chips) · 2 About you (four screens) · 3 Your BTO · 4 Resale flat · Results.
// Not a spec file (no .cy.js), so Cypress does not run it on its own.

export const nextYear = new Date().getFullYear() + 1;
// The stepper's Next and Back buttons.
export const next = () => cy.get('[data-cy=plan-step-next]').click();
export const back = () => cy.get('[data-cy=plan-step-back]').click();
// After Next on the last step.
// Every plan now passes through /preview, which checks the answers (#110): click through it to Results.
export const seeResults = () => {
  cy.get('[data-cy=preview-see-results]', { timeout: 10000 }).click();
};

// '4 ROOM' -> '4-room', 'PLUS' -> 'plus', 'NEAR' -> 'near': the chips' data-cy suffixes.
const slug = (v) => String(v).toLowerCase().replace(/\s+/g, '-');

// Step 1: pick chips by key (parents, moveby, space, monthly, value); none = skip.
export function pickWishes(keys = []) {
  keys.forEach((k) => cy.get(`[data-cy=wish-${k}]`).click());
}

// Step 2, About you, asks one question per screen: ages, then citizenship and first-timer, then incomes, then CPF,
// cash and the move-in year. Each helper fills one screen; fillSituation fills all four and stops on the last, so
// the next next() goes to Your BTO. moveInBy only works when 'moveby' was picked in step 1.
export function fillAges([first, second] = ['30', '29']) {
  cy.get('[data-cy=situation-buyer-1-age-input]').clear().type(first);
  cy.get('[data-cy=situation-buyer-2-age-input]').clear().type(second);
}
export function fillIncomes([first, second] = ['5000', '5000']) {
  cy.get('[data-cy=situation-buyer-1-income-input]').clear().type(first);
  cy.get('[data-cy=situation-buyer-2-income-input]').clear().type(second);
}
export function fillSavings({ moveInBy } = {}) {
  [1, 2].forEach((n) => cy.get(`[data-cy=situation-buyer-${n}-cpf-input]`).clear().type('40000'));
  cy.get('[data-cy=situation-cash-savings-input]').clear().type('20000');
  if (moveInBy) cy.get('[data-cy=situation-move-in-by-input]').type(String(moveInBy));
}
// Two buyers (the contract models exactly two; both Singapore Citizens and first-timers by default) and cash.
export function fillSituation({ moveInBy } = {}) {
  fillAges();
  next();
  next(); // citizenship and first-timer: the defaults
  fillIncomes();
  next();
  fillSavings({ moveInBy });
}
// Back n times (from Resale flat to About you's ages screen is 5: Your BTO, savings, incomes, who is buying, ages).
export const backTimes = (n) => Cypress._.times(n, () => back());
// Results: the two path cards sit under "See each path's full breakdown" (folded at first).
export const openPathCards = () => cy.get('[data-cy=results-paths] > summary').click();

// Steps 3 and 4. BTO: town, then the launch (default: the newest, which also sets the classification), then the
// flat types that launch offers. living only works when 'parents' was picked in step 1.
export function fillPath(prefix, { town = 'TAMPINES', flatType = '4 ROOM', leaseBand = '80-89', project, living } = {}) {
  cy.get(`[data-cy=${prefix}-town-select]`).select(town);
  if (project) {
    cy.get(`[data-cy=${prefix}-project-more]`, { timeout: 10000 }).click(); // Use a different launch
    cy.get(`[data-cy=${prefix}-project-${project}]`).click();
  }
  cy.get(`[data-cy=${prefix}-flat-type-${slug(flatType)}]`, { timeout: 10000 }).click();
  if (prefix === 'pathb') cy.get(`[data-cy=pathb-lease-band-${leaseBand}]`).click();
  if (living) cy.get(`[data-cy=pathb-living-${slug(living)}]`).click();
}

// The whole plan, from a fresh /plan to /results. Growth (3% / 2%) and the years (next year) are the
// store's defaults (D38).
export function completePlan({ wishes = [], ...situation } = {}) {
  cy.visit('/plan');
  pickWishes(wishes);
  next();
  fillSituation(situation);
  next();
  fillPath('patha');
  next();
  fillPath('pathb', { town: 'BEDOK' });
  next();
  seeResults();
  cy.location('pathname').should('eq', '/results');
}
