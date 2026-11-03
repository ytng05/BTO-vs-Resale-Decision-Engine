// Journey 5 (docs/JOURNEYS.md): an SC + PR couple with little cash. Two PRs are blocked; both paths are over
// the loan limit and short of cash at purchase, and the app says so. Live build only.
import { J5, beat, fillPaths, fillSituation, openDashboard, waitForResults } from './personas.js';
import { next } from '../e2e/helpers/plan.js';

describe('Journey 5: can they afford it?', () => {
  it('blocks two PRs, then shows both paths over the loan limit with warnings', () => {
    cy.visit('/plan');
    next(); // nothing picked in 'What matters most'
    fillSituation(J5);
    // At least one buyer must be a Singapore Citizen (D21).
    cy.get('[data-cy=situation-buyer-1-citizenship-select]').select('PR');
    next();
    cy.get('[data-cy=situation-applicants-error]').should('contain', 'Singapore Citizen');
    beat();
    cy.get('[data-cy=situation-buyer-1-citizenship-select]').select('SC');
    next();
    fillPaths(J5);
    waitForResults();
    beat();

    openDashboard();
    cy.get('[data-cy=dashboard-summary-bto-affordability]').should('contain', 'Loan short');
    cy.get('[data-cy=dashboard-summary-resale-affordability]').should('contain', 'Loan short');
    // The loan cap is said in each purchase card ("Loan short by…"), so the notes below don't repeat it.
    cy.get('[data-cy=dashboard-paid]').should('contain', 'Loan short by').and('not.contain', 'LOAN_ABOVE_LIMIT');
    beat();
  });
});
