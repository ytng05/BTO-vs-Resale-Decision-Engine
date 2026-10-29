// The five demo personas (docs/JOURNEYS.md) and the steps that type them into the plan.
// Not a spec file (no .cy.js). Money in dollars and growth in percent, as the form takes them.
// Run against a LIVE build (VITE_USE_MOCK=false): the journeys show the real engine's results.
import { next } from '../e2e/helpers/plan.js';

const sc = (age, monthlyIncome, cpfOa) => ({ age, citizenship: 'SC', monthlyIncome, cpfOa });
const pr = (age, monthlyIncome, cpfOa) => ({ age, citizenship: 'PR', monthlyIncome, cpfOa });
const resale = (town, leaseBand, livingArrangement = 'NONE') => ({ year: 2027, town, flatType: '4 ROOM', leaseBand, livingArrangement });
const bto = (town, classification, project) => ({ year: 2027, town, flatType: '4 ROOM', classification, project });

// 1. First-time couple: "BTO or resale?" BTO ends well ahead; both within the loan limit.
export const J1 = {
  buyers: [sc(29, 4200, 90000), sc(30, 3800, 80000)], cash: 60000, priceGrowth: 3, incomeGrowth: 2,
  pathA: bto('SENGKANG', 'STANDARD', 'fernvale-plains'), pathB: resale('SENGKANG', '80-89'),
};

// 2. Near parents, renting while a long BTO wait runs: resale ends ahead (grants incl. PHG, no rent).
// What-if: rent 0 while waiting flips it back to BTO.
export const J2 = {
  buyers: [sc(31, 3300, 75000), sc(32, 3000, 65000)], cash: 80000, priceGrowth: 3, incomeGrowth: 2, rent: 2800,
  pathA: bto('JURONG EAST', 'STANDARD', 'teban-heights'), pathB: resale('JURONG EAST', '80-89', 'NEAR'),
};

// 3. Must move in by 2032: the timing panel ranks application years and skips any whose keys come too late.
export const J3 = {
  buyers: [sc(28, 3600, 70000), sc(29, 3400, 60000)], cash: 60000, priceGrowth: 3, incomeGrowth: 3, moveInBy: 2032,
  pathA: bto('SENGKANG', 'STANDARD', 'fernvale-plains'), pathB: resale('SENGKANG', '80-89'),
};

// 4. Returning user: J1's couple saves two scenarios at one horizon (so they can be ranked) and compares them.
export const J4A = { ...J1, horizon: 2040 };
export const J4B = { ...J1, horizon: 2040, pathA: bto('TAMPINES', 'STANDARD', 'tampines-bliss'), pathB: resale('TAMPINES', '80-89') };

// 5. SC + PR with little cash: both paths are over the loan limit and short of cash at purchase.
export const J5 = {
  buyers: [sc(26, 2600, 12000), pr(27, 2300, 9000)], cash: 8000, priceGrowth: 3, incomeGrowth: 2,
  pathA: bto('YISHUN', 'STANDARD', 'chencharu-grove'), pathB: resale('YISHUN', '80-89'),
};

// A short pause so a recorded journey can be followed by eye. 0 skips it: CYPRESS_JOURNEY_PAUSE=0.
export const beat = () => cy.wait(Cypress.env('JOURNEY_PAUSE') ?? 700);

const typeInto = (hook, value) => cy.get(`[data-cy=${hook}]`).clear().type(String(value));

export function fillSituation(p) {
  p.buyers.forEach((b, i) => {
    const n = i + 1;
    typeInto(`situation-buyer-${n}-age-input`, b.age);
    cy.get(`[data-cy=situation-buyer-${n}-citizenship-select]`).select(b.citizenship);
    typeInto(`situation-buyer-${n}-income-input`, b.monthlyIncome);
    typeInto(`situation-buyer-${n}-cpf-input`, b.cpfOa);
  });
  typeInto('situation-cash-savings-input', p.cash);
  typeInto('situation-price-growth-input', p.priceGrowth);
  typeInto('situation-income-growth-input', p.incomeGrowth);
  if (p.horizon) typeInto('situation-horizon-year-input', p.horizon);
  if (p.moveInBy) typeInto('situation-move-in-by-input', p.moveInBy);
  if (p.rent) typeInto('situation-rent-input', p.rent);
}

export function fillPaths(p) {
  const a = p.pathA;
  typeInto('patha-year-input', a.year);
  cy.get('[data-cy=patha-town-select]').select(a.town);
  cy.get('[data-cy=patha-flat-type-select]').select(a.flatType);
  cy.get('[data-cy=patha-classification-select]').select(a.classification);
  // The project list loads from the server once town and flat type are chosen.
  cy.get('[data-cy=patha-project-select]').find(`option[value="${a.project}"]`, { timeout: 15000 }).should('exist');
  cy.get('[data-cy=patha-project-select]').select(a.project);
  beat();
  next();

  const b = p.pathB;
  typeInto('pathb-year-input', b.year);
  cy.get('[data-cy=pathb-town-select]').select(b.town);
  cy.get('[data-cy=pathb-flat-type-select]').select(b.flatType);
  cy.get('[data-cy=pathb-lease-band-select]').select(b.leaseBand);
  cy.get('[data-cy=pathb-living-select]').select(b.livingArrangement);
  beat();
  next();
}

// The whole plan, from a fresh /plan to the Results page.
export function fillPlan(p) {
  cy.visit('/plan');
  fillSituation(p);
  beat();
  next();
  fillPaths(p);
  waitForResults();
}

export function waitForResults() {
  cy.location('pathname').should('eq', '/results');
  cy.get('[data-cy=results-loading]', { timeout: 60000 }).should('not.exist');
  cy.get('[data-cy=results-breakeven-sentence]').should('be.visible');
  cy.get('[data-cy=results-mock-notice]').should('not.exist'); // journeys need the live engine
}

export function openDashboard() {
  cy.get('[data-cy=results-dashboard-button]').click();
  cy.location('pathname').should('eq', '/dashboard');
  cy.get('[data-cy=dashboard-loading]', { timeout: 60000 }).should('not.exist');
  cy.get('[data-cy=dashboard-headline]').should('be.visible');
}

// Move a what-if slider (WhatIfPanel ids, e.g. 'whatif-rent') and wait for the comparison to re-run.
export function setSlider(id, value) {
  cy.get(`[data-cy=${id}-slider]`).invoke('val', value).trigger('input');
  cy.wait(400); // the dashboard re-runs 250 ms after the last slider move
  cy.get('[data-cy=dashboard-updating]', { timeout: 30000 }).should('not.exist');
  beat();
}
