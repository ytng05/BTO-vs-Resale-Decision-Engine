// The five demo personas (docs/JOURNEYS.md) and the steps that type them into the plan.
// Not a spec file (no .cy.js). Money in dollars, as the form takes it.
// Run against a LIVE build (VITE_USE_MOCK=false): the journeys show the real engine's results.
// Onboarding (D38) leaves growth (3% prices, 2% income), the years (next year), rent while waiting (0) and the
// BTO project (the town's newest launch) at their defaults; journeys change those on the Dashboard.
import { next, pickWishes, seeResults } from '../e2e/helpers/plan.js';

const sc = (age, monthlyIncome, cpfOa) => ({ age, citizenship: 'SC', monthlyIncome, cpfOa });
const pr = (age, monthlyIncome, cpfOa) => ({ age, citizenship: 'PR', monthlyIncome, cpfOa });
const resale = (town, leaseBand, livingArrangement, flatType = '4 ROOM') => ({ town, flatType, leaseBand, livingArrangement });
// The launch defaults to the town's newest (a tie goes to Standard, then by name); project picks another.
const bto = (town, project, flatType = '4 ROOM') => ({ town, flatType, project });

// 1. First-time couple: "BTO or resale?" BTO ends well ahead; both within the loan limit.
export const J1 = {
  buyers: [sc(29, 4200, 90000), sc(30, 3800, 80000)], cash: 60000,
  pathA: bto('SENGKANG'), pathB: resale('SENGKANG', '80-89'),
};

// 2. Near parents: with no rent while waiting BTO ends ahead; renting at S$2,800 while a long BTO wait runs
// (a Dashboard what-if) turns it to resale (grants incl. PHG, no rent).
export const J2 = {
  wishes: ['parents'],
  buyers: [sc(31, 3300, 75000), sc(32, 3000, 65000)], cash: 80000,
  pathA: bto('JURONG EAST'), pathB: resale('JURONG EAST', '80-89', 'NEAR'),
};

// 3. Must move in by 2032: the timing panel ranks application years and skips any whose keys come too late.
export const J3 = {
  wishes: ['moveby'],
  buyers: [sc(28, 3600, 70000), sc(29, 3400, 60000)], cash: 60000, moveInBy: 2032,
  pathA: bto('SENGKANG'), pathB: resale('SENGKANG', '80-89'),
};

// 4. Returning user: J1's couple saves 4-room and 5-room in Sengkang and compares them. Both use the same launch
// (Fernvale Plains), so the keys year and the horizon match and the two can be ranked.
export const J4A = J1;
export const J4B = {
  ...J1, wishes: ['space'],
  pathA: bto('SENGKANG', undefined, '5 ROOM'), pathB: resale('SENGKANG', '80-89', undefined, '5 ROOM'),
};

// 5. SC + PR with little cash: both paths are over the loan limit and short of cash at purchase.
export const J5 = {
  buyers: [sc(26, 2600, 12000), pr(27, 2300, 9000)], cash: 8000,
  pathA: bto('YISHUN'), pathB: resale('YISHUN', '80-89'),
};

// A short pause so a recorded journey can be followed by eye. 0 skips it: CYPRESS_JOURNEY_PAUSE=0.
export const beat = () => cy.wait(Cypress.env('JOURNEY_PAUSE') ?? 700);

const typeInto = (hook, value) => cy.get(`[data-cy=${hook}]`).clear().type(String(value));

// '4 ROOM' -> '4-room', 'NEAR' -> 'near': the chips' data-cy suffixes.
const slug = (v) => String(v).toLowerCase().replace(/\s+/g, '-');

export function fillSituation(p) {
  p.buyers.forEach((b, i) => {
    const n = i + 1;
    typeInto(`situation-buyer-${n}-age-input`, b.age);
    cy.get(`[data-cy=situation-buyer-${n}-citizenship-select]`).select(b.citizenship);
    typeInto(`situation-buyer-${n}-income-input`, b.monthlyIncome);
    typeInto(`situation-buyer-${n}-cpf-input`, b.cpfOa);
  });
  typeInto('situation-cash-savings-input', p.cash);
  if (p.moveInBy) typeInto('situation-move-in-by-input', p.moveInBy);
}

export function fillPaths(p) {
  const a = p.pathA;
  cy.get('[data-cy=patha-town-select]').select(a.town);
  if (a.project) cy.get(`[data-cy=patha-project-${a.project}]`, { timeout: 15000 }).click();
  // The chips load from the server once the town is chosen: only what that town's launches offer.
  cy.get(`[data-cy=patha-flat-type-${slug(a.flatType)}]`, { timeout: 15000 }).click();
  beat();
  next();

  const b = p.pathB;
  cy.get('[data-cy=pathb-town-select]').select(b.town);
  cy.get(`[data-cy=pathb-flat-type-${slug(b.flatType)}]`).click();
  cy.get(`[data-cy=pathb-lease-band-${b.leaseBand}]`).click();
  if (b.livingArrangement) cy.get(`[data-cy=pathb-living-${slug(b.livingArrangement)}]`).click();
  beat();
  next();
  beat();
  seeResults();
}

// The whole plan, from a fresh /plan to the Results page.
export function fillPlan(p) {
  cy.visit('/plan');
  pickWishes(p.wishes);
  beat();
  next();
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
  // Housing-cost sliders sit under "More assumptions": open it if it is closed.
  cy.get('[data-cy=dashboard-whatif-more]').then(($d) => { if (!$d.prop('open')) cy.wrap($d).find('summary').click(); });
  cy.get(`[data-cy=${id}-slider]`).invoke('val', value).trigger('input');
  cy.wait(400); // the dashboard re-runs 250 ms after the last slider move
  cy.get('[data-cy=dashboard-updating]', { timeout: 30000 }).should('not.exist');
  beat();
}
