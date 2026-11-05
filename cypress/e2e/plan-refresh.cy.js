// The plan in progress survives a refresh (stores/planStorage.js): kept in sessionStorage for this tab only, and
// cleared on logout and when Start planning begins a fresh plan. The last two tests log in, so they need a database.
import { completePlan } from './helpers/plan.js';
import { registerFreshUser } from './helpers/scenarios.js';

const PLAN_KEY = 'hdb-app:plan';

describe('the plan survives a refresh', () => {
  it('shows the same results and dashboard after a refresh, from sessionStorage only', () => {
    completePlan();
    cy.get('[data-cy=results-breakeven-sentence]').invoke('text').then((sentence) => {
      cy.reload();
      cy.get('[data-cy=results-breakeven-sentence]').should('have.text', sentence);
    });
    cy.get('[data-cy=results-empty]').should('not.exist');
    cy.get('[data-cy=results-dashboard-button]').first().click();
    cy.get('[data-cy=dashboard-headline]').should('be.visible');
    cy.reload();
    cy.get('[data-cy=dashboard-headline]').should('be.visible');
    cy.get('[data-cy=dashboard-empty]').should('not.exist');
    // Incomes and CPF are in it, so it is in sessionStorage (gone when the tab closes), never localStorage.
    cy.window().then((win) => {
      const stored = JSON.parse(win.sessionStorage.getItem(PLAN_KEY));
      expect(stored.v).to.be.a('number');
      expect(stored.plan.profile.applicants[0].monthlyIncome).to.equal(5000);
      expect(win.localStorage.getItem(PLAN_KEY)).to.equal(null);
    });
  });

  it('goes back to the stepper screen it was on', () => {
    completePlan();
    cy.get('[data-cy=results-edit-button]').first().click();
    cy.location('pathname').should('eq', '/plan');
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'BEDOK');
    cy.reload();
    cy.get('[data-cy=pathb-town-select]').should('have.value', 'BEDOK');
  });

  it('starts with an empty plan when storage holds an older or broken copy', () => {
    cy.visit('/results', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(PLAN_KEY, JSON.stringify({ v: 0, plan: { step: 3 } }));
      },
    });
    cy.get('[data-cy=results-empty]').should('be.visible');
    cy.window().its('sessionStorage').invoke('getItem', PLAN_KEY).should('equal', null);
  });

  it('clears the plan on logout', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=nav-account-toggle]').click();
    cy.get('[data-cy=nav-logout-button]').click();
    cy.window().its('sessionStorage').invoke('getItem', PLAN_KEY).should('equal', null);
    cy.visit('/results');
    cy.get('[data-cy=results-empty]').should('be.visible');
  });

  it('clears the plan when Start planning begins a fresh one after a save', () => {
    registerFreshUser();
    completePlan();
    cy.get('[data-cy=results-save-button]').click();
    cy.get('[data-cy=results-save-submit]').click();
    cy.get('[data-cy=results-save-success]').should('be.visible');
    cy.reload();
    // Still saved and unchanged after the refresh: no second "Save" for the same plan.
    cy.get('[data-cy=results-save-success]').should('be.visible');
    cy.get('[data-cy=results-save-button]').should('not.exist');
    cy.visit('/plan?new=1');
    cy.location('search').should('equal', '');
    cy.window().its('sessionStorage').invoke('getItem', PLAN_KEY).should('equal', null);
  });
});
