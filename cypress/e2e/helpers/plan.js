// Shared Cypress steps for filling in the plan stepper with valid input (D38 onboarding).
// Steps: 1 What matters most (optional chips) · 2 About you · 3 Your BTO · 4 Resale flat · Results.
// Not a spec file (no .cy.js), so Cypress does not run it on its own.

export const nextYear = new Date().getFullYear() + 1;
// The stepper's Next and Back buttons.
export const next = () => cy.get('[data-cy=plan-step-next]').click();
export const back = () => cy.get('[data-cy=plan-step-back]').click();

// '4 ROOM' -> '4-room', 'PLUS' -> 'plus', 'NEAR' -> 'near': the chips' data-cy suffixes.
const slug = (v) => String(v).toLowerCase().replace(/\s+/g, '-');

// Step 1: pick chips by key (parents, moveby, space, monthly, value); none = skip.
export function pickWishes(keys = []) {
  keys.forEach((k) => cy.get(`[data-cy=wish-${k}]`).click());
}

// Step 2: two buyers (the contract models exactly two; at least one SC, which is the default) and cash.
// moveInBy only works when 'moveby' was picked in step 1.
export function fillSituation({ moveInBy } = {}) {
  [1, 2].forEach((n) => {
    cy.get(`[data-cy=situation-buyer-${n}-age-input]`).type(n === 1 ? '30' : '29');
    cy.get(`[data-cy=situation-buyer-${n}-income-input]`).type('5000');
    cy.get(`[data-cy=situation-buyer-${n}-cpf-input]`).type('40000');
  });
  cy.get('[data-cy=situation-cash-savings-input]').type('20000');
  if (moveInBy) cy.get('[data-cy=situation-move-in-by-input]').type(String(moveInBy));
}

// Steps 3 and 4. BTO: town, then the launch (default: the newest, which also sets the classification), then the
// flat types that launch offers. living only works when 'parents' was picked in step 1.
export function fillPath(prefix, { town = 'TAMPINES', flatType = '4 ROOM', leaseBand = '80-89', project, living } = {}) {
  cy.get(`[data-cy=${prefix}-town-select]`).select(town);
  if (project) cy.get(`[data-cy=${prefix}-project-${project}]`, { timeout: 10000 }).click();
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
  cy.location('pathname').should('eq', '/results');
}
